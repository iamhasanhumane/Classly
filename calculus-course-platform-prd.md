# Calculus Course Platform — Product Requirements Document

**Version:** 1.1 (draft)  
**Date:** 21 September 2026  
**Owner:** Instructor / Admin  
**Status:** Ready for review  

> **What changed in v1.1:** assignments now allow **unlimited attempts until the deadline**, including graded assignments (GA). This adds a scoring policy (which attempt counts), a feedback policy, attempt history, and matching changes to the requirements, data model, risks and open questions. Appendix B (routes, schema sketch, implementation notes) was added so the document can be used directly as a build brief.

---

## 1. Overview

### 1.1 Problem
The instructor teaches a calculus course live (8-week plan) and records every session. Today there is no single place where the student can re-watch sessions in order, find the right week's material, and submit practice and graded work with clear deadlines. Recordings, assignments and deadlines live in scattered places (Drive, chat, notes).

### 1.2 Product vision
A focused, private learning portal for one course: **log in → open your course → pick a week → watch the session → do the practice assignment → submit the graded assignment before the deadline.** The instructor manages everything (videos, questions, deadlines) from an admin panel without touching code.

### 1.3 Goals
1. Give the student a clean, structured way to watch recorded sessions week by week.
2. Let the student practise without pressure (PA) and complete graded work (GA) with as many attempts as needed before the deadline.
3. Let the instructor upload/attach videos, author questions, and control deadlines from one admin panel.
4. Be simple enough to launch quickly (MVP in ~3–4 weeks part-time) but structured so it can serve more students and more courses later.

### 1.4 Non-goals (v1)
- Public signup, payments, or a marketplace of courses.
- Live video streaming inside the app (sessions are recorded elsewhere, then attached).
- Discussion forums / chat, certificates, gamification.
- Native mobile apps (a responsive web app is enough).

### 1.5 Success metrics
| Metric | Target |
|---|---|
| Student can find and play any session in ≤ 3 clicks after login | 100% |
| Weekly session completion rate | ≥ 90% |
| GA submitted before deadline | ≥ 85% |
| Time for admin to publish a new session (paste Drive link → live) | < 2 minutes |
| Time for admin to create a 10-question assignment | < 15 minutes |
| Critical bugs after launch week | 0 |

---

## 2. Users and roles

| Role | Description | Key permissions |
|---|---|---|
| **Student** | Enrolled learner. Accounts are **created by the admin** — there is no signup page. | View enrolled courses, watch sessions, attempt PA/GA, see own results and deadlines |
| **Admin (Instructor)** | Owns the course content. | Everything: users, enrollments, courses, weeks, sessions, questions, deadlines, grading, extensions |

> Design note: even though there is one student today, the data model is **multi-student and multi-course** from day one (enrollments table). Adding a second student is then just creating a user and enrolling them.

---

## 3. Core user journeys

### 3.1 Student
1. Opens the app URL and logs in (email + one-time code, or email + password — see §9.3).
2. Lands on **My Courses** — a list of courses they are enrolled in.
3. Clicks a course → opens the **Course page** (sidebar + content pane).
4. Expands **Week 3** in the sidebar → sees Sessions 1–N, **Practice Assignment**, **Graded Assignment**.
5. Clicks a session → the video plays in the right pane.
6. Clicks **Practice Assignment** → attempts questions, gets instant feedback, can retry.
7. Clicks **Graded Assignment** → sees the deadline, attempts it as many times as needed before the deadline, sees the score after each attempt (and the solutions after the deadline, per policy).

### 3.2 Admin
1. Logs in → sees the **Admin dashboard**.
2. Creates/edits the course structure (Prerequisites + Week 1–8).
3. Pastes a Google Drive link for a recording → session appears in the right week.
4. Creates PA and GA questions for the week (with LaTeX math).
5. Sets deadlines (and changes them later, globally or per student).
6. Reviews submissions, grades manual-answer questions, overrides marks if needed.

---

## 4. Information architecture and layout

### 4.1 Course page (the main screen)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← My Courses     Calculus — 8 Week Course        Progress 35%           │
├──────────────────────┬──────────────────────────────────────────────────┤
│ ▸ Prerequisites      │ Week 2 · Session 3                               │
│ ▸ Week 1         [x] │ Limits at Infinity                               │
│ ▾ Week 2             │ ┌──────────────────────────────────────────────┐ │
│    ▶ Session 1   [x] │ │                                              │ │
│    ▶ Session 2   [x] │ │          Embedded recorded session           │ │
│    ▶ Session 3   [>] │ │                                              │ │
│    [P] Practice Asg  │ └──────────────────────────────────────────────┘ │
│    [G] Graded Asg    │ Notes / resources for this session               │
│        Due 28 Sep    │ [ Mark as complete ]   [ < Prev ] [ Next > ]     │
│ ▸ Week 3             │                                                  │
│ ▸ …                  │                                                  │
│ ▸ Week 8             │                                                  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

