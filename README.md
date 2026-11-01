# CampusFlow — Campus Scheduling & Venue Management Platform
**Chilika Institute of Technology (CIT) — Team OrchestrAI**

CampusFlow is an intelligent campus scheduling, examination allocation, and venue booking platform engineered for Chilika Institute of Technology (CIT). It resolves complex academic timetable clashes, handles high-demand festival weeks (Spectra '27), processes multi-lingual Hinglish venue booking requests, and repairs last-minute disruptions with minimal session changes.

---

## 🏛️ System Architecture

```
                                  +-----------------------------+
                                  |     MongoDB Database        |
                                  |      (15 Collections)       |
                                  +--------------+--------------+
                                                 |
                                                 v
+------------------------------------------------------------------------------------------+
|                        Backend REST API Server (Node.js / Port 5000)                     |
|                                                                                          |
|  * 20 REST API Endpoints                                                                 |
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
                         |
                         v (API Proxy Rewrites /api/* -> :5000/api/*)
+------------------------------------------------------------------------------------------+
|                   Frontend Application (Next.js 16 + React 19 / Port 3000)                |
|                                                                                          |
|  4 Dynamic Role-Based Portals:                                                           |
|  1. Dean's Office (Admin): Overview, Timetable, Exams, Bookings, Disruptions, AI, etc.   |
|  2. Department Coordinator: Overview, Dept Timetable, Lab Bookings, Change Requests      |
|  3. Faculty (Dr. A. Mishra): Overview, My Timetable, Leaves, Extra Session, AI Assistant |
|  4. Club Representative: Overview, New Booking (Hinglish/English), My Bookings, History  |
+------------------------------------------------------------------------------------------+
```

---

## 👥 Demo User Accounts & Role-Based Navigation

When a user logs in (or switches demo profile), CampusFlow dynamically identifies their registered role and renders their tailored dashboard, sidebar, and pages:

| Role | Email | Password | Sidebar Tabs |
|---|---|---|---|
| **Admin (Dean's Office)** | `admin@cit.edu` | `Admin@123` | • Overview<br>• Timetable Management<br>• Exam Scheduling<br>• Venue Bookings<br>• Disruption Management<br>• AI Assistant<br>• Room Management<br>• Analytics & Reports<br>• Dataset Management |
| **Department Coordinator** | `dept.cse@cit.edu` | `Dept@123` | • Overview<br>• Department Timetable<br>• Department Bookings (Lab Approvals)<br>• Schedule Change Requests |
| **Faculty Member (F01)** | `faculty.f01@cit.edu` | `Faculty@123` | • Overview<br>• My Timetable (Dr. Ananya Mishra)<br>• Mark Unavailability (Constraint H7)<br>• Request Extra Session<br>• AI Faculty Assistant |
| **Club Representative** | `club.dramatics@cit.edu` | `Club@123` | • Overview (Spectra Fest)<br>• New Venue Booking (Hinglish/English NLP)<br>• My Bookings (with Rule B3 Cancel)<br>• Booking History |

> 🔄 **One-Click Demo Reset**: Admins can reset the database to a clean starter pack state anytime using the **Reset Demo Data** button in the dashboard or via `POST /api/admin/reset-database`.

---

## 📊 Database Architecture (15 MongoDB Collections)

1. **`rooms`**: 27 rooms with types, capacities, features, accessibility, and allowed uses.
2. **`faculty`**: 40 faculty members with departments, daily teaching caps, and unavailable slots.
3. **`student_groups`**: 14 student groups across Year 1 sections A–D and Years 2 & 3 for 5 departments.
4. **`courses`**: 62 academic courses.
5. **`sessions`**: 189 teaching sessions (lectures, tutorials, and 3-hour labs).
6. **`room_unavailability`**: Scheduled room maintenance windows (LH-4, etc.).
7. **`booking_requests`**: 25 Spectra week venue booking requests with lifecycle tracking.
8. **`cancellations`**: Withdrawn booking requests (strictly non-schedulable per Rule B3).
9. **`exams`**: 41 midsem examinations across Monday–Saturday AM/PM sessions.
10. **`institute_config`**: Top-level dataset configuration, calendar rules, and priority caps.
11. **`users`**: Application authentication for all 4 roles.
12. **`schedules`**: Saved timetable records and approval statuses.
13. **`disruptions`**: Registered faculty leaves, room closures, or added sessions.
14. **`schedule_versions`**: Audit trail of timetable versions and sessions moved.
15. **`audit_logs`**: Chronological log of administrative actions.

---

## 🤖 Run the Agent

**Prerequisites**: Node.js 18+, Python 3.10+ venv, MongoDB Atlas URI, Google Gemini API key.

**Environment variables to set** (names only, see `.env.example` in respective folders):
- `backend/.env.local`: `MONGODB_URI`, `JWT_SECRET`, `PYTHON_BIN`, `AGENT_URL`, `AGENT_SHARED_SECRET`
- `agent-service/.env`: `GOOGLE_API_KEY`, `GEMINI_MODEL`, `BACKEND_URL`, `AGENT_PORT`, `AGENT_SHARED_SECRET`

**Commands in order**:
1. Seed database: `cd backend && npm run seed`
2. Start backend (port 5000): `cd backend && npm run dev`
3. Start frontend (port 3000): `cd frontend && npm run dev`
4. Start agent service (port 8001): `cd agent-service && uvicorn main:app --port 8001`

**Demo Logins**:
- **Admin**: `admin@cit.edu` / `Admin@123`
- **Dept Coordinator**: `dept.cse@cit.edu` / `Dept@123`
- **Faculty (F01)**: `faculty.f01@cit.edu` / `Faculty@123`
- **Club Rep**: `club.dramatics@cit.edu` / `Club@123`

**Offline Fallback**: If the agent service is down or unreachable, `/api/agent/chat` returns HTTP 503 (`ai_unavailable`) and the UI falls back to manual mode so booking submissions continue to work.

> **Notice**: Never click Reset Demo Data during a demo; it clears audit logs.

---

## 🚀 Running the Project

### 1. Start the Backend API Server (Port 5000)
```bash
cd backend
npm run build
npm run start
# Runs on http://localhost:5000
```

### 2. Start the Frontend Client Application (Port 3000)
```bash
cd frontend
npm run build
npm run start
# Runs on http://localhost:3000
```

### 3. Start the AI Agent Service (Port 8001)
`ash
cd agent-service
# Copy agent-service/.env.example to agent-service/.env and set your GOOGLE_API_KEY
python -m uvicorn main:app --port 8001
# Runs on http://localhost:8001 (proxied server-to-server via backend /api/agent/chat)
`

### 4. Run Smoke Tests
`ash
# Automated end-to-end verification of auth, role caps, CP-SAT solver, concurrency, and fallbacks:
bash backend/tests/smoke.sh
# or on Windows:
python backend/tests/smoke.py
`

### 5. Verify Baseline & Disruption with Official Validator
```bash
# Baseline check
python CrunchWeek_StarterPack/validator.py --data CrunchWeek_StarterPack/data/cit_public.json --schedule exports/schedule.json

# Post-disruption check
python CrunchWeek_StarterPack/validator.py --data CrunchWeek_StarterPack/data/cit_public.json --schedule exports/schedule_after.json --disruption CrunchWeek_StarterPack/examples/sample_disruption.json --baseline exports/schedule.json
```

---

## 🏆 Benchmark Results
- **Hard Violations**: **0** (100% feasibility guaranteed across H1–H14)
- **Soft Penalty**: **3** (Joint CP-SAT optimization: S1=0, S2=0, S3=0, S4=3, S5=0, S6=0)
- **Spectra Booking Score**: **67.0 / 70.0** (The proven theoretical ceiling of the dataset)
- **Rescheduling Stability**: **96.3%** (Only 7 sessions moved on sample disruption)
- **Multi-lingual AI Parser**: Handles English, mixed Hinglish, and colloquial festival venue requests with automated review cards.
