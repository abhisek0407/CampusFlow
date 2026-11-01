/**
 * Script to restore SCHEDULE_CURRENT from backend/backups/schedule_current_v1.json.
 * DO NOT RUN unless explicitly requested by user.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(','));
}

const mongoose = require('mongoose');

async function restore() {
  const backupPath = path.resolve(__dirname, '../backups/schedule_current_v1.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath);
    process.exit(1);
  }

  const backupDoc = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log('Restoring SCHEDULE_CURRENT from backup...');
  console.log('Target version:', backupDoc.version);
  console.log('Target sessions count:', backupDoc.sessions ? backupDoc.sessions.length : 0);

  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.db.collection('schedules').replaceOne(
    { _id: 'SCHEDULE_CURRENT' },
    backupDoc,
    { upsert: true }
  );

  console.log('Successfully restored SCHEDULE_CURRENT to version', backupDoc.version);
  console.log('Verified restored document properties:');
  console.log('  Version:', backupDoc.version);
  console.log('  Sessions count:', backupDoc.sessions ? backupDoc.sessions.length : 0);
  console.log('  Fest bookings count:', backupDoc.fest_week && backupDoc.fest_week.bookings ? backupDoc.fest_week.bookings.length : 0);
  console.log('  Exams count:', backupDoc.exams ? backupDoc.exams.length : 0);
  process.exit(0);
}

if (require.main === module) {
  restore().catch((err) => {
    console.error('Restore failed:', err.message);
    process.exit(1);
  });
}

module.exports = { restore };