- **Left sidebar:** *Prerequisites* + *Week 1 … Week 8* as accordions. Only one week is expanded at a time by default; the current week auto-expands. Each item shows a status icon (not started / in progress / done). The graded assignment shows its due date and turns amber/red as the deadline nears.
- **Right pane:** renders whatever is selected — session video, assignment attempt screen, or results screen.
- **Mobile:** sidebar collapses into a drawer/top dropdown; the right pane takes the full width.

### 4.2 Content hierarchy

```
Course
 ├─ Section: Prerequisites        (videos, PDFs/notes; optional quiz)
 ├─ Section: Week 1
 │    ├─ Sessions (1..N)          (each = one recorded video)
 │    ├─ Practice Assignment (PA) (exactly one)
 │    └─ Graded Assignment (GA)   (exactly one)
 ├─ Section: Week 2 … Week 8
```

Every Week section is created with a PA slot and a GA slot automatically, so the "two assignments per week" rule is enforced by structure.

---

## 5. Functional requirements

Priority: **P0** = MVP must-have, **P1** = should-have shortly after launch, **P2** = later.

### 5.1 Authentication and access

| ID | Requirement | Priority |
|---|---|---|
| AUTH-1 | No public signup. Only accounts created by the admin can log in. | P0 |
| AUTH-2 | Student logs in with email + one-time code (magic code) *or* email + admin-issued password. | P0 |
| AUTH-3 | Sessions persist (e.g., 30 days) via secure httpOnly cookies; logout available. | P0 |
| AUTH-4 | Role-based access: students can never see admin routes or other students' data. | P0 |
| AUTH-5 | A student can only open courses they are enrolled in; direct URL access to other courses is blocked. | P0 |
| AUTH-6 | Admin can deactivate a student (revoke access) without deleting their data. | P1 |

### 5.2 Student — My Courses

| ID | Requirement | Priority |
|---|---|---|
| CRS-1 | Show a list/grid of enrolled courses with title, cover, progress %, and next upcoming deadline. | P0 |
| CRS-2 | Clicking a course opens the Course page in the two-pane layout. | P0 |
| CRS-3 | Empty state if the student has no enrollments ("You're not enrolled in any course yet — contact your instructor"). | P0 |

### 5.3 Student — Course page and sessions

| ID | Requirement | Priority |
|---|---|---|
| SES-1 | Left sidebar lists *Prerequisites* and *Week 1–8* as expandable dropdowns; each week lists its sessions, PA and GA. | P0 |
| SES-2 | Clicking a session loads its video in the right pane without a full page reload; URL updates (`/course/:id/session/:sid`) so it can be bookmarked/refreshed. | P0 |
| SES-3 | Video is embedded from Google Drive (see §9.4 for constraints and upgrade path). | P0 |
| SES-4 | Session page shows title, date recorded, description, and optional attachments (PDF notes, handwritten board images). | P0 |
| SES-5 | "Mark as complete" toggle per session; sidebar and course progress update. | P0 |
| SES-6 | Prev/Next navigation between sessions and assignments in order. | P1 |
| SES-7 | Remember last viewed item; "Continue where you left off" on My Courses. | P1 |
| SES-8 | Weeks can be scheduled to unlock on a date (drip) or be always open — set per week by admin. | P1 |
| SES-9 | Timestamped notes/chapters under the video (e.g., "12:40 — L'Hôpital's rule example"). | P2 |

### 5.4 Student — Assignments

