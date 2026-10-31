import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import connectToDatabase from './mongodb.js';
import {
  Room,
  Faculty,
  StudentGroup,
  Course,
  Session,
  RoomUnavailability,
  BookingRequest,
  Cancellation,
  Exam,
  User,
  InstituteConfig,
  Schedule,
  Disruption,
  ScheduleVersion,
  AuditLog,
} from '../models/index.js';

export async function seedDatabase(options = { resetAll: true }) {
  await connectToDatabase();

  const dataPath = path.resolve(process.cwd(), '../CrunchWeek_StarterPack/data/cit_public.json');
  const altPath = path.resolve(process.cwd(), 'CrunchWeek_StarterPack/data/cit_public.json');
  const filePath = fs.existsSync(dataPath) ? dataPath : fs.existsSync(altPath) ? altPath : null;

  if (!filePath) {
    throw new Error('cit_public.json dataset file could not be found.');
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  console.log(`Loading dataset: ${data.dataset_id} (${data.institute})...`);

  // 1. Institute Config
  await InstituteConfig.deleteMany({});
  await InstituteConfig.create({
    _id: data.dataset_id,
    dataset_id: data.dataset_id,
    institute: data.institute,
    calendar: data.calendar,
    priority_order: data.priority_order,
    role_category_cap: data.role_category_cap,
  });

  // 2. Rooms (27)
  await Room.deleteMany({});
  const roomsToInsert = data.rooms.map((r) => ({
    _id: r.id,
    name: r.name,
    building: r.building,
    type: r.type,
    capacity: r.capacity,
    features: r.features || [],
    accessible: !!r.accessible,
    allowed_uses: r.allowed_uses || [],
  }));
  await Room.insertMany(roomsToInsert);

  // 3. Faculty (40)
  await Faculty.deleteMany({});
  const facultyToInsert = data.faculty.map((f) => ({
    _id: f.id,
    name: f.name,
    department: f.department,
    max_hours_per_day: f.max_hours_per_day || 4,
    needs_accessible: !!f.needs_accessible,
    unavailable: f.unavailable || [],
    preferences: f.preferences || [],
  }));
  await Faculty.insertMany(facultyToInsert);

  // 4. Student Groups (14)
  await StudentGroup.deleteMany({});
  const groupsToInsert = data.student_groups.map((g) => ({
    _id: g.id,
    name: g.name,
    year: g.year,
    department: g.department,
    size: g.size,
    needs_accessible: !!g.needs_accessible,
  }));
  await StudentGroup.insertMany(groupsToInsert);

  // 5. Courses (62)
  await Course.deleteMany({});
  const coursesToInsert = data.courses.map((c) => ({
    _id: c.id,
    title: c.title,
    department: c.department,
    year: c.year,
    lecture_hours: c.lecture_hours || 0,
    tutorial_hours: c.tutorial_hours || 0,
    lab_blocks: c.lab_blocks || 0,
  }));
  await Course.insertMany(coursesToInsert);

  // 6. Sessions (189)
  await Session.deleteMany({});
  const sessionsToInsert = data.sessions.map((s) => ({
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
  }));
  await Session.insertMany(sessionsToInsert);

  // 7. Room Unavailability (2)
  await RoomUnavailability.deleteMany({});
  const roomUnavailToInsert = (data.room_unavailability || []).map((u, idx) => ({
    _id: `RU-${idx + 1}-${u.room_id}-${u.day}`,
    room_id: u.room_id,
    day: u.day,
    periods: u.periods || [],
    reason: u.reason || '',
  }));
  await RoomUnavailability.insertMany(roomUnavailToInsert);

  // 8. Cancellations (1)
  await Cancellation.deleteMany({});
  const cancellationsToInsert = (data.cancellations || []).map((c) => ({
    _id: c.request_id,
    request_id: c.request_id,
    cancelled_at: c.cancelled_at,
    by: c.by,
    note: c.note || '',
  }));
  await Cancellation.insertMany(cancellationsToInsert);

  // 9. Booking Requests (25)
  await BookingRequest.deleteMany({});
  const cancelledIds = new Set(cancellationsToInsert.map((c) => c.request_id));
  const bookingRequestsToInsert = data.booking_requests.map((b) => ({
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
  }));
  await BookingRequest.insertMany(bookingRequestsToInsert);

  // 10. Exams (41)
  await Exam.deleteMany({});
  const examsToInsert = (data.exams || []).map((e) => ({
    _id: e.id,
    course_ids: e.course_ids || [],
    groups: e.groups || [],
    size: e.size,
    duration_hours: e.duration_hours || 2,
  }));
  await Exam.insertMany(examsToInsert);

  // 11. Application Users (Demo Accounts for 4 Roles)
  await User.deleteMany({});
  const salt = await bcrypt.genSalt(10);
  const demoUsers = [
    {
      _id: 'USER_ADMIN',
      name: 'Dean Academic Office (Admin)',
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
  ];
  await User.insertMany(demoUsers);

  if (options.resetAll) {
    await Schedule.deleteMany({});
    await Disruption.deleteMany({});
    await ScheduleVersion.deleteMany({});
    await AuditLog.deleteMany({});
  }

  // Initial Audit Log
  await AuditLog.create({
    _id: `LOG-${Date.now()}`,
    user_id: 'USER_ADMIN',
    action: 'DATASET_INITIALIZED',
    entity_type: 'dataset',
    entity_id: data.dataset_id,
    description: `Dataset ${data.dataset_id} successfully seeded with all 15 collections and 4 demo accounts.`,
    timestamp: new Date(),
  });

  return {
    success: true,
    dataset_id: data.dataset_id,
    counts: {
      rooms: roomsToInsert.length,
      faculty: facultyToInsert.length,
      student_groups: groupsToInsert.length,
      courses: coursesToInsert.length,
      sessions: sessionsToInsert.length,
      room_unavailability: roomUnavailToInsert.length,
      booking_requests: bookingRequestsToInsert.length,
      cancellations: cancellationsToInsert.length,
      exams: examsToInsert.length,
      users: demoUsers.length,
      institute_config: 1,
    },
  };
}

export default seedDatabase;
