# SRI.CR — Appointments made easy

A full appointment-booking project: a public marketing site, a client self-service portal and a staff back office.

- `server/` — Node.js, Express, MongoDB (Mongoose), JWT auth
- `client/` — React (Vite), React Router, FullCalendar

## What's in it

### Who can open what

| Page | Public (not signed in) | Client | Staff | Admin |
|---|:-:|:-:|:-:|:-:|
| Home, About, Gallery, FAQ | yes | yes | yes | yes |
| **Sign up** and **Log in** | yes | yes | yes | yes |
| **Dashboard** | - | yes (own figures) | yes (team figures) | yes |
| **Calendar** | - | yes (read-only, see below) | yes (book, drag, edit, cancel) | yes |
| **Appointment types** | - | yes (read-only, bookable ones only) | yes (read-only) | yes (add / edit / delete) |
| My appointments, Book an appointment | - | yes | - | - |
| **Users** (create / manage accounts) | - | - | - | **yes — admin only** |

The **Log in** (`/login`) and **Sign up** (`/signup`) pages use the app's own layout (plum page + side menu with Home / Log in / Sign up), not the landing page's header and footer.

Where each lives: the public site is `/`; after **Sign up or Log in, every user lands on `/app`** — one app, one menu that adapts to the role.
Clients get two extra menu items (`/app/my-appointments`, `/app/book`); **Users** (`/app/users`) is shown to admins only. Anyone opening
a page their role cannot use is sent back to `/app`.

**What a client sees on the calendar.** Their own appointments in full. Everyone else's scheduled appointments appear only as an
anonymous grey "Booked" block (time only: no name, contact details, notes, type or assignee) so they can see when the team is busy
without seeing who. They cannot drag, edit or create anything there; booking goes through "Book an appointment". The server
enforces all of this, not just the UI.

**Dashboard cards are shortcuts.** *Appointments today* opens the calendar on today (Day view); *Upcoming* opens the calendar's List view from tomorrow with the *Scheduled* filter; *Active appointment types* opens Appointment Types with the *Active* filter. The calendar also accepts these in its address: `?view=day|week|month|list&date=YYYY-MM-DD&status=scheduled&type=<id>&mine=1`.

**What a client sees on the dashboard.** Only their own counts and next appointments (never team-wide numbers or the user count).

### Accounts, email and reminders

- **Forgot password** (`/forgot-password` → emailed one-time link → `/reset-password`). Links expire after 1 hour and work once; only a hash of the token is stored; the response never reveals whether an email is registered.
- **Profile** (`/app/profile`, every role): edit name and phone, change password. Changing or resetting a password signs out every other session.
- **Emails** to the client: booking confirmed, updated/rescheduled, cancelled, and exactly two reminders: one a day before (`REMINDER_HOURS_BEFORE`, default 24) and one an hour before (`REMINDER_MINUTES_BEFORE`, default 60). Each is sent once, skipped if the booking was made after that moment had already passed, and re-armed if the appointment is rescheduled. Configure SMTP in `server/.env`; with no `SMTP_HOST` they are printed to the server console, so in development you can open the reset link straight from the terminal.

### One to one or online meeting

When booking, a client chooses **One to one** or **Online meeting**. Online bookings get a unique video-room link (Jitsi, no account needed; change the host with `MEETING_BASE_URL`), shown as a **Join meeting** button on the confirmation screen and in *My appointments*, and included in the confirmation, reschedule and reminder emails. Staff pick the same option on the appointment form and can paste their own https Zoom/Meet link instead. The link stays the same when an appointment is rescheduled.

### Roles

- **client** — self-registered through Sign up. Can never become staff or admin through the public form.
- **staff** — back office: manage the calendar and bookings.
- **admin** — everything staff can do, plus appointment types and user management.

Staff and admins are created by an admin (Users page) or by `npm run seed:admin`.

### How availability works

Working hours, slot length, open days and time zone are configured in `server/.env` (see `.env.example`).
A start time is offered when the service fits before closing time, it is far enough in the future, and fewer
overlapping scheduled appointments exist than the team's **capacity** (the number of active staff + admins).
The appointment type's buffer is included when checking overlaps. Staff can assign a booking to a person afterwards.

## Run

```bash
# MongoDB must be reachable (local, or an Atlas URI in server/.env)
cd server
cp .env.example .env      # set MONGODB_URI, JWT_SECRET, seed admin credentials
npm install
npm run seed:admin        # creates the first admin

# from the project root, start API + client together
cd ..
npm install
npm run dev               # API http://localhost:5000, site http://localhost:5173
```

Run the API tests (they use an in-memory MongoDB; the first run downloads a mongod binary, about 800 MB, once):

```bash
cd server && npm test
```

Then add at least one **Appointment type** (admin → Appointment types) so clients have something to book.

## Notes for production

- Set a strong, private `JWT_SECRET` and serve over HTTPS; set `CLIENT_ORIGIN` to the real site origin.
- The signup/login rate limiters are in-memory (per process). Behind a proxy set Express `trust proxy`, and use a shared
  store such as Redis if you run several instances.
- Simultaneous bookings of the last slot are resolved after the write: the booking that claimed the time first keeps it
  and the other gets a "slot no longer available" error (covered by a test). Staff-created bookings are not capped by team capacity.
- Set `TRUST_PROXY` (number of proxies) when running behind a reverse proxy so the rate limiters see real client IPs.
- The reminder job runs inside each API process; each reminder is claimed atomically, so several instances will not double-send.

## Hosting

See [DEPLOY.md](DEPLOY.md) for a free setup (MongoDB Atlas + Render + Vercel) and how to add a custom domain such as sricr.com later.
