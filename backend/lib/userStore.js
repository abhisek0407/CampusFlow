import bcrypt from 'bcryptjs';

// Pre-hashed passwords for demo presets
// Admin@123, Dept@123, Faculty@123, Club@123
const DEFAULT_FALLBACK_USERS = [
  {
    _id: 'USER_ADMIN',
    name: "Dean Academic Office",
    email: 'admin@cit.edu',
    password_hash: bcrypt.hashSync('Admin@123', 10),
    role: 'admin',
    department: 'ADMIN',
    linked_faculty_id: null,
    is_active: true,
    reset_password_token: null,
    reset_password_expires: null,
  },
  {
    _id: 'USER_COORD_CSE',
    name: 'Prof. Rajesh Sharma',
    email: 'dept.cse@cit.edu',
    password_hash: bcrypt.hashSync('Dept@123', 10),
    role: 'department_coordinator',
    department: 'CSE',
    linked_faculty_id: null,
    is_active: true,
    reset_password_token: null,
    reset_password_expires: null,
  },
  {
    _id: 'USER_FACULTY_F01',
    name: 'Dr. Ananya Mishra',
    email: 'faculty.f01@cit.edu',
    password_hash: bcrypt.hashSync('Faculty@123', 10),
    role: 'faculty',
    department: 'CSE',
    linked_faculty_id: 'F01',
    is_active: true,
    reset_password_token: null,
    reset_password_expires: null,
  },
  {
    _id: 'USER_CLUB_DRAMATICS',
    name: 'Dramatics Society Lead',
    email: 'club.dramatics@cit.edu',
    password_hash: bcrypt.hashSync('Club@123', 10),
    role: 'club',
    department: 'CLUBS',
    linked_faculty_id: null,
    is_active: true,
    reset_password_token: null,
    reset_password_expires: null,
  },
];

if (!global.__cit_memory_users) {
  global.__cit_memory_users = new Map(
    DEFAULT_FALLBACK_USERS.map((u) => [u.email.toLowerCase(), { ...u }])
  );
}

export function getMemoryUsers() {
  return global.__cit_memory_users;
}

export function findMemoryUserByEmail(email) {
  if (!email) return null;
  return global.__cit_memory_users.get(email.toLowerCase()) || null;
}

export function saveMemoryUser(userObj) {
  global.__cit_memory_users.set(userObj.email.toLowerCase(), userObj);
  return userObj;
}
