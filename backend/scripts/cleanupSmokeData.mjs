import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure DNS if specified in env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DNS_SERVERS=')) {
        const servers = trimmed.slice(trimmed.indexOf('=') + 1).split(',').map(s => s.trim()).filter(Boolean);
        if (servers.length) dns.setServers(servers);
      }
      if (trimmed.startsWith('MONGODB_URI=')) {
        if (!process.env.MONGODB_URI) {
          process.env.MONGODB_URI = trimmed.slice(trimmed.indexOf('=') + 1).trim();
        }
      }
    }
  }
}
loadEnv();

const SEED_BOOKING_IDS = new Set([
  'BR-01', 'BR-02', 'BR-03', 'BR-04', 'BR-05a', 'BR-05b', 'BR-05c', 'BR-05d', 'BR-05e',
  'BR-06', 'BR-07', 'BR-08', 'BR-09', 'BR-10', 'BR-11a', 'BR-11b', 'BR-12', 'BR-13',
  'BR-14', 'BR-15', 'BR-16', 'BR-17', 'BR-18', 'BR-19', 'BR-20',
]);

const TARGET_BOOKINGS_MAIN = [
  'BR-26-5508',
  'BR-27-9373',
  'BR-26-8834',
  'BR-27-5834',
  'BR-26-2128',
  'BR-27-4202',
  'BR-28-3258',
  'BR-29-8202',
  'BR-30-5748',
  'BR-31-6232',
  'BR-32-4755',
  'BR-33-3755',
  'BR-34-7147',
  'BR-35-2641',
];

const TARGET_STRAY_BOOKINGS = [
  'BR-1-8102',
  'BR-2-8777',
  'BR-3-0702',
];

const TARGET_DISRUPTIONS = [
  'DISRUPT-1063',
  'DISRUPT-2581',
  'DISRUPT-7197',
  'DISRUPT-9513',
  'DISRUPT-0497',
  'DISRUPT-0392',
  'DISRUPT-8667',
  'DISRUPT-6065',
  'DISRUPT-2544',
  'DISRUPT-6834',
  'DISRUPT-9057',
  'DISRUPT-9313',
  'DISRUPT-9103',
  'DISRUPT-1740',
  'DISRUPT-4084',
  'DISRUPT-5550',
];