| ID | Requirement | Priority |
|---|---|---|
| ASG-1 | Every week shows one PA and one GA in the sidebar. | P0 |
| ASG-2 | **PA:** unlimited attempts, instant per-question feedback, hint and worked solution available after an attempt, not counted toward the grade. | P0 |
| ASG-3 | **GA:** deadline-bound with **unlimited attempts until the deadline**. Each attempt's score is recorded; the student's grade is taken per the scoring policy (default: best attempt). The score is shown after each attempt; correct answers and worked solutions are released per the feedback policy (default: after the deadline). | P0 |
| ASG-4 | Attempt screen: question navigator (numbered chips showing answered / unanswered / flagged), autosave of answers, submit with confirmation. | P0 |
| ASG-5 | Math rendering with LaTeX (KaTeX) in questions and options; a math-friendly input for typed answers. | P0 |
| ASG-6 | GA after deadline: new attempts are blocked (or accepted as late per policy §6.3). Clear message and a countdown before that. | P0 |
| ASG-7 | Results screen: score and full attempt history (all attempts, counted attempt highlighted); per-question correctness, correct answers and worked solutions (PA immediately; GA per feedback policy, default after the deadline). | P0 |
| ASG-8 | Optional timer for a GA (e.g., 60 minutes per attempt once started), enforced server-side. | P1 |
| ASG-9 | Upload a photo/PDF of handwritten working for selected questions (manually graded). | P1 |
| ASG-10 | Student dashboard of all upcoming deadlines across weeks. | P1 |
| ASG-11 | Only one attempt can be in progress at a time; an unfinished attempt can be resumed. Starting a new attempt creates a fresh attempt (reshuffled if shuffling is on). | P0 |
| ASG-12 | Attempt history list per assignment: attempt number, date, score, and which attempt counts. | P0 |

### 5.5 Admin — Users and enrollments

| ID | Requirement | Priority |
|---|---|---|
| ADM-1 | Create student (name, email); optionally send an invite email with login instructions. | P0 |
| ADM-2 | Enroll / unenroll a student in a course. | P0 |
| ADM-3 | View a student's progress: sessions completed, PA attempts, GA scores, late submissions. | P1 |
| ADM-4 | Deactivate / reactivate student. | P1 |

### 5.6 Admin — Course and content management

| ID | Requirement | Priority |
|---|---|---|
| CMS-1 | Create/edit a course (title, description, cover, status: draft/published). | P0 |
| CMS-2 | Manage sections: Prerequisites + Week 1–8; reorder, rename, hide/show. | P0 |
| CMS-3 | Add a session: title, description, week, order, **Google Drive link** (system extracts the file ID and builds the embed URL). | P0 |
| CMS-4 | Preview exactly what the student will see ("View as student"). | P0 |
| CMS-5 | Edit/replace/remove a session video; reorder sessions by drag-and-drop. | P0 |
| CMS-6 | Attach files (PDF notes) to a session or week. | P1 |
| CMS-7 | Draft vs Published state per session/assignment so content can be prepared ahead of time. | P1 |
| CMS-8 | Validate the Drive link on save (URL format check; warn if it looks unshared / non-embeddable). | P1 |

### 5.7 Admin — Assignment authoring

| ID | Requirement | Priority |
|---|---|---|
| QB-1 | For each week, open the PA and GA editors and add questions. | P0 |
| QB-2 | Question types: **MCQ (single)**, **MCQ (multiple)**, **Numeric** (with tolerance), **Math expression** (e.g., derivative/integral answers), **Short text**. | P0 |
| QB-3 | Question body supports Markdown + LaTeX with **live preview**; images/diagrams can be inserted. | P0 |
| QB-4 | Per question: marks, correct answer(s), optional hint, worked solution (LaTeX + optional image). | P0 |
| QB-5 | Reorder questions; duplicate a question; copy questions from PA to GA (or from a previous week). | P1 |
| QB-6 | Option to shuffle question/option order per attempt. | P1 |
| QB-7 | Type: **File upload / subjective** (manually graded). | P1 |
| QB-8 | Tag questions by topic (limits, derivatives, …) for a reusable question bank. | P2 |
| QB-9 | Import questions from a CSV/JSON template. | P2 |
| QB-10 | Randomised parameters (variants of a numeric/expression question) so repeated attempts don't reuse identical numbers. | P2 |

### 5.8 Admin — Deadlines and grading

| ID | Requirement | Priority |
|---|---|---|
| DL-1 | Set an open date and a due date/time (IST by default) for each GA (and optionally PA). | P0 |
| DL-2 | Edit deadlines at any time; students see the new deadline immediately. | P0 |
| DL-3 | **Per-student extension:** override the deadline for one student without changing the global one. | P0 |
| DL-4 | **Bulk shift:** move deadlines of selected weeks by ±N days (e.g., a missed week). | P1 |
| DL-5 | Late policy per GA: *no late*, *late allowed until hard cutoff with X% penalty*, or *always open*. | P1 |
| DL-6 | Reminder emails to the student (e.g., 48h and 6h before a GA deadline) and a notice when the deadline changes. | P1 |
| GR-1 | Auto-grading for MCQ / numeric / math-expression / short text. | P0 |
| GR-2 | View all attempts of a GA per student (attempt no., time, score, late flag); open any attempt; override the score with a comment. | P0 |
| GR-3 | Manual grading UI for subjective/file questions, with feedback comments. | P1 |
| GR-4 | Feedback policy per GA: *score only*, *score + per-question correctness*, or *full solutions*; and when solutions unlock (immediately, after the deadline, or manually). Default: score only until the deadline, then full solutions. | P1 |
| GR-5 | Export grades as CSV. | P2 |
| GR-6 | Choose which attempt counts for the GA grade: **best** (default), latest, or average. | P0 |

