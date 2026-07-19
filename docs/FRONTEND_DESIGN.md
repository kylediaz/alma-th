# Frontend design

Product UI for Alma lead intake: a public prospect form and an attorney console. Stack is Next.js App Router + shadcn/ui. Visual tone stays neutral and utilitarian.

Companion system design: [DESIGN.md](./DESIGN.md).

## Surfaces

| Surface        | Route                            | Who      | Purpose |
| -------------- | -------------------------------- | -------- | ------- |
| Landing page   | `/`                              | Prospect | Blank placeholder |
| Lead form      | `/get-started`                   | Prospect | Name, email, resume → create lead |
| Attorney login | `/admin/login`                   | Attorney | Username/password → session cookie |
| Leads table    | `/admin/dashboard/leads`         | Attorney | Paginated list + status filter |
| Lead detail    | `/admin/dashboard/leads/[id]`    | Attorney | Fields, mark reached out, resume preview |

No public signup. Attorney accounts are seeded out-of-band (`backend/scripts/dev_seed.py`).

## Routing map

```
/                              → blank landing
/get-started                   → public lead form (no auth)
/admin/login                   → login form
/admin/dashboard/leads         → protected table; unauthenticated → /admin/login
/admin/dashboard/leads/[id]    → protected detail; unauthenticated → /admin/login
```

Dashboard routes mount inside `DashboardShell`, which calls `GET /auth/me` and redirects to `/admin/login` on 401.

## Auth & API access

FastAPI owns sessions:

- `POST /auth/login` → `Set-Cookie` (`session_id`, HTTP-only)
- `POST /auth/logout` → delete session + clear cookie
- `GET /auth/me` → current attorney (401 if missing/expired)

The browser calls FastAPI at `NEXT_PUBLIC_API_URL` with `credentials: "include"`. No Next.js route-handler proxy. Backend CORS allows `http://localhost:3000` with credentials (see root `.env.example` `CORS_ORIGINS`).

Login success → navigate to `/admin/dashboard/leads`. Logout → `POST /auth/logout` → `/admin/login`.

## Public form (`/get-started`)

| Field      | Control | Rules (mirror backend) |
| ---------- | ------- | ---------------------- |
| First name | text    | required, max 100 |
| Last name  | text    | required, max 100 |
| Email      | email   | required, valid email, max 320 |
| Resume     | file    | required; `.pdf` / `.docx`; client hint max **5MB** |

**Submit:** `POST /leads` as `multipart/form-data` (`first_name`, `last_name`, `email`, `resume`).

**Success:** replace the form with a confirmation view (`role="status"`, `aria-live="polite"`). Do not require login.

**Error:** show API `detail` when present. Client-side checks for empty fields, bad extension, and size run before upload.

## Attorney console

### Shell

- Sidebar product label (Alma) + Leads nav
- Account menu with logout
- Auth gate via `useMe` / `GET /auth/me`

### Leads table (`/admin/dashboard/leads`)

| Column   | Source |
| -------- | ------ |
| Received | `created_at` (locale datetime) |
| Name     | `first_name` + `last_name` |
| Email    | `email` |
| Status   | `PENDING` \| `REACHED_OUT` (badge) |

Row click → `/admin/dashboard/leads/{id}`.

**Pagination / filter** — offset pagination via URL search params (`nuqs`):

| Param    | Meaning            | Default | Notes |
| -------- | ------------------ | ------- | ----- |
| `page`   | 1-based page index | `1`     | |
| `status` | optional filter    | omitted | `PENDING` \| `REACHED_OUT` |

Page size is fixed at **50** in the client. List data uses TanStack Query (`leadKeys.list({ page, page_size, status })`).

```
GET /leads?page=1&page_size=50&status=PENDING
→ { items: Lead[], total, page, page_size }
```

Empty / loading / error states are handled in the table UI (retry on failure).

### Lead detail (`/admin/dashboard/leads/[id]`)

- Load via `GET /leads/{id}` (includes short-lived `resume_url`).
- Show status, email, received time, resume filename.
- **Mark reached out** — `PATCH /leads/{id}` with `{ "status": "REACHED_OUT" }` when status is `PENDING`; hide once reached out. Idempotent if already `REACHED_OUT`.
- **Resume**
  - PDF: in-browser viewer (`@embedpdf/*`) using `resume_url`.
  - DOCX (and non-PDF): download link via `resume_url` (no in-browser preview).

## State & data fetching

Client components + `fetch` to FastAPI through `frontend/src/lib/api-client.ts` and feature API modules.

- Feature folders: `features/auth`, `features/leads` (types, api, hooks, components).
- TanStack Query for server state; React Compiler enabled.
- Providers: `AppProviders` wraps QueryClient + `NuqsAdapter`.

## Env vars

| Variable              | Example                 | Notes |
| --------------------- | ----------------------- | ----- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI origin; no trailing slash |

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Resume max size is a client constant matching the backend default (5MB); backend remains authoritative.

## File layout

```
frontend/src/
  app/
    layout.tsx
    page.tsx                         # blank landing
    get-started/page.tsx             # public form
    admin/
      login/page.tsx
      dashboard/
        layout.tsx                   # DashboardShell
        leads/page.tsx               # table + URL params
        leads/[id]/page.tsx         # detail + resume
        leads/columns.tsx
  components/
    app-providers.tsx
    dashboard-shell.tsx
    data-table.tsx
    ui/                              # shadcn primitives
  features/
    auth/
      api/auth.api.ts
      hooks/
      types/
    leads/
      api/leads.api.ts
      components/resume-pdf-viewer.tsx
      hooks/
      types/
  lib/
    api-client.ts
    utils.ts
```

## Out of scope (frontend v1)

- Lead assignment / ownership UI
- Extra statuses beyond `PENDING` / `REACHED_OUT`
- Duplicate-email warnings
- In-browser DOCX rendering
- Public attorney signup or password reset
- Search / sorting controls
- Next.js middleware cookie gate (API cookie is not on the Next host)
- Server Actions / BFF proxy
- Email delivery status in the console
