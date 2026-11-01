const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/orchestrai_db';

async function sync() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  const schedPath = path.resolve(__dirname, '../../exports/schedule.json');
  if (!fs.existsSync(schedPath)) {
    console.error('exports/schedule.json not found at:', schedPath);
    process.exit(1);
  }

  const schedJson = JSON.parse(fs.readFileSync(schedPath, 'utf8'));
  const db = mongoose.connection.db;

  console.log('Syncing SCHEDULE_CURRENT...');
  await db.collection('schedules').updateOne(
    { _id: 'SCHEDULE_CURRENT' },
    {
      $set: {
        _id: 'SCHEDULE_CURRENT',
        team: schedJson.team || 'OrchestrAI',
        dataset_id: schedJson.dataset_id || 'cit-public-v1',
        version: 1,
        status: 'approved',
        sessions: schedJson.sessions,
        fest_week: schedJson.fest_week,
        exams: schedJson.exams,
        approved_by: 'Dean Academic Office',
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log('SCHEDULE_CURRENT successfully synced in MongoDB!');

  const bookingsList = schedJson.fest_week?.bookings || [];
  console.log(`Syncing ${bookingsList.length} booking request decisions...`);
  const bookingsCol = db.collection('bookingrequests');
  for (const b of bookingsList) {
    await bookingsCol.updateOne(
      { _id: b.request_id },
      {
        $set: {
          status: b.status,
          decision_reason: b.reason,
          allocated_room_id: b.room_id || null,
          allocated_day: b.day || null,
          allocated_start_period: b.start_period || null,
          allocated_end_period: b.end_period || null
        }
      }
    );
  }
  console.log('All booking requests successfully synced!');
  process.exit(0);
}

sync().catch(e => {
  console.error('Sync failed:', e.message);
  process.exit(1);
});