---

## 6. Assignment system — detailed rules

### 6.1 PA vs GA

| Aspect | Practice Assignment (PA) | Graded Assignment (GA) |
|---|---|---|
| Purpose | Learn and self-check | Assessment |
| Attempts | Unlimited | Unlimited until the deadline (optional admin cap) |
| Deadline | None (or soft, optional) | Yes, with optional per-student extension |
| Feedback | Instant, per question | Score after each attempt; answers and solutions per feedback policy (default: after the deadline) |
| Hints & worked solutions | Available after attempting | Hidden until released |
| Counts toward grade | No | Yes, per scoring policy (default: best attempt) |
| Timer | No | Optional |
| Order/option shuffling | Optional | Optional |

### 6.2 Auto-grading for calculus answers

| Type | How it is checked |
|---|---|
| MCQ | Exact match of the selected option id(s); partial credit for multi-select is configurable. |
| Numeric | `abs(student − correct) ≤ tolerance` (absolute or relative). Accepts fractions/decimals (e.g., `1/2` = `0.5`). |
| Math expression | The student types an expression (e.g., `2x*cos(x^2)`). It is **evaluated numerically at several random values of the variable** (within the allowed domain) and compared with the reference expression within a tolerance. This is robust to equivalent forms (`sin(x)cos(x)` vs `sin(2x)/2`) and avoids the fragility of purely symbolic simplification. Admin can define the variable(s) and test range. |
| Short text | Case-insensitive match against a list of accepted answers. |
| File/subjective | Manual grading by admin. |

### 6.3 Deadline and late policy

- **Effective deadline** for a student = per-student override if present, otherwise the assignment's due date.
- All timestamps stored in UTC, displayed in the student's timezone (default `Asia/Kolkata`).
- Deadline enforcement happens **on the server**, never only in the browser.
- Autosaved answers are kept; if the deadline passes mid-attempt, the attempt is auto-submitted (or blocked, per policy).
- Late submission modes: **Strict** (blocked) · **Grace** (accepted until hard cutoff, penalty %) · **Open** (no deadline).

### 6.4 Attempt lifecycle

Each attempt moves through: `in_progress (autosaved) → submitted → graded (auto) → [needs_review → graded (final)]`. Once an attempt is graded, the student can start a new attempt as long as the effective deadline has not passed.

### 6.5 Multiple attempts and scoring

- **Unlimited attempts** are allowed on both PA and GA until the effective deadline. The admin may optionally set a cap per GA; leaving it empty means unlimited.
- Only **one attempt can be in progress** at a time; an unfinished attempt can be resumed. Starting a new attempt creates a fresh attempt (with reshuffled question/option order if shuffling is on).
- All attempts are stored. The student sees an **attempt history** (date, score) and the admin sees every attempt for every student.
- **Which attempt counts** for the GA grade is set by the scoring policy: *best* (default), *latest*, or *average*. The result is the student's GA score and feeds the gradebook.
- **Feedback after each attempt** follows the feedback policy: *score only*, *score + per-question correctness*, or *full solutions*. Recommended default: **score only until the deadline, then full solutions**, so unlimited attempts don't turn into guess-and-check.
- **Late attempts** (after the deadline) follow the late policy in §6.3; any penalty is applied to the score of the late attempt.
- An **extension** for one student moves only that student's effective deadline.
- If a **timer** is configured, it applies per attempt and is enforced server-side.

---

## 7. Data model (logical)

