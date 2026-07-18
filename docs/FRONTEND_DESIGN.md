# Frontend design

Product UI for Alma lead intake: a public prospect form and an attorney console. Stack is Next.js App Router + existing shadcn/ui. Visual tone stays neutral and utilitarian (no marketing hero, no purple SaaS theme).

Companion system design: [DESIGN.md](./DESIGN.md).

## Surfaces


| Surface        | Route                      | Who      | Purpose                                         |
| -------------- | -------------------------- | -------- | ----------------------------------------------- |
| Landing page   | `/`                        | Prospect | Generic lander. Leave blank.                    |
| Lead form      | `/get-started`             | Prospect | Name, email, resume → create lead               |
| Attorney login | `/admin/login`             | Attorney | Username/password → session cookie              |
| Leads table    | `/admin/dashboard/leads`   | Attorney | List leads, download resume, mark `REACHED_OUT` |


No public signup. Attorney accounts are seeded out-of-band (`backend/scripts/dev_seed.py`).

## Routing map

```
/                        → blank landing (placeholder)
/get-started             → public LeadForm (no auth)
/admin/login             → LoginForm; if already authed, redirect to /admin/dashboard/leads
/admin/dashboard/leads   → protected console; if unauthenticated, redirect to /admin/login
```

Deep links and bookmarks to `/admin/dashboard/leads` always go through an auth check (`GET /auth/me`).

## Auth & API access

### Session cookie

FastAPI owns sessions:

- `POST /auth/login` → `Set-Cookie` (`session_id`, HTTP-only)
- `POST /auth/logout` → delete session + clear cookie
- `GET /auth/me` → current attorney (401 if missing/expired)

### How Next talks to the API

**Preferred:** browser calls FastAPI directly at `NEXT_PUBLIC_API_URL` with `credentials: "include"`.

- Backend already enables CORS for `http://localhost:3000` with `allow_credentials=True` (see root `.env.example` `CORS_ORIGINS`).
- No Next.js route-handler proxy in v1 unless cookie/CORS friction appears later.
- All authenticated fetches (and resume download) use `credentials: "include"` so the API cookie is sent cross-port on localhost.

### Protecting `/admin/dashboard/leads`

Client page mounts → `GET /auth/me`:

- 200 → render console (store `display_name` for header)
- 401 → `router.replace("/admin/login")`

Login success → navigate to `/admin/dashboard/leads`. Logout → `POST /auth/logout` → navigate to `/admin/login`.

## Public form UX (`/get-started`)

**Fields**


| Field      | Control | Rules (mirror backend)                                                                |
| ---------- | ------- | ------------------------------------------------------------------------------------- |
| First name | text    | required, max 100                                                                     |
| Last name  | text    | required, max 100                                                                     |
| Email      | email   | required, valid email, max 320                                                        |
| Resume     | file    | required; `.pdf` / `.docx` only; client hint max **5MB** (`RESUME_MAX_BYTES` default) |


**Submit:** `POST /leads` as `multipart/form-data` (`first_name`, `last_name`, `email`, `resume`).

**Success:** inline confirmation (lead created). Clear or disable the form; do not require login.

**Error:** show API `detail` (string or validation message). Client-side checks for empty fields, bad extension, and size run before upload.

**Footer/link:** discreet “Attorney login” → `/admin/login`.

## Attorney console (`/admin/dashboard/leads`)

### Header

- Product label (Alma)
- Greeting with `display_name`
- Logout button

### Table columns


| Column    | Source                            |
| --------- | --------------------------------- |
| Submitted | `created_at` (locale datetime)    |
| Name      | `first_name` + `last_name`        |
| Email     | `email`                           |
| Status    | `PENDING` \| `REACHED_OUT` (badge) |
| Resume    | filename link/button              |
| Actions   | “Mark reached out” when `PENDING` |


Newest first (API already sorts `created_at DESC`).

### Pagination

Leads use **offset pagination** via URL search params (bookmarkable, browser Back/Forward friendly).

| Param       | Meaning            | Default | Notes                         |
| ----------- | ------------------ | ------- | ----------------------------- |
| `page`      | 1-based page index | `1`     |                               |
| `page_size` | items per page     | `20`    | Allowlist: 10 / 20 / 50       |
| `status`    | optional filter    | omitted | `PENDING` \| `REACHED_OUT`    |