async function main() {
  const isConfirm = process.argv.includes('--confirm');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI not found in environment or backend/.env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    const collNames = collections.map((c) => c.name);

    console.log('='.repeat(70));
    console.log(`SMOKE DATA CLEANUP UTILITY [Mode: ${isConfirm ? 'LIVE EXECUTION' : 'DRY RUN'}]`);
    console.log('='.repeat(70));

    // 1. Audit Target Bookings in booking_requests
    console.log('\n1. Checking collection "booking_requests":');
    const existingMainBookings = await db.collection('booking_requests')
      .find({
        $or: [
          { title: { $regex: '\\[smoke_test\\]', $options: 'i' } },
          { _id: { $in: TARGET_BOOKINGS_MAIN } },
        ],
      })
      .toArray();

    // Guard: never target seed bookings
    const targetMainBookings = existingMainBookings.filter(b => !SEED_BOOKING_IDS.has(b._id));

    if (targetMainBookings.length === 0) {
      console.log('  No matching target booking documents found in booking_requests.');
    } else {
      for (const b of targetMainBookings) {
        console.log(`  - [booking_requests] ID: ${b._id} | Title: "${b.title}" | Status: ${b.status}`);
      }
    }
    console.log(`  Total found: ${targetMainBookings.length}`);

    // 2. Audit Target Bookings in stray bookingrequests collection
    console.log('\n2. Checking stray collection "bookingrequests":');
    let existingStrayBookings = [];
    if (collNames.includes('bookingrequests')) {
      existingStrayBookings = await db.collection('bookingrequests')
        .find({ _id: { $in: TARGET_STRAY_BOOKINGS } })
        .toArray();
      if (existingStrayBookings.length === 0) {
        console.log('  No matching target documents found in bookingrequests.');
      } else {
        for (const b of existingStrayBookings) {
          console.log(`  - [bookingrequests] ID: ${b._id} | Title: "${b.title}" | Status: ${b.status}`);
        }
      }
      console.log(`  Total found: ${existingStrayBookings.length} of ${TARGET_STRAY_BOOKINGS.length}`);
    } else {
      console.log('  Collection "bookingrequests" does not exist.');
    }

    // 3. Audit Target Cancellations (BR-1-8102 test cancellation)
    console.log('\n3. Checking collection "cancellations":');
    const existingCancellations = await db.collection('cancellations')
      .find({ _id: 'BR-1-8102' })
      .toArray();
    if (existingCancellations.length === 0) {
      console.log('  No test cancellations found.');
    } else {
      for (const c of existingCancellations) {
        console.log(`  - [cancellations] ID: ${c._id} | By: "${c.by}" | Note: "${c.note}"`);
      }
    }
    console.log(`  Total found: ${existingCancellations.length} of 1 test cancellation.`);

    // 4. Audit Target Disruptions
    console.log('\n4. Checking collection "disruptions":');
    const existingDisruptions = await db.collection('disruptions')
      .find({
        $or: [
          { title: { $regex: '\\[smoke_test\\]', $options: 'i' } },
          { _id: { $in: TARGET_DISRUPTIONS } },
        ],
      })
      .toArray();

    if (existingDisruptions.length === 0) {
      console.log('  No matching target disruption documents found.');
    } else {
      for (const d of existingDisruptions) {
        console.log(`  - [disruptions] ID: ${d._id} | Title: "${d.title}" | Status: ${d.status} | BaseVersion: ${d.base_version ?? 'N/A'}`);
      }
    }
    console.log(`  Total found: ${existingDisruptions.length}`);

    // Summary of all targeted IDs
    const targetBookingIds = targetMainBookings.map(b => b._id);
    const targetDisruptIds = existingDisruptions.map(d => d._id);

    console.log('\n' + '-'.repeat(70));
    console.log('SUMMARY OF DOCUMENTS TARGETED FOR DELETION:');
    console.log('  • booking_requests: ' + (targetBookingIds.join(', ') || 'None'));
    console.log('  • bookingrequests:  ' + (existingStrayBookings.map(b => b._id).join(', ') || 'None'));
    console.log('  • cancellations:    ' + (existingCancellations.map(c => c._id).join(', ') || 'None'));
    console.log('  • disruptions:      ' + (targetDisruptIds.join(', ') || 'None'));
    console.log('  • audit_logs:       UNTOUCHED (0 documents targeted)');

    if (!isConfirm) {
      console.log('\n[DRY-RUN DEFAULT]: No documents were deleted.');
      console.log('To execute this deletion, re-run with: node backend/scripts/cleanupSmokeData.mjs --confirm');
    } else {
      console.log('\n[LIVE EXECUTION]: Deleting target documents...');
      const delMain = await db.collection('booking_requests').deleteMany({ _id: { $in: targetBookingIds } });
      let delStrayCount = 0;
      if (collNames.includes('bookingrequests')) {
        const delStray = await db.collection('bookingrequests').deleteMany({ _id: { $in: TARGET_STRAY_BOOKINGS } });
        delStrayCount = delStray.deletedCount;
        const remainingCount = await db.collection('bookingrequests').countDocuments({});
        if (remainingCount === 0) {
          await db.collection('bookingrequests').drop();
          console.log(`✓ Dropped stray collection "bookingrequests" because it is now empty.`);
        } else {
          console.log(`ℹ Collection "bookingrequests" still has ${remainingCount} document(s); not dropped.`);
        }
      }
      const delCancel = await db.collection('cancellations').deleteMany({ _id: 'BR-1-8102' });
      const delDisrupt = await db.collection('disruptions').deleteMany({ _id: { $in: targetDisruptIds } });

      console.log(`✓ Deleted ${delMain.deletedCount} from booking_requests.`);
      console.log(`✓ Deleted ${delStrayCount} from bookingrequests.`);
      console.log(`✓ Deleted ${delCancel.deletedCount} from cancellations.`);
      console.log(`✓ Deleted ${delDisrupt.deletedCount} from disruptions.`);
    }
    console.log('='.repeat(70));
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Cleanup script error:', err);
  process.exit(1);
});