| Entity | Key fields |
|---|---|
| **User** | id, name, email, role (`admin`/`student`), status, timezone, createdAt |
| **Course** | id, title, description, coverImage, status (`draft`/`published`) |
| **Enrollment** | id, userId, courseId, enrolledAt, status |
| **Section** | id, courseId, title (`Prerequisites`, `Week 1`…), type (`prerequisites`/`week`), order, unlockAt?, isHidden |
| **Session** | id, sectionId, title, description, videoProvider (`gdrive`), videoRef (Drive file ID), durationSec?, order, status, recordedAt |
| **Resource** | id, parentType (`session`/`section`), parentId, fileId/url, title |
| **Assignment** | id, sectionId, kind (`practice`/`graded`), title, instructions, opensAt?, dueAt?, maxAttempts? (empty = unlimited), scoringPolicy (`best`/`latest`/`average`), feedbackMode (`score_only`/`per_question`/`full`), solutionsRelease (`immediate`/`after_deadline`/`manual`), timeLimitMin?, latePolicy, status |
| **Question** | id, assignmentId, type, body (Markdown+LaTeX), options[]?, answerSpec, marks, hint?, solution?, order |
| **DeadlineOverride** | id, assignmentId, userId, dueAt, reason |
| **Attempt** | id, assignmentId, userId, attemptNo, startedAt, submittedAt, status, score, isLate (one `in_progress` attempt per user per assignment) |
| **Answer** | id, attemptId, questionId, response, isCorrect?, marksAwarded, feedback? |
| **Grade** (derived) | userId, assignmentId, score, countedAttemptId. Computed from the student's attempts per `scoringPolicy` |
| **SessionProgress** | id, userId, sessionId, completed, lastViewedAt |
| **Notification** | id, userId, type, payload, sentAt |
| **AuditLog** | id, actorId, action, entity, before/after, at (for deadline and score changes) |

Rules: `Assignment` is unique per `(sectionId, kind)` for week sections; a student's data is always filtered by `userId` server-side.

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Security** | HTTPS only; httpOnly + Secure cookies; server-side authorization on every query/mutation; rate-limited login; input sanitisation for Markdown/LaTeX (no raw HTML); students cannot read correct answers/solutions before release (never sent to the client). |
| **Privacy** | Only the student and admin can see the student's data. Minimal personal data (name, email). |
| **Performance** | Course page interactive < 2 s on a normal connection; sidebar switching without page reloads. |
| **Reliability** | Autosave every few seconds during attempts; no answer loss on refresh/disconnect. Daily backups of the database. |
| **Usability** | Fully responsive (phone, tablet, laptop); keyboard-accessible; sufficient contrast; dark mode optional (P2). |
| **Accessibility** | WCAG 2.1 AA target for the student views; math content readable by screen readers (KaTeX MathML output). |
| **Observability** | Error tracking and basic logs; audit log for deadline/score changes. |
| **Scalability** | Comfortable for 1 → ~200 students without re-architecture. |
| **Cost** | Target near-zero hosting cost at the start (free/hobby tiers). |

---

## 9. Recommended tech stack

### 9.1 Recommendation at a glance

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js (App Router) + TypeScript**, Tailwind CSS, shadcn/ui | Fast to build, great routing for `/course/:id/session/:sid`, SSR for quick first load, polished accessible components. |
| **Backend + database** | **Convex** | TypeScript end-to-end, real-time reactive queries (deadline changes appear instantly), built-in file storage, scheduled jobs (reminders, auto-submit at deadline), transactions, generous free tier. One person can build and maintain it. |
| **Auth** | **Convex Auth** with email one-time code (via Resend); admin-created users only, signup disabled | No password for the student to forget; invite-only fits "no signup". (Alternative: Clerk in invite-only mode.) |
| **Math rendering** | **KaTeX** | Fast LaTeX rendering for questions/solutions. |
| **Math input** | **MathLive** (student answer entry) + **mathjs** (numeric evaluation for equivalence checks) | Lets students type/see math naturally; numeric-sampling equivalence check for calculus answers. |
| **Admin authoring** | Markdown + LaTeX editor with live preview (Tiptap later if a richer editor is needed) | Quick to build; instructors comfortable with LaTeX can write fast. |
| **Video** | **Google Drive embed** (MVP) behind a `videoProvider` abstraction | As requested; can be swapped later without a data migration. |
| **Email** | **Resend** | Login codes, deadline reminders. |
| **Hosting** | **Vercel** (frontend) + **Convex Cloud** (backend) | Zero-ops, free tiers, preview deployments. Custom domain supported. |
| **Quality/CI** | GitHub Actions, Vitest (unit), Playwright (E2E), Sentry (errors) | Catch regressions, especially in grading logic and deadline enforcement. |