Example: `/admin/dashboard/leads?page=2&page_size=20&status=PENDING`

URL state is managed with **nuqs**; list data with **TanStack Query** (`queryKey: ["leads", page, page_size, status]`). TanStack Table owns pagination UI state synced to the URL.

**API:**

```
GET /leads?page=1&page_size=20&status=PENDING
→ { items: LeadOut[], total: number, page: number, page_size: number }
```

### Actions

1. **Resume** — `GET /leads/{id}/resume` with credentials; download via blob + filename (from `Content-Disposition` or `resume_original_filename`). Do not rely on bare `window.open` alone for cookie reliability.
   - **Follow-up:** in-browser PDF viewer with [`react-pdf`](https://projects.wojtekmaj.pl/react-pdf/); DOCX stays download-only.
2. **Mark reached out** — `PATCH /leads/{id}` with `{ "status": "REACHED_OUT" }`; update row in place; disable/hide action once reached out. Idempotent if already `REACHED_OUT`.

Empty state: short message when the list is empty.

Loading / error: skeleton or simple loading text; retry-friendly error if list fetch fails.

## State & data fetching

**Approach: client components +** `fetch` **to FastAPI.**

Rationale:

- Session cookie is set by the API origin; browser `credentials: "include"` is the natural fit.
- Avoids duplicating auth/proxy logic in Next route handlers for a takehome.
- Keeps pages easy to follow: form/login/leads each own their loading and error UI.

Shared helpers live in `frontend/src/lib/api.ts` (base URL, JSON/multipart helpers, typed errors). No global state library. React Compiler is already enabled — no ad-hoc `useMemo`/`useCallback` unless needed.

## Env vars


| Variable              | Example                 | Notes                             |
| --------------------- | ----------------------- | --------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI origin; no trailing slash |


Frontend does not read server-only secrets. Resume max size is a client constant matching the backend default (5MB); backend remains authoritative.

Copy for local frontend:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Ensure API `CORS_ORIGINS` includes the Next origin (default `http://localhost:3000`).

## Component / file layout (target)

```
frontend/src/
  app/
    layout.tsx                       # shell, metadata
    page.tsx                         # blank landing
    get-started/page.tsx             # public LeadForm
    admin/
      login/page.tsx                 # login form (inlined, "use client")
      dashboard/
        leads/page.tsx               # leads DataTable + page URL params (nuqs + React Query)
  components/
    data-table.tsx                   # TanStack table + pagination controls
    app-providers.tsx                # QueryClient + NuqsAdapter
    lead-form.tsx
    resume-viewer.tsx                # follow-up: react-pdf (PDF) / download (DOCX)
    site-header.tsx
    dashboard-shell.tsx
  lib/
    api.ts                           # fetch wrappers + credentials
    types.ts
    constants.ts                     # resume extensions, max bytes
```

UI primitives: existing shadcn (`Button`, `Input`, `Label`/`Field`, `Table`, `Badge`, `Alert`, `Dialog`/`Sheet`, `Card` as needed for form/login/viewer containers only).

Dependencies: `@tanstack/react-table`, `@tanstack/react-query`, `nuqs`. `react-pdf` for in-browser resume view (follow-up).

## Suggested build order

1. `lib/api.ts` + `types.ts` + `constants.ts` + env (`NEXT_PUBLIC_API_URL`)
2. Blank `/` + `/get-started` form
3. `/admin/login` + auth redirect helpers
4. `/admin/dashboard/leads` DataTable + page URL pagination + status filter
5. `resume-viewer` with `react-pdf` (PDF view + DOCX download fallback)
6. Wire footer/header links and empty/loading/error states

## Out of scope (frontend v1)

- Lead assignment / ownership UI
- Extra statuses beyond `PENDING` / `REACHED_OUT`
- Duplicate-email warnings
- In-browser DOCX rendering (PDF via react-pdf only); virus scan messaging
- Public attorney signup or password reset
- Filters, search, sorting controls (pagination is in scope)
- Dark-mode product theming beyond default tokens
- Next.js middleware cookie gate (API cookie is not on the Next host)
- Server Actions / BFF proxy (unless later required)
- Email delivery status in the console
