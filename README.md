# CampusFlow — Campus Scheduling & Venue Management Platform
**Chilika Institute of Technology (CIT) — Team OrchestrAI**

CampusFlow is an intelligent campus scheduling, examination allocation, and venue booking platform engineered for Chilika Institute of Technology (CIT). It resolves complex academic timetable clashes, handles high-demand festival weeks (Spectra '27), processes multi-lingual Hinglish venue booking requests, and repairs last-minute disruptions with minimal session changes.

---

## 🏛️ System Architecture

```
                                  +-----------------------------+
                                  |     MongoDB Atlas Cluster   |
                                  |      (15 Collections)       |
                                  +--------------+--------------+
                                                 |
                                                 v
+------------------------------------------------------------------------------------------+
|                                    Next.js Backend API                                   |
|                                                                                          |
|  * Auth & Role Control (Admin, Coordinator, Faculty, Club)                               |
|  * Timetable Views (by Student Group, Faculty, Room, & Utilisation)                      |
|  * Venue Booking Lifecycle (Request -> Conflict Check -> Decide -> Audit)                |
|  * AI Natural Language Assistant (English/Hinglish Parsing & Explanations)               |
|  * Disruption Rescheduling Workflow & Admin Approval Gates                               |
+--------------------------------------------+---------------------------------------------+
                                             |
                         +-------------------+-------------------+
                         |                                       |
                         v                                       v
+------------------------------------+ +----------------------------------------------------+
|   Google OR-Tools CP-SAT Solver    | |          Official Checker (validator.py)           |
|                                    | |                                                    |
|  * Weekly Timetable (189 sessions) | |  * 0 Hard Violations Guaranteed                    |
|  * Midsem Exams (41 exams)         | |  * Soft Penalty Minimization (S1–S6)               |
|  * Minimal-Move Rescheduling       | |  * Booking Score Optimization & Inversion Checks   |
+------------------------------------+ +----------------------------------------------------+
```

---

## 📊 Database Architecture (15 MongoDB Collections)

1. **`rooms`**: 27 rooms with types, capacities, features, accessibility, and allowed uses.
2. **`faculty`**: 40 faculty members with departments, daily teaching caps, and unavailable slots.
3. **`student_groups`**: 14 student groups across Year 1 sections A–D and Years 2 & 3 for 5 departments.
4. **`courses`**: 62 academic courses.
5. **`sessions`**: 189 teaching sessions (lectures, tutorials, and 3-hour labs).
6. **`room_unavailability`**: Scheduled room maintenance windows.
7. **`booking_requests`**: 25 Spectra week venue booking requests with lifecycle tracking.
8. **`cancellations`**: Withdrawn booking requests (strictly non-schedulable).
9. **`exams`**: 41 midsem examinations across Monday–Saturday AM/PM sessions.
10. **`institute_config`**: Top-level dataset configuration, calendar rules, and priority caps.
11. **`users`**: Application authentication for all 4 roles.
12. **`schedules`**: Saved timetable records and approval statuses.
13. **`disruptions`**: Registered faculty leaves, room closures, or added sessions.
14. **`schedule_versions`**: Audit trail of timetable versions and sessions moved.
15. **`audit_logs`**: Chronological log of administrative actions.

---

## 👥 Demo Accounts for All 4 Roles

Judges can test the platform using the following pre-configured credentials:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin (Dean's Office)** | `admin@cit.edu` | `Admin@123` | Full control: Generate timetables, approve changes, displace classes for institute events, reset demo data |
| **Department Coordinator** | `dept.cse@cit.edu` | `Dept@123` | Manage CSE sessions, book department events, view departmental timetables |
| **Faculty Member** | `faculty.f01@cit.edu` | `Faculty@123` | View personal timetable (`F01 - Dr. Ananya Mishra`), mark leave, AI schedule change assistant |
| **Club Representative** | `club.dramatics@cit.edu` | `Club@123` | Submit English/Hinglish venue requests, view approval status, cancel bookings |

> 🔄 **One-Click Demo Reset**: Admins can reset the database to a clean starter state anytime by calling `POST /api/admin/reset-database` or using the reset button in the dashboard.

---

## 🚀 Setup & Execution

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Python CP-SAT optimization engine
pip install ortools
```

### 2. Configure Environment
Create `backend/.env.local`:
```env
MONGODB_URI=mongodb+srv://abhisekpanda366_db_user:CTC123@cluster0.zlny5ec.mongodb.net/orchestrai_db?retryWrites=true&w=majority
JWT_SECRET=campusflow_jwt_secret_key_cit_2027_secure
PORT=3000
NODE_ENV=development
```

> **Note on MongoDB Atlas Connection**: Ensure your IP address is whitelisted in MongoDB Atlas under **Network Access** (or allow `0.0.0.0/0`).

### 3. Generate Timetables & Validate
```bash
# Run the Google OR-Tools solver to export schedules
python AI-service/solver.py

# Run the official validator
python CrunchWeek_StarterPack/validator.py --data CrunchWeek_StarterPack/data/cit_public.json --schedule exports/schedule.json
```

### 4. Run the Platform
```bash
cd backend
npm run dev
```

---

## 🎯 Official Benchmark Results

Running `validator.py` on the exported schedules produces:

### Baseline Timetable (`exports/schedule.json`):
- **Hard Violations**: `0`
- **Soft Penalty**: `310`
- **Booking Score**: `61.0` (20 approved, 2 alternatives offered, 3 rejected with reasons, 0 priority inversions)
- **Exam Soft Penalty**: `0`

### After Disruption (`exports/schedule_after.json`):
- **Hard Violations**: `0`
- **Sessions Moved**: `9` (Only 1 changed time, 8 changed room only!)
- **Rescheduling Time**: `< 1 second`

---

## ⚠️ Known Limitations
- The current implementation targets single-week semester cycles and examination weeks.
- Natural language parsing relies on semantic extraction rules with LLM assist; ambiguous dates are validated against calendar rules before submission.
