# Third-Party Libraries & Solvers — CampusFlow

In accordance with Section 6 of the Hackathon Rules, the following open-source libraries, solvers, and dependencies are utilized in this project:

---

## 1. Solvers & Optimization Engines
- **Google OR-Tools (v9.15+)**:
  - `ortools.sat.python.cp_model`: Industrial-grade Constraint Programming solver (CP-SAT).
  - Used for generating clash-free weekly timetables (H1–H14), midsem exam schedules, and minimal-move disruption rescheduling.
  - License: Apache 2.0.

---

## 2. Backend & Database
- **Next.js (v16.4+)**: Full-stack framework and REST API routes (`app/api`).
- **Mongoose (v9.11+)**: Object Data Modeling (ODM) library for MongoDB Atlas.
- **bcryptjs (v3.0+)**: Password hashing for authentication.
- **jsonwebtoken (v9.0+)**: Secure JWT session tokens and role-based access control.
- **dotenv**: Environment variable management.

---

## 3. Frontend & UI
- **React (v19+)**: UI component library.
- **Tailwind CSS (v4+)**: Modern utility-first CSS styling for responsive timetable grids and dashboard.
- **Lucide Icons**: Clean, professional iconography.

---

## 4. Official Evaluation Tools
- **validator.py**: The official hackathon validator provided in the starter pack, used unchanged for continuous verification and automated testing.
