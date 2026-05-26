# Admin & Users

#admin

**Purpose:** User and access management — staff accounts, role-based permissions, hospital configuration, and multi-hospital setup.

**Connected to:** [[Supabase]], [[Patient Management]], [[Master Data]]

---

## Key Pages

| Page | File |
|------|------|
| Users | `src/pages/Users.tsx` |
| User Management | `src/pages/UserManagement.tsx` |
| Staff Attendance | `src/pages/StaffAttendance.tsx` |
| Hospital Selection | `src/pages/HospitalSelection.tsx` |

---

## Key Contexts

| Context | File | Purpose |
|---------|------|---------|
| Auth | `src/contexts/AuthContext.tsx` | JWT auth, current user, active hospital |
| Theme | `src/contexts/ThemeContext.tsx` | UI theme configuration |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `staff_members` | Staff master — also used as auth user profile |

## Supabase Auth

- JWT tokens issued on login
- User ID linked to `staff_members` record
- Hospital selection sets active `hospital_id` in session
- All queries automatically scoped by RLS to active hospital

---

## Role-Based Access

The system implements role-based routing — different staff roles see different pages:
- **Reception** — Patient registration, OPD/IPD queues
- **Lab Tech / Phlebotomist** — Lab worklist, results entry
- **Doctor** — Doctor view, clinical notes, OT
- **Billing** — Bill management, payment collection
- **Pharmacist** — Pharmacy inventory, dispensing
- **Admin** — All modules + user management
- **Finance** — Accounting, Tally integration, reports

---

## Multi-Hospital

- Single deployment supports multiple hospitals
- `hospital_id` on every table + RLS policies
- Staff can be assigned to one or more hospitals
- Hospital selector shown on login (`HospitalSelection.tsx`)
