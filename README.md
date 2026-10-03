# Classly — Calculus Course Platform

Private learning portal built from the [PRD](./calculus-course-platform-prd.md): recorded sessions (Google Drive), practice and graded assignments, admin-managed enrollments, and server-side grading/deadlines.

**Stack:** Next.js (App Router) · Convex · Convex Auth (email OTP + password) · Tailwind · shadcn/ui · KaTeX

## Quick start

### 1. Environment

Copy the example env file and fill in values after Convex is linked:

```bash
cp .env.example .env.local
```

**Convex Auth (required for login)** — on your Convex **dev deployment**, run once:

```bash
npm run setup:auth-env
# production app URL instead of localhost when deploying:
# node scripts/setup-convex-auth-env.mjs https://your-app.vercel.app
```

This sets `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`. Without them, password login and email codes fail.

In the **Convex dashboard** (Settings → Environment variables), also set:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Send login codes (optional in dev — codes log to Convex logs) |
| `RESEND_FROM_EMAIL` | Verified sender in Resend |
| `SETUP_SECRET` | One-time secret for bootstrapping the first admin |

### 2. Convex + Next.js

```bash
npm install
npx convex dev
```

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First admin account

In the Convex dashboard → **Functions**, run the action `bootstrap:createInitialAdmin` with:

```json
{
  "setupSecret": "<same as SETUP_SECRET>",
  "name": "Instructor",
  "email": "you@example.com",
  "password": "your-secure-password"
}
```

Sign in at `/login` (Password tab) with that email and password.

### 4. Course setup

1. **Admin → Dashboard** — create a course (auto-creates Prerequisites + Weeks 1–8 with PA/GA slots).
2. **Admin → Students** — add students and enroll them in the course.
3. **Admin → Course** — paste Google Drive links (`Anyone with the link` viewer), publish the course.
4. **Assignment editor** — add questions, set GA deadlines, publish assignments.

Students use **My Courses** → week sidebar → sessions and assignments.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npx convex dev` | Convex backend + regenerates `convex/_generated` |
| `npm run test:unit` | Vitest (grading logic) |
| `npm run build` | Production build |

## PRD defaults implemented

- **GA scoring:** best attempt (configurable per assignment)
- **Feedback:** score only until deadline; full solutions after deadline (configurable)
- **Late policy:** strict by default on graded assignments
- **Auth:** no public signup; admin creates students; email OTP or password
- **Attempts:** unlimited until deadline; one in-progress attempt; autosave on attempt screen

## Deploy

- **Frontend:** Vercel — set `NEXT_PUBLIC_CONVEX_URL`
- **Backend:** Convex Cloud — set env vars in dashboard
- Run `npx convex deploy` for production

## Tests

```bash
npm run test:unit
```

Covers numeric/MCQ grading and scoring policy helpers in `convex/lib/grading.test.ts`.