### 9.2 Alternative stack (if you prefer SQL / Azure)

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind + shadcn/ui (same) |
| API | Next.js route handlers / Node.js **or** FastAPI |
| Database | PostgreSQL (Neon or Azure Database for PostgreSQL) with Drizzle or Prisma |
| Auth | Auth.js (credentials or email OTP), JWT in httpOnly cookies |
| Jobs | Vercel Cron / Azure Functions timer triggers |
| Files | Azure Blob Storage / S3 |

**Trade-off:** more control, relational reporting, and Azure alignment — but you must build real-time updates, scheduled jobs and file handling yourself. For a one-student MVP, the Convex path is meaningfully faster.

### 9.3 Login approach — decision needed
- **Option A (recommended): email one-time code.** No passwords to manage; admin just adds the student's email.
- **Option B: admin-issued password.** Works even if the student's email is unreliable; admin must reset passwords when forgotten.

### 9.4 Google Drive video embedding — what to know

**How it works:** the admin pastes a Drive share link; the system extracts the file ID and renders an `<iframe>` with `https://drive.google.com/file/d/<FILE_ID>/preview`.

**Constraints to be aware of:**
1. **Sharing permission.** For the embed to play for the student without hitting a Google sign-in wall, the file usually needs *"Anyone with the link – Viewer"*. That means anyone who obtains the link (it is visible in the page source) can watch the video outside the app. Restricting to specific Google accounts is safer but forces the student to be logged into that exact Google account in the browser.
2. **Processing delay.** Freshly uploaded videos show "processing" for a while; the admin should test playback before publishing (the *Preview as student* feature helps).
3. **No watch analytics.** The Drive iframe doesn't expose play progress, so "completed" is a manual mark by the student in v1.
4. **UI quirks.** Drive shows its own pop-out / open-in-Drive control in the player, and playback quotas/throttling can occasionally kick in on heavy viewing.
5. **Quality control.** Drive re-encodes videos; very long recordings may take longer to become watchable at higher resolutions.

**Upgrade path (P2):** the `videoProvider` field allows moving to **YouTube (unlisted)**, **Bunny Stream**, **Cloudflare Stream** or **Mux** — these give signed/private playback, watch-progress tracking and better player control. Only the player component and the admin "add video" form change; the rest of the app stays the same.

**Recommendation:** ship v1 with Drive as planned; revisit if privacy or progress tracking becomes important.

---

## 10. High-level architecture

```
        Student / Admin browser
                 │
        Next.js app (Vercel)
        ├─ Student UI  (courses, sidebar, player, attempt screen)
        └─ Admin UI    (content, questions, deadlines, grading)
                 │  real-time queries & mutations
        Convex backend
        ├─ Auth + role checks on every function
        ├─ Course / Session / Assignment / Attempt logic
        ├─ Auto-grader (server-side, answers never sent to client)
        ├─ Scheduled jobs: deadline reminders, auto-submit at deadline
        └─ File storage (notes, solution images, uploads)
                 │
        External: Google Drive (video iframe) · Resend (email)
```

Security-critical logic (deadline checks, grading, answer visibility) lives **only on the server**.

---

## 11. Milestones (solo developer, part-time estimate)

| Phase | Scope | Duration |
|---|---|---|
| **0 – Setup** | Repo, CI, Convex + Vercel projects, design tokens, data model, auth (admin-created users, email code) | 2–3 days |
| **1 – Content MVP** *(can go live before assignments are ready)* | Roles, enrollments, My Courses, Course page (sidebar + accordions), Drive embed, session progress, admin CRUD for course/weeks/sessions, "View as student" | ~1 week |
| **2 – Assignments** | Question types, authoring UI with LaTeX preview, PA and GA attempt flow (unlimited attempts, attempt history, scoring policy), autosave, auto-grading, results screens | ~1.5–2 weeks |
| **3 – Deadlines and grading** | Due dates, per-student extensions, bulk shift, late policy, reminder emails, attempts review and score override, result release controls | ~1 week |
| **4 – Polish and launch** | Responsive QA, accessibility pass, error tracking, backups, seed real course content, dry run with the student | 3–5 days |

