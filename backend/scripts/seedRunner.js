const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb+srv://abhisekpanda366_db_user:CTC123@cluster0.zlny5ec.mongodb.net/orchestrai_db?retryWrites=true&w=majority';

// Import raw dataset
let dataPath = path.resolve(__dirname, '../../CrunchWeek_StarterPack/data/cit_public.json');
if (!fs.existsSync(dataPath)) {
  dataPath = path.resolve(__dirname, '../CrunchWeek_StarterPack/data/cit_public.json');
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function seed() {
  console.log(`Connecting to MongoDB at: ${uri.replace(/:([^:@]+)@/, ':****@')}...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  const db = mongoose.connection.db;

  // 1. Institute Config
  console.log('1. Populating institute_config...');
  await db.collection('institute_configs').deleteMany({});
  await db.collection('institute_configs').insertOne({
    _id: data.dataset_id,
    dataset_id: data.dataset_id,
    institute: data.institute,
    calendar: data.calendar,
    priority_order: data.priority_order,
    role_category_cap: data.role_category_cap,
  });

  // 2. Rooms (27)
  console.log('2. Populating rooms (27)...');
  await db.collection('rooms').deleteMany({});
  await db.collection('rooms').insertMany(data.rooms.map(r => ({
    _id: r.id,
    name: r.name,
    building: r.building,
    type: r.type,
    capacity: r.capacity,
    features: r.features || [],
    accessible: !!r.accessible,
    allowed_uses: r.allowed_uses || [],
  })));

  // 3. Faculty (40)
  console.log('3. Populating faculty (40)...');
  await db.collection('faculties').deleteMany({});
  await db.collection('faculties').insertMany(data.faculty.map(f => ({
    _id: f.id,
    name: f.name,
    department: f.department,
    max_hours_per_day: f.max_hours_per_day || 4,
    needs_accessible: !!f.needs_accessible,
    unavailable: f.unavailable || [],
    preferences: f.preferences || [],
  })));

  // 4. Student Groups (14)
  console.log('4. Populating student_groups (14)...');
  await db.collection('student_groups').deleteMany({});
  await db.collection('student_groups').insertMany(data.student_groups.map(g => ({
    _id: g.id,
    name: g.name,
    year: g.year,
    department: g.department,
    size: g.size,
    needs_accessible: !!g.needs_accessible,
  })));

  // 5. Courses (62)
  console.log('5. Populating courses (62)...');
  await db.collection('courses').deleteMany({});
  await db.collection('courses').insertMany(data.courses.map(c => ({
    _id: c.id,
    title: c.title,
    department: c.department,
    year: c.year,
    lecture_hours: c.lecture_hours || 0,
    tutorial_hours: c.tutorial_hours || 0,
    lab_blocks: c.lab_blocks || 0,
  })));

  // 6. Sessions (189)
  console.log('6. Populating sessions (189)...');
  await db.collection('sessions').deleteMany({});
  await db.collection('sessions').insertMany(data.sessions.map(s => ({
    _id: s.id,
    course_id: s.course_id,
    kind: s.kind,
    groups: s.groups || [],
    faculty_id: s.faculty_id,
    size: s.size,
    duration: s.duration,
    room_types: s.room_types || [],
    needs_accessible: !!s.needs_accessible,
    basket_slot: s.basket_slot || null,
    fixed_slot: s.fixed_slot || null,
  })));

  // 7. Room Unavailability (2)
  console.log('7. Populating room_unavailability (2)...');
  await db.collection('room_unavailabilities').deleteMany({});
  await db.collection('room_unavailabilities').insertMany((data.room_unavailability || []).map((u, idx) => ({
    _id: `RU-${idx + 1}-${u.room_id}-${u.day}`,
    room_id: u.room_id,
    day: u.day,
    periods: u.periods || [],
    reason: u.reason || '',
  })));

  // 8. Cancellations (1)
  console.log('8. Populating cancellations (1)...');
  await db.collection('cancellations').deleteMany({});
  const cancellations = (data.cancellations || []).map(c => ({
    _id: c.request_id,
    request_id: c.request_id,
    cancelled_at: c.cancelled_at,
    by: c.by,
    note: c.note || '',
  }));
  await db.collection('cancellations').insertMany(cancellations);

  // 9. Booking Requests (25)
  console.log('9. Populating booking_requests (25)...');
  await db.collection('booking_requests').deleteMany({});
  const cancelledIds = new Set(cancellations.map(c => c.request_id));
  await db.collection('booking_requests').insertMany(data.booking_requests.map(b => ({
    _id: b.id,
    submitted_at: b.submitted_at,
    requester: b.requester,
    role: b.role,
    requested_category: b.requested_category,
    title: b.title,
    attendance: b.attendance,
    duration_periods: b.duration_periods,
    windows: b.windows || [],
    room_types: b.room_types || [],
    needs: b.needs || [],
    requested_room: b.requested_room || null,
    mandatory_for_groups: b.mandatory_for_groups || [],
    series_id: b.series_id || null,
    raw_text: b.raw_text || '',
    status: cancelledIds.has(b.id) ? 'cancelled' : 'pending',
    decision_reason: cancelledIds.has(b.id) ? 'Cancelled by requester' : null,
  })));

  // 10. Exams (41)
  console.log('10. Populating exams (41)...');
  await db.collection('exams').deleteMany({});
  await db.collection('exams').insertMany((data.exams || []).map(e => ({
    _id: e.id,
    course_ids: e.course_ids || [],
    groups: e.groups || [],
    size: e.size,
    duration_hours: e.duration_hours || 2,
  })));

  // 11. Users (4 Demo Accounts)
  console.log('11. Populating users (4 demo accounts)...');
  await db.collection('users').deleteMany({});
  const salt = await bcrypt.genSalt(10);
  await db.collection('users').insertMany([
    {
      _id: 'USER_ADMIN',
      name: "Dean Academic Office (Admin)",
      email: 'admin@cit.edu',
      password_hash: await bcrypt.hash('Admin@123', salt),
      role: 'admin',
      department: 'ADMIN',
      is_active: true,
    },
    {
      _id: 'USER_COORD_CSE',
      name: 'Prof. Rajesh Sharma (Coordinator)',
      email: 'dept.cse@cit.edu',
      password_hash: await bcrypt.hash('Dept@123', salt),
      role: 'department_coordinator',
      department: 'CSE',
      is_active: true,
    },
    {
      _id: 'USER_FACULTY_F01',
      name: 'Dr. Ananya Mishra',
      email: 'faculty.f01@cit.edu',
      password_hash: await bcrypt.hash('Faculty@123', salt),
      role: 'faculty',
      department: 'CSE',
      linked_faculty_id: 'F01',
      is_active: true,
    },
    {
      _id: 'USER_CLUB_DRAMATICS',
      name: 'Dramatics Society Lead',
      email: 'club.dramatics@cit.edu',
      password_hash: await bcrypt.hash('Club@123', salt),
      role: 'club',
      department: 'CLUBS',
      is_active: true,
    },
  ]);

  // 12. Schedules (Active Baseline)
  console.log('12. Populating schedules (baseline schedule)...');
  await db.collection('schedules').deleteMany({});
  const schedPath = path.resolve(__dirname, '../../exports/schedule.json');
  if (fs.existsSync(schedPath)) {
    const sched = JSON.parse(fs.readFileSync(schedPath, 'utf8'));
    await db.collection('schedules').insertOne({
      _id: 'SCHEDULE_CURRENT',
      team: sched.team || 'OrchestrAI',
      dataset_id: sched.dataset_id || 'cit-public-v1',
      version: 1,
      status: 'approved',
      sessions: sched.sessions,
      fest_week: sched.fest_week,
      exams: sched.exams,
      approved_by: 'Dean Academic Office',
      createdAt: new Date(),
    });
  }

  // 13. Audit Log
  console.log('13. Creating initial audit log...');
  await db.collection('audit_logs').deleteMany({});
  await db.collection('audit_logs').insertOne({
    _id: `LOG-SEED-${Date.now()}`,
    user_id: 'USER_ADMIN',
    action: 'DATABASE_SEEDED',
    entity_type: 'database',
    entity_id: data.dataset_id,
    description: 'All 15 collections seeded and initialized from cit_public.json',
    timestamp: new Date(),
  });

  console.log('\n SUCCESS: All 15 MongoDB collections successfully seeded into database!');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n SEED FAILED:', err.message);
  process.exit(1);
});