**Tip:** release Phase 1 first so the student can start watching recordings while assignments are still being built.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Drive embed blocked, slow or "processing" | Student can't watch | Preview before publish; "Open in Drive" fallback link; provider abstraction to move to another host. |
| Drive link is public-by-link | Content can be shared | Accept for v1 or move to a private video host; do not put sensitive material in videos. |
| Auto-grading rejects a correct calculus answer (form mismatch) | Frustration, unfair scores | Numeric-sampling equivalence, tolerance settings, admin score override, "report a problem with this question". |
| Deadline enforced only client-side | Cheating / disputes | Enforce on server; store all timestamps in UTC; audit log for changes. |
| Answers leaked to the client | Integrity | Never send correct answers/solutions until released; grade on the server. |
| Scope creep | Delays | Stick to P0 for MVP; P1/P2 go in the backlog. |
| Lost work during an attempt | Trust | Autosave + resume attempt. |
| Unlimited GA attempts turn into guess-and-check | Inflated grades | Default to score-only feedback until the deadline; shuffle questions/options; randomised parameters later (P2); choose the scoring policy deliberately. |

---

## 13. Decisions and open questions

### Decided
- **Attempts:** students can attempt assignments any number of times within the deadline (PA and GA).

### Please confirm
1. **Which attempt counts** for the GA grade: best (proposed default), latest, or average?
2. **Feedback on GA attempts:** score only, score + per-question correctness, or full solutions? Proposed default: score only until the deadline, then full solutions.
3. **Late policy:** after the deadline, are attempts blocked (strict), allowed with a penalty until a hard cutoff, or left open?
4. **Video privacy:** is "Anyone with the link" acceptable for the Drive videos, or should we move to a private host from the start?
5. **Login:** email one-time code or admin-issued password?
6. **Week unlocking:** should all 8 weeks be open from day one, or unlock on schedule?
7. **Practice assignments:** should they count for anything (e.g., completion tracking), or purely self-practice?
8. **Handwritten work:** do you want students to upload photos of written solutions for some questions (needs manual grading)?
9. **Prerequisites section:** videos and notes only, or also a diagnostic quiz?
10. **Future scope:** is this strictly one student, or could more students/courses be added later?

---

## 14. Future enhancements (backlog)

- Private video hosting with watch-progress tracking and resume playback
- Question bank with topic tags and adaptive practice
- Timestamped chapters and searchable transcripts for each session
- Doubt/comment thread per session and assignment
- Weekly progress report emailed to the student (and optionally a parent/guardian)
- Certificates of completion
- WhatsApp/Telegram reminders
- Multi-course catalogue and multiple instructors

---

## 15. Appendix A — Sample week (content plan)

| Item | Type | Notes |
|---|---|---|
| Week 2 · Session 1 | Video | Recorded live class (Drive link) |
| Week 2 · Session 2 | Video | Recorded live class (Drive link) |
| Week 2 · Practice Assignment | PA | 10 questions, unlimited attempts, worked solutions |
| Week 2 · Graded Assignment | GA | 8 questions, unlimited attempts until Sunday 11:59 PM IST, best attempt counts, solutions after the deadline |

---

## 16. Appendix B — Routes, schema sketch and implementation notes

This appendix is written so the PRD can be dropped into an IDE / coding agent and used directly as a build brief.

### 16.1 Routes

| Route | Who | Purpose |
|---|---|---|
| `/login` | Public | Email one-time-code login (no signup link anywhere) |
| `/courses` | Student | My Courses |
| `/courses/[courseId]` | Student | Course page (sidebar + content pane); opens last viewed item |
| `/courses/[courseId]/session/[sessionId]` | Student | Session video |
| `/courses/[courseId]/assignment/[assignmentId]` | Student | Assignment overview, deadline, attempt history, start attempt |
| `/courses/[courseId]/assignment/[assignmentId]/attempt/[attemptId]` | Student | Attempt screen and results |
| `/admin` | Admin | Dashboard |
| `/admin/students` | Admin | Students and enrollments |
| `/admin/courses/[courseId]` | Admin | Course structure, sections, sessions, Drive links |
| `/admin/courses/[courseId]/assignments/[assignmentId]` | Admin | Question editor, deadline / attempt / feedback settings |
| `/admin/courses/[courseId]/assignments/[assignmentId]/attempts` | Admin | All attempts, manual grading, score overrides, extensions |

### 16.2 Convex schema sketch

```ts
// convex/schema.ts (sketch). Extend the users table created by Convex Auth
// with: role ("admin" | "student"), status, timezone.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  courses: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
  }),

  enrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("by_user", ["userId"]).index("by_course", ["courseId"]),

  sections: defineTable({
    courseId: v.id("courses"),
    title: v.string(),                 // "Prerequisites", "Week 1" ...
    type: v.union(v.literal("prerequisites"), v.literal("week")),
    order: v.number(),
    unlockAt: v.optional(v.number()),  // UTC ms
    isHidden: v.boolean(),
  }).index("by_course", ["courseId", "order"]),

  sessions: defineTable({
    sectionId: v.id("sections"),
    title: v.string(),
    description: v.optional(v.string()),
    videoProvider: v.literal("gdrive"), // widen later: youtube, bunny, mux
    videoRef: v.string(),               // Drive file ID
    order: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
  }).index("by_section", ["sectionId", "order"]),

  sessionProgress: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    completed: v.boolean(),
    lastViewedAt: v.number(),
  }).index("by_user_session", ["userId", "sessionId"]),

  assignments: defineTable({
    sectionId: v.id("sections"),
    kind: v.union(v.literal("practice"), v.literal("graded")),
    title: v.string(),
    instructions: v.optional(v.string()),
    opensAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),   // undefined = unlimited (default)
    scoringPolicy: v.union(v.literal("best"), v.literal("latest"), v.literal("average")),
    feedbackMode: v.union(v.literal("score_only"), v.literal("per_question"), v.literal("full")),
    solutionsRelease: v.union(v.literal("immediate"), v.literal("after_deadline"), v.literal("manual")),
    timeLimitMin: v.optional(v.number()),
    latePolicy: v.union(v.literal("strict"), v.literal("grace"), v.literal("open")),
    status: v.union(v.literal("draft"), v.literal("published")),
  }).index("by_section", ["sectionId"]),

  questions: defineTable({
    assignmentId: v.id("assignments"),
    type: v.union(
      v.literal("mcq_single"), v.literal("mcq_multi"), v.literal("numeric"),
      v.literal("expression"), v.literal("short_text"), v.literal("file"),
    ),
    body: v.string(),                    // Markdown + LaTeX
    options: v.optional(v.array(v.object({ id: v.string(), text: v.string() }))),
    answerSpec: v.any(),                 // per type; never sent to students before release
    marks: v.number(),
    hint: v.optional(v.string()),
    solution: v.optional(v.string()),
    order: v.number(),
  }).index("by_assignment", ["assignmentId", "order"]),

  deadlineOverrides: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    dueAt: v.number(),
    reason: v.optional(v.string()),
  }).index("by_assignment_user", ["assignmentId", "userId"]),

  attempts: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    attemptNo: v.number(),
    status: v.union(
      v.literal("in_progress"), v.literal("submitted"),
      v.literal("needs_review"), v.literal("graded"),
    ),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    isLate: v.boolean(),
    answers: v.array(v.object({          // embedded for simplicity
      questionId: v.id("questions"),
      response: v.any(),
      isCorrect: v.optional(v.boolean()),
      marksAwarded: v.optional(v.number()),
      feedback: v.optional(v.string()),
    })),
  }).index("by_user_assignment", ["userId", "assignmentId"]),
});
```

The **Grade** for a student on an assignment is not a table: it is computed by a query from that student's attempts using the assignment's `scoringPolicy` (best / latest / average) and cached only if needed for the gradebook.

### 16.3 Implementation notes

- **Server-side only:** every Convex function checks the caller's role and, for students, their enrollment. Deadline, attempt-limit, grading and visibility rules live only in Convex functions, never in the browser.
- **Effective deadline** = `deadlineOverrides.dueAt` for that student if present, otherwise `assignments.dueAt`. All times are UTC milliseconds; the UI formats them in `Asia/Kolkata` (or the user's timezone).
- **Starting an attempt:** reject if the deadline has passed (and the late policy is `strict`), if `maxAttempts` is set and reached, or if another attempt is already `in_progress` (return that one so it can be resumed).
- **Deadline job:** a scheduled function at the effective deadline auto-submits any `in_progress` attempt. Reminder emails go out ahead of the deadline via Resend.
- **Answer secrecy:** student-facing queries must omit `answerSpec` and `solution` unless the feedback policy allows it (PA after attempt; GA per `feedbackMode` and `solutionsRelease`).
- **Drive links:** extract the file ID from URLs of the form `/file/d/<id>/...` or `?id=<id>`; embed with `https://drive.google.com/file/d/<id>/preview` in an `<iframe>`.
- **Expression answers:** sample about 10 random values of the variable in the allowed range, evaluate student and reference expressions with mathjs, skip points where either is NaN/Infinity, and treat as correct if all remaining points agree within a relative tolerance (about 1e-6, configurable).
- **Math rendering:** KaTeX for display; sanitise Markdown (no raw HTML). MathLive for student input.
- **Testing priorities:** unit tests for the grader and the effective-deadline logic; E2E tests for login, opening a course, watching a session, and completing PA/GA attempts.
