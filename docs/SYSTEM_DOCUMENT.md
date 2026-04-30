# System Document — Local Development Plan Management System

> **Document Type:** Combined Software Requirements Specification (SRS) + System Design Document (SDD)
> **Target Audience:** AI development agents analyzing, maintaining, and extending this codebase
> **Version:** 5.0
> **Date:** 2026-04-30
> **Repository Root:** `C:\Users\PC\Documents\Projects\Five-Year Local Development Strategy`
> **Production URL:** `https://five-year-local-dev-strategy.vercel.app`
> **Repository:** `https://github.com/poppatompong-dev/Five-Year-Local-Dev-Strategy`

---

## 0. How to Use This Document (for AI Agents)

This document is the single source of truth for the system's intent, structure, and constraints. Before making any change, an agent should:

1. Read Section 1 (Context) to understand the domain and why the system exists.
2. Read Section 3 (Requirements) to understand what the system must do.
3. Read Section 4–7 (Architecture / Data / UI) to locate the code surface being touched.
4. Read Section 9 (Implementation Status) to distinguish "planned" from "shipped."
5. Read Section 11 (Extension Points) before adding new capabilities.

File paths are given as absolute Windows paths. All code-level facts (type shapes, filenames, routes) are grounded in the current source tree and should be treated as authoritative until a subsequent diff contradicts them.

---

## 1. Context and Background

### 1.1 Domain

The system replaces an Excel-based workflow used by Thai local government units (specifically Nakhon Sawan Municipality, `เทศบาลนครนครสวรรค์`) to manage their five-year Local Development Plan (`แผนพัฒนาท้องถิ่น`) covering fiscal years **2566–2570 (B.E.)** — equivalent to 2023–2027 (C.E.).

A Local Development Plan is a hierarchical, multi-year planning artifact mandated for Thai local administrative organizations. It records every project the municipality intends to fund, the strategic objective it supports, the department responsible, and the budget allocated per year.

### 1.2 Source of Truth (today)

The current authoritative data lives in Excel workbooks with multiple sheets representing different views of the same plan: overall summary, plans categorized by strategic direction, equipment procurement (`บัญชีครุภัณฑ์`), and community-specific plans. These sheets are denormalized, manually cross-referenced, and fragile.

### 1.3 Problem Statement

Excel-based planning has three failure modes this system must address:

- **Consistency drift** — the same project appears on multiple sheets with divergent spellings, budgets, or responsible departments.
- **Aggregation cost** — reporting budget-by-year, budget-by-strategy, or budget-by-department requires manual rework every cycle.
- **Accessibility** — non-technical officers cannot query the plan without opening the file and scrolling; there is no read-optimized view for executives.

### 1.4 System Goal

Provide a structured, scalable, user-friendly web application that:

- Normalizes the Strategy → Tactic → Plan → Project hierarchy into a structured data layer.
- Supports multi-year budgeting as first-class data.
- Ingests the existing Excel artifacts without requiring schema rework upstream.
- Serves dashboards and filtered project lists to non-technical users.

---

## 2. Glossary

| Term | Thai | Meaning in this system |
|---|---|---|
| Strategy | ยุทธศาสตร์ | Top-level strategic pillar (6 in the mock data). |
| Tactic | แนวทาง / กลยุทธ์ | Sub-direction under a strategy, identified by a code (e.g., `1.1`). |
| Plan | แผนงาน | A grouping of related projects under a tactic. |
| Project | โครงการ | The atomic unit of funding and accountability. |
| Budget | งบประมาณ | A monetary amount for a project in a specific fiscal year. |
| Equipment | ครุภัณฑ์ | Capital procurement items tracked on a separate sheet. |
| Fiscal Year | ปีงบประมาณ | Thai budget year (B.E.). The system uses years 2566–2570 as integers. |
| Department | หน่วยงานรับผิดชอบ | The internal municipal unit accountable for a project. |

---

## 3. Software Requirements Specification (SRS)

### 3.1 Stakeholders and User Roles

The app implements a **two-tier access model**:

- **Public visitors** (no login) — read-only access to dashboard, projects, equipment.
- **Admins** (login required) — full CRUD plus import, audit log, user management.

There is no Neon Auth / Better Auth dependency anymore. Auth is custom session-cookie-based against an `admin_users` table (bcrypt-hashed passwords).

| Role | Description | Primary use cases |
|---|---|---|
| Public visitor | Anyone with the URL | View dashboard, browse projects, read equipment list |
| Admin (`pop`, `pok`) | Authenticated municipal officer | All public + create/edit/delete projects, bulk status update, import Excel, audit log |

### 3.2 Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-01 | System SHALL display an overview dashboard showing total projects, total budget, budget-by-year, budget-by-strategy, status breakdown, strategy progress, radar chart, top 10 departments, and a sortable project table. | ✅ Implemented |
| FR-02 | System SHALL list all projects with pagination (default 12/page) and filters for search text, strategy, plan, department, status, and year. | ✅ Implemented |
| FR-03 | System SHALL show a single-project detail view including hierarchy path, objective, target, KPI, expected result, department, and per-year budget. | ✅ Implemented |
| FR-04 | System SHALL allow changing a project's status to one of: `not_set`, `planning`, `in_progress`, `completed`, `cancelled`. | ✅ Implemented — admin-only, persisted via `serverPatchProjectStatus` |
| FR-04b | System SHALL allow admins to bulk-update status for multiple selected projects at once. | ✅ Implemented — `serverBulkPatchProjectStatus` + checkbox toolbar on `/projects` |
| FR-05 | System SHALL list equipment items with pagination and search. | ✅ Implemented — live from Neon DB |
| FR-06 | System SHALL accept an `.xlsx` file upload and display import confirmation UI. | ✅ UI only — no backend wired |
| FR-07 | System SHALL provide reference data (strategies, tactics, plans, departments) for filter dropdowns. | ✅ Implemented (static from mock-data; DB data used at runtime) |
| FR-08 | System SHOULD support full project CRUD (create, edit, delete) through UI forms. | ✅ Implemented — admin-only, all dialogs wired to server functions |
| FR-09 | System SHOULD support editing strategies, tactics, and plans through UI. | ❌ Missing |
| FR-10 | System SHOULD support editing per-year budget rows directly on the project detail page. | ✅ Implemented — `BudgetPanel` with admin-only edit |
| FR-11 | System SHOULD provide Excel export of filtered project lists and dashboard data. | ✅ Implemented — `src/lib/export.ts` |
| FR-12 | System SHOULD support user authentication. | ✅ Implemented — custom `admin_users` table, bcrypt + sealed session cookies via `useSession()`. Public read-only / admin-CRUD split. |
| FR-13 | System SHOULD provide an audit trail for all mutations (who changed what, when). | ✅ Implemented — `audit_events` table + `serverLogAudit` wrapper, viewable at `/admin/audit` |
| FR-14 | System SHOULD support multi-sheet import that respects the Strategy/Tactic/Plan hierarchy from source workbook structure. | ✅ Implemented in `scripts/import-projects.cjs` (CLI only — UI upload handler still stub) |
| FR-15 | System SHOULD persist data mutations to a durable backend (database). | ✅ Implemented — Neon PostgreSQL via `@neondatabase/serverless` driver inside server functions |
| FR-16 | System SHALL provide an admin user management page. | ✅ Page exists at `/admin/users` (admin-only menu); user CRUD currently returns stubs since Better Auth was removed — re-implementation against `admin_users` table planned for v5.1. |
| FR-17 | Public visitors SHALL NOT see admin-only menu items (Import, Users, Audit) or CRUD buttons (Add/Edit/Delete). | ✅ Implemented — `useAuth()` gates visibility throughout `AppLayout` and route components |
| FR-18 | Database credentials SHALL NEVER be present in client-side JavaScript bundles. | ✅ Implemented — all SQL runs in `createServerFn` handlers; `DATABASE_URL` (no `VITE_` prefix) is server-only |

### 3.3 Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Usability | UI SHALL use Thai labels for all user-facing text. Non-technical officers are the primary users. |
| NFR-02 | Usability | Dashboards SHALL be readable at 1366×768 and above. |
| NFR-03 | Performance | Dashboard rendering SHALL be perceptible as instant for the current mock-data scale (248 projects). |
| NFR-04 | Portability | The system SHALL run on a single machine with Node.js ≥18 installed; no external service required. |
| NFR-09 | UX | UI SHALL include micro-animations, tooltips, hover cards, and toast notifications to communicate state changes clearly to non-technical users. |
| NFR-10 | UX | Interactive charts SHALL filter the project table immediately on click, with visible active state and a dismissible filter chip. |
| NFR-05 | Data integrity | The Strategy → Tactic → Plan → Project hierarchy MUST be enforced in the data layer. |
| NFR-06 | Scalability | The data model SHALL accommodate additional fiscal years without restructuring the `Project.budgets` map. |
| NFR-07 | Localization | Numbers SHALL be formatted with Thai locale (`th-TH`) via `formatBaht()`. |
| NFR-08 | Font | The app uses **IBM Plex Sans Thai** loaded from Google Fonts for consistent Thai rendering. |

### 3.4 Out of Scope (MVP)

- Multi-tenancy (multiple municipalities in one instance)
- Approval workflows (draft → review → approved)
- Public-facing citizen portal
- Mobile-native applications
- Real-time collaboration / WebSocket updates
- Budget disbursement tracking (actual vs. planned)

---

## 4. System Architecture

### 4.1 High-Level Topology (current — live backend)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│  React 19 · TanStack Router · TanStack Start · Vite 7           │
│  TailwindCSS 4 · shadcn/ui · recharts · Lucide icons            │
│  TanStack Query                                                  │
│  Production: https://five-year-local-dev-strategy.vercel.app    │
│  Local dev:  http://localhost:8080                               │
└─────────────────────────────────────────────────────────────────┘
         │
         │ POST /_serverFn/{hash}  (TanStack Start RPC)
         │ Cookie: admin_session=<sealed>
         ▼
┌─────────────────────────────────────────────────────────────────┐
│             Vercel Serverless Function (api/server.js)           │
│  Wraps the TanStack Start H3 server bundle in dist/server/      │
│  Routes /_serverFn/* to createServerFn handlers                 │
│  Env: DATABASE_URL, SESSION_PASSWORD                             │
└─────────────────────────────────────────────────────────────────┘
         │
         │ SQL via @neondatabase/serverless (HTTP fetch)
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Neon PostgreSQL (neondb)                       │
│      Pooler endpoint: ep-plain-darkness-ao06zq83-pooler          │
│      Region: ap-southeast-1                                      │
│      Tables: admin_users, strategies, tactics, plans, projects,  │
│        project_budgets, project_annotations, equipment,          │
│        departments, audit_events, sheet_metadata, …              │
└──────────────────────────────────────────────────────────────────┘
```

There is **no PostgREST / Neon Data API** layer anymore — all SQL runs server-side via the Neon serverless driver. Auth is local to this app (no Neon Auth / Better Auth). The browser never sees a database connection string.

### 4.3 Technology Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | ≥18 | |
| Framework | TanStack Start | ^1.167 | File-based routing via `@tanstack/react-router`; `createServerFn` for RPC |
| Build tool | Vite | ^7.3 | Config via `@lovable.dev/vite-tanstack-config` |
| UI framework | React | ^19.2 | |
| Styling | TailwindCSS | ^4.2 | Via `@tailwindcss/vite` plugin |
| Component library | shadcn/ui (Radix UI) | various | 45 components under `src/components/ui/` |
| Charts | recharts | ^3.8 | Dashboard visualizations |
| Icons | Lucide React | ^0.575 | |
| Forms | react-hook-form + zod | ^7.71 / ^3.24 | Available; not yet widely used |
| State / fetch | TanStack Query | ^5 | Wired in all route pages; 5-min stale time |
| Auth | Custom (`admin_users` + bcryptjs + sealed session cookies) | — | `useSession()` from `@tanstack/react-start/server` |
| Password hashing | bcryptjs | ^3.0 | Pure-JS, runs in serverless |
| Database | Neon PostgreSQL | — | `neondb` on ap-southeast-1, pooler endpoint |
| DB driver | `@neondatabase/serverless` | ^1.1 | HTTP fetch-based; works on Vercel/edge runtimes |
| Font | IBM Plex Sans Thai | — | Loaded from Google Fonts in `__root.tsx` |
| Deployment target | Vercel | — | `vercel.json` + `api/server.js` Node serverless function wrapper |

### 4.4 Trade-offs (current state)

- **Server-only DB access.** All SQL runs inside `createServerFn` handlers. Wrapper functions in `src/lib/api.ts` (e.g. `apiGetProjects`) call the corresponding server function via TanStack Start RPC. The `@neondatabase/serverless` driver is never imported into a file that ends up in the client bundle.
- **`mock-data.ts` retained** — still exports static reference arrays (`strategies`, `tactics`, `plans`, `DEPARTMENTS`, `YEARS`, `STATUS_LABEL`, `STATUS_COLOR`, `formatBaht`) used by filter dropdowns and formatting. The generator functions are no longer called at runtime.
- **Two-tier auth.** Public visitors get read access; admins get full CRUD. `useAuth()` (TanStack Query against `serverGetSession`) gates UI. `requireAdmin()` inside server functions gates writes. Admin-only menus and CRUD buttons are hidden for public users via `isLoggedIn` checks.
- **`session.server.ts` is server-only** and must NOT be imported by any file that gets bundled for the client. TanStack Start's import-protection plugin will fail the build otherwise. `auth.ts` re-exports the public `serverLogin` / `serverLogout` / `serverGetSession` functions and is safe to import from client code.
- **`requireAdmin` throws `Response`, not `Error`.** Throwing `Error` from a server function causes Seroval (TanStack Start's serializer) to fail with `Seroval Error (step: 3)` on Vercel. `throw new Response(JSON.stringify({error}), {status:401})` serializes correctly.
- **`serverLogin` returns `{ok:true|false}` instead of throwing.** Same Seroval reason — credential errors are returned as a discriminated union, then `useAuth.login` rethrows on the client.
- **File-based routing** — TanStack Router auto-generates `src/routeTree.gen.ts`. Never hand-edit.
- **Import page** — UI exists; file upload is still a stub (no parsing/persistence). `scripts/import-projects.cjs` is a working CLI importer.
- **CORS not applicable** — there is no separate API origin; everything is same-origin via the Vercel function.

---

## 5. Data Model

### 5.1 Hierarchy

```
strategies (1) ──< (N) tactics (1) ──< (N) plans (1) ──< (N) projects
                                                              │
                                                  budgets: Record<year, amount>

equipment  (standalone — not linked to the hierarchy in current implementation)
```

### 5.2 TypeScript Types (authoritative — from `src/lib/api.ts` and `src/lib/mock-data.ts`)

#### `Status`
```ts
type Status = "not_set" | "planning" | "in_progress" | "completed" | "cancelled";
```

`not_set` is the default for newly created projects and the value all 248 imported projects were reset to in v5.0. The DB enforces this via a CHECK constraint:
```sql
ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('not_set','planning','in_progress','completed','cancelled'));
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'not_set';
```

#### `admin_users` (DB schema)
```sql
CREATE TABLE admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Seeded with `pop` and `pok` (password = username, bcrypt-hashed). The seeder uses `INSERT … ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`, so re-running it rotates the password.

#### `Project`
```ts
interface Project {
  id: number;
  name: string;
  objective: string;
  target: string;
  kpi: string;
  expected_result: string;
  department: string;
  plan_id: number;
  status: Status;
  source_sheet: string;          // e.g. "ผ.02/1"
  budgets: Record<number, number>; // year → amount in Baht
  total_budget: number;
}
```

#### `Equipment`
```ts
interface Equipment {
  id: number;
  plan_name: string;
  category: string;
  item_type: string;
  target: string;
  department: string;
  budget_2566: number;
  budget_2567: number;
  budget_2568: number;
  budget_2569: number;
  budget_2570: number;
}
```

#### Reference arrays (typed inline in `mock-data.ts`)

| Export | Shape | Count |
|---|---|---|
| `strategies` | `{ id, name, short_name, department }[]` | 6 |
| `tactics` | `{ id, code, name, strategy_id }[]` | 12 |
| `plans` | `{ id, name, tactic_id }[]` | 24 (2 per tactic) |
| `projects` | `Project[]` | 248 (generated) |
| `equipment` | `Equipment[]` | 64 (generated) |
| `YEARS` | `readonly [2566,2567,2568,2569,2570]` | — |
| `DEPARTMENTS` | `string[]` | 10 |
| `STATUS_LABEL` | `Record<Status, string>` (Thai) | — |
| `STATUS_COLOR` | `Record<Status, string>` (CSS vars) | — |

### 5.3 API Layer

The data layer has three files with strict separation of concerns:

| File | Runs on | Purpose |
|---|---|---|
| `src/lib/db.ts` | Server only | Lazy-initialised Neon SQL client. Reads `process.env.DATABASE_URL`. Exports `getSql()`. |
| `src/lib/server-fns.ts` | Server only (importable from client) | All `createServerFn` handlers — one per DB operation. Mutation handlers call `requireAdmin()` first. |
| `src/lib/api.ts` | Both | Public API surface. Each `apiXxx()` thin-wraps the corresponding `serverXxx` call so route components stay unchanged. |
| `src/lib/auth.ts` | Both | Exports `serverLogin`, `serverLogout`, `serverGetSession`. |
| `src/lib/session.server.ts` | Server only | `getServerSession()` and `requireAdmin()` helpers. Must NOT be imported from client code. |

**Read functions (public — no auth required):**

| Wrapper (`api.ts`) | Server fn (`server-fns.ts`) | Description |
|---|---|---|
| `apiGetDashboard()` | `serverGetDashboard` | All dashboard aggregates in one call |
| `apiGetProjects(params)` | `serverGetProjects` | Paginated + filtered project list |
| `apiGetProject(id)` | `serverGetProject` | Single project with full hierarchy + budgets |
| `apiGetEquipment(params)` | `serverGetEquipment` | Paginated equipment list |
| `apiGetStrategies/Tactics/Plans/Departments` | `serverGetStrategies/…` | Reference data |
| `apiGetDepartmentsList()` | `serverGetDepartmentsList` | Normalized `departments` table |

**Write functions (admin only — `requireAdmin()` inside handler):**

| Wrapper | Server fn | Description |
|---|---|---|
| `apiPatchProjectStatus(id, status)` | `serverPatchProjectStatus` | Single project status |
| `apiBulkPatchProjectStatus(ids, status)` | `serverBulkPatchProjectStatus` | Bulk status — `WHERE id = ANY($1::int[])` |
| `apiCreateProject(input)` | `serverCreateProject` | Insert project + per-year budgets |
| `apiUpdateProject(id, input)` | `serverUpdateProject` | Replace project fields + budgets |
| `apiUpdateBudgets(projectId, budgets)` | `serverUpdateBudgets` | Replace budgets only |
| `apiDeleteProject(id)` | `serverDeleteProject` | Cascade-delete project_budgets + annotations + project |
| `apiBatchImportProjects(rows)` | `serverBatchImportProjects` | Multi-row insert with rollback on failure |
| `apiCreateEquipment / apiUpdateEquipment / apiDeleteEquipment` | `serverCreateEquipment / …` | Equipment CRUD |
| `apiCreateDepartment(name)` | `serverCreateDepartment` | Add department |
| `apiLogAudit(event)` | `serverLogAudit` | Append `audit_events` row |

**Auth functions:**

| Wrapper / hook | Server fn | Description |
|---|---|---|
| `useAuth().login(u, p)` | `serverLogin` | Returns `{ok:true,username}` or throws on the client. Sets sealed `admin_session` cookie. |
| `useAuth().logout()` | `serverLogout` | Clears session. |
| `useAuth()` (auto on mount) | `serverGetSession` | Returns `{username}` or `null`. Drives `isLoggedIn` everywhere. |

### 5.4 Helper Functions (retained from `src/lib/mock-data.ts`)

| Function | Purpose |
|---|---|
| `formatBaht(n, opts?)` | Thai-locale number formatter — still used everywhere |
| `STATUS_LABEL`, `STATUS_COLOR` | Status display mapping — still used in UI |
| `YEARS`, `DEPARTMENTS` | Static reference constants for filter dropdowns |

### 5.5 Known Data-Layer Debt

1. **Equipment uses column-per-year.** Adding fiscal year 2571 requires a DB migration + interface update.
2. **Department is free-text.** A `departments` reference table would eliminate spelling drift.
3. **Filter dropdowns use static mock-data.** `strategies`, `tactics`, `plans` for filter dropdowns come from static arrays in `mock-data.ts`, not the live DB. Should be replaced with `apiGetStrategies()` etc. queries.
4. **CORS must be configured** in the Neon Console before deploying to any domain other than localhost.

---

## 6. API Specification

There is no REST API. All client→server communication is over **TanStack Start RPC**: each `createServerFn` becomes a `POST /_serverFn/{contentHash}` endpoint. The hash is derived from the function's source location, which means it is stable across builds *of the same code*. Routing is set up in [vercel.json](../vercel.json):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/server" }]
}
```

`api/server.js` wraps `dist/server/server.js` (the TanStack Start server bundle) and converts Vercel's Node `req/res` to a Web `Request`/`Response`.

### 6.1 Server-fn endpoint pattern

```
POST /_serverFn/{contentHash}
Content-Type: application/json
Cookie: admin_session=<sealed>          ← set by serverLogin

Body: { "data": <typed input> }
Response: <typed output>  (JSON, possibly via Seroval encoding)

Auth required for mutations: requireAdmin() throws Response 401 → request returns 401.
```

### 6.2 Auth Endpoints

There is exactly one user-facing auth route:

| Path | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` (`src/routes/login.tsx`) | Username + password form. On success, full-page reload to `/` so the cookie + AppLayout state propagate cleanly. |

After login, the sidebar gains the **Admin** section (Import / Users / Audit) and CRUD buttons appear in Projects / Equipment / Dashboard.

**Demo users (seeded by v5.0 migration):**

| Username | Password |
|---|---|
| `pop` | `pop` |
| `pok` | `pok` |

Sessions are sealed with the `SESSION_PASSWORD` env var (`useSession()` from TanStack Start uses iron-webcrypto under the hood — the cookie is encrypted+signed; corrupting it invalidates the session). Cookie is `httpOnly`, `sameSite=lax`, `secure` in production, `maxAge=7 days`.

### 6.3 Required environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | `src/lib/db.ts` | Pooler endpoint connection string. **Server-side only — no `VITE_` prefix.** |
| `SESSION_PASSWORD` | `src/lib/session.server.ts` | Random 32+ char hex. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

Both must be set on Vercel under Project Settings → Environment Variables → all three scopes (Production, Preview, Development) → followed by a manual Redeploy (env var changes do not auto-redeploy).

---

## 7. Frontend / UI Design

### 7.1 Routes

Defined as files in `src/routes/`. `src/routeTree.gen.ts` is **auto-generated** — never edit manually.

| File | Path | Visibility | Component / Purpose |
|---|---|---|---|
| `__root.tsx` | (root shell) | — | HTML shell, Google Fonts, `<HeadContent>`, `<Scripts>`. |
| `index.tsx` | `/` | Public | Dashboard — stat cards + recharts visualizations. |
| `projects.tsx` | `/projects` | Public | Project list. Bulk-status checkbox column visible only when `isLoggedIn`. |
| `projects.$projectId.tsx` | `/projects/:projectId` | Public | Project detail. Edit/Delete buttons gated by `isLoggedIn`. `BudgetPanel` edit gated. |
| `equipment.tsx` | `/equipment` | Public | Equipment list. Add/Edit/Delete gated by `isLoggedIn`. |
| `login.tsx` | `/login` | Public | Username + password form for admin sign-in. |
| `import.tsx` | `/import` | Admin only | Excel upload UI (stub). Hidden from public sidebar. |
| `admin.users.tsx` | `/admin/users` | Admin only | User management page (currently stubbed pending v5.1 rewrite). |
| `admin.audit.tsx` | `/admin/audit` | Admin only | Audit log viewer (`audit_events` table). |
| `account.$pathname.tsx` | `/account/*` | — | Legacy Neon Auth account routes — no longer functional, scheduled for removal. |

### 7.2 Layout (`src/components/AppLayout.tsx`)

- Fixed left sidebar (280 px on `lg+`, hidden on smaller screens) — branding, nav, user footer.
- Sticky top header — search bar, notification bell, current fiscal year badge.
- Main content area with `px-5 lg:px-8 py-7` padding.
- Footer with copyright and version string.

Navigation items (all admin items hidden until `isLoggedIn`):

**เมนูหลัก** (always visible)
| Label | Route | Icon |
|---|---|---|
| ภาพรวม | `/` | `LayoutDashboard` |
| โครงการ | `/projects` | `FolderKanban` |
| ครุภัณฑ์ | `/equipment` | `Wrench` |

**ผู้ดูแลระบบ** (admin only)
| Label | Route | Icon |
|---|---|---|
| นำเข้าข้อมูล | `/import` | `Upload` |
| จัดการผู้ใช้ | `/admin/users` | `Users` |
| ประวัติการใช้งาน | `/admin/audit` | `History` |

The sidebar footer shows either an **"เข้าสู่ระบบผู้ดูแล"** button (linking to `/login`) or — for logged-in admins — the username avatar plus an **"ออกจากระบบ"** button.

### 7.3 Dashboard Composition (`src/routes/index.tsx`)

Data sourced from `apiGetDashboard()` and `apiGetProjects()` via TanStack Query (enabled only when authenticated). **All chart interactions filter the project table below in real-time.**

1. **Hero banner** — Gradient section showing system title, fiscal year badge, budget total, and a click-to-filter hint.
2. **Status KPI strip** — 4 clickable cards (กำลังดำเนินการ / เสร็จสิ้น / วางแผน / ยกเลิก). Count-up animation on load. Tooltip on each card. Staggered `fade-up` entrance.
3. **Stat cards** — 4 summary cards (total projects, total budget, strategies, departments). Tooltip + `hover-lift` micro-animation.
4. **Budget by year** — Vertical bar chart (clickable bars → year filter) + Sort control. Donut chart (status breakdown — clickable slices).
5. **Budget by strategy** — Horizontal bar list with clickable rows → strategy filter. **HoverCard** on each row shows full strategy name, budget, per-status project counts, and completion rate progress bar.
6. **Treemap** — Budget treemap, clickable cells → strategy filter. Each cell uses a `<clipPath>` (`tree-clip-{stratId}`) to prevent text overflow. Labels use full strategy `name` (not truncated). `<title>` element provides native SVG tooltip.
7. **Strategy progress** — Stacked bar chart (planning / in_progress / completed / cancelled) per strategy. Sortable. Y-axis labels use `"S" + s.id` short codes (e.g. S1, S2) with `width={30}`; full name shown in Recharts tooltip via `fullName` payload field.
8. **Radar chart** — Budget vs. project count by strategy (dual-axis radar). Labels rendered via `CustomPolarAngleTick` (custom SVG `<text>/<tspan>` component) which word-wraps long strategy names at 8 chars per line. `outerRadius={90}`, wider margins (`left/right: 65`) for label room. `subject` uses full strategy `name` (not truncated).
9. **Department chart** — Horizontal bar chart (budget by department, top 10). Sortable.
10. **Project table** — Sortable table of recent or filtered projects. Each row has a **QuickMenu** (view, edit, copy link, copy row data — copy actions emit toast notifications). Strategy name column uses `max-w-[160px] truncate` + `title` attribute for full name on hover.
11. **Filter chip** — Active filter shown as a dismissible chip above the table. `clearFilters()` emits a `toast.info`.
12. **Year-by-year multi-line chart** — ComposedChart (bar + line) showing yearly trend. Sortable.

### 7.4 Styling & Animation

- **TailwindCSS 4** with CSS custom properties for theming (defined in `src/styles.css`).
- **shadcn/ui** component library — 45+ pre-built components under `src/components/ui/`.
- **Color palette:** `--color-gold` accent, `--color-success`, `--color-warning`, `--color-destructive`, `--color-info` — all referenced via `STATUS_COLOR` map.
- **Font:** IBM Plex Sans Thai (Google Fonts, preconnect in `__root.tsx`).
- **Micro-animations (`src/styles.css`):**
  - `@keyframes fade-up` — entrance from below with opacity; used via `animate-fade-up`.
  - `@keyframes scale-in`, `bounce-in`, `pulse-ring`, `wiggle` — available utilities.
  - `.hover-lift` — `translateY(-2px)` + shadow on hover (transform + opacity only, per ui-animation rules).
  - `.press-effect` — `scale(0.96)` on `:active` for button press feedback.
  - `.stagger-1` through `.stagger-6` — animation-delay helpers for sequential entrance.
  - `.tooltip-rich` — override class for Radix Tooltip content styling.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (enter curve) used throughout, matching `ui-animation` skill defaults.
- **`useCountUp(target, duration, enabled)`** — custom hook in `index.tsx`; animates KPI integers from 0 on first data load using `requestAnimationFrame` with cubic ease-out. Called **before** any early returns to comply with Rules of Hooks.

### 7.5 UX Components

| Component / Pattern | Source | Usage |
|---|---|---|
| `Tooltip` (Radix) | `src/components/ui/tooltip.tsx` | KPI status cards, stat cards — show description + filter hint on hover |
| `HoverCard` (Radix) | `src/components/ui/hover-card.tsx` | Strategy rows — hover preview with full name, budget, per-status counts, completion rate |
| `Toaster` (Sonner) | `src/components/ui/sonner.tsx` | Toast notifications for filter apply/clear, copy link, copy row data |
| `TooltipProvider` | `src/components/AppLayout.tsx` | Wraps entire app layout; required for Radix Tooltip to function |
| `QuickMenu` | inline in `index.tsx` | Per-row dropdown (view, edit, copy link 🔗, copy data 📋) with toast feedback |

**Toast trigger points:**
- `setStatusFilter(s)` → `toast.success("กรองสถานะ: …")` with 🎯 emoji
- `setStrategyFilter(id)` → `toast.success("กรองยุทธศาสตร์: …")`
- `setYearFilter(y)` → `toast.success("กรองปีงบประมาณ: …")` with 📅 emoji
- `clearFilters()` → `toast.info("ล้างตัวกรองแล้ว")`
- Copy link → `toast.success("คัดลอกลิงก์แล้ว", { description: url, icon: "🔗" })`
- Copy row → `toast.success("คัดลอกข้อมูลแล้ว", { icon: "📋" })`

### 7.6 Data Fetching

All pages use **TanStack Query** (`useQuery` / `useMutation`) with query keys scoped by resource + params. Data comes from `src/lib/api.ts` → Neon Data API. The `QueryClient` is instantiated in `__root.tsx` with a 5-minute stale time. Loading and error states are handled inline in each route component.

### 7.7 Components

| File | Purpose |
|---|---|
| `src/components/AppLayout.tsx` | Sidebar + header + layout shell; mounts `TooltipProvider` + `Toaster` |
| `src/components/StatusBadge.tsx` | Colored Thai status pill |
| `src/components/ProjectFormDialog.tsx` | Create/edit project modal (Dialog) |
| `src/components/EquipmentFormDialog.tsx` | Create/edit equipment modal (Dialog) |
| `src/components/DeleteConfirmDialog.tsx` | Generic delete confirmation Dialog |
| `src/components/ui/tooltip.tsx` | Radix Tooltip wrapper with animation classes |
| `src/components/ui/hover-card.tsx` | Radix HoverCard wrapper |
| `src/components/ui/sonner.tsx` | Sonner Toaster wrapper (richColors, top-right position) |
| `src/components/ui/*` | shadcn/ui primitives (45+ components) |
| `src/hooks/use-mobile.tsx` | `useIsMobile()` hook (breakpoint 768 px) |
| `src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `src/lib/mock-data.ts` | Static reference arrays + `formatBaht` (generator fns no longer called) |
| `src/lib/api.ts` | All Neon Data API fetch helpers (typed, JWT-injecting) |
| `src/auth.ts` | Neon Auth client (`createAuthClient`) |

---

## 8. Data Import Workflow

### 8.1 Current State

The import page (`/import`) provides:
- Drag-and-drop or file-picker for `.xlsx` / `.xls`.
- File validation (extension check).
- UI state machine: `idle → uploading → success | error`.
- **No actual file processing** — the upload handler is a stub (simulated delay).

### 8.2 Target (Hierarchy-Aware) Flow

A robust importer should:

1. Parse the workbook and detect sheet roles by name pattern (`ผ.02/*`, `ผ.03`, summary).
2. Build an in-memory hierarchy: `strategy → tactic → plan`.
3. **Upsert** strategies/tactics/plans by code/name.
4. Insert projects referencing resolved `plan_id`. Record `source_sheet` for traceability.
5. Insert per-year budgets only for years with a positive amount.
6. Wrap the whole import in a transaction; roll back on failure.
7. Return `{ strategies, tactics, plans, projects, budgets, warnings }`.

---

## 9. Implementation Status

### 9.1 What Exists Today

- ✅ Full React SSR app on TanStack Start, file-based routing, 9 pages.
- ✅ **Two-tier auth** — public read-only / admin CRUD. Custom username+password sign-in at `/login` against `admin_users` table; bcrypt hashing; sealed httpOnly session cookies via `useSession()`. Demo users `pop`/`pop` and `pok`/`pok` seeded.
- ✅ **No client-exposed credentials** — `DATABASE_URL` and `SESSION_PASSWORD` are server-only. All SQL runs inside `createServerFn` handlers; the Neon serverless driver is never bundled into client JS. Verified by grep over `dist/client/`.
- ✅ **`requireAdmin()` middleware** — every mutation server function calls it first; returns Response 401 (not Error) so Seroval serializes the response correctly.
- ✅ **Vercel deployment** — `api/server.js` wraps the TanStack Start H3 bundle; `vercel.json` rewrites all paths through it. Production at `https://five-year-local-dev-strategy.vercel.app`.
- ✅ **Neon PostgreSQL** — full schema seeded with 248 projects, 869 budget rows, 64 equipment items + new `admin_users` table.
- ✅ **`not_set` status** added; all 248 imported projects reset to `not_set` (since the source Excel had no status column). DB CHECK constraint updated.
- ✅ **Bulk status update** — `/projects` page has a checkbox column (admin only) and a bulk toolbar that calls `serverBulkPatchProjectStatus` (`WHERE id = ANY($1::int[])`).
- ✅ **TanStack Query** — all pages use `useQuery` / `useMutation` against the `apiXxx` wrappers.
- ✅ **Per-project status mutation** wired on detail page.
- ✅ **Project CRUD** — Create / Edit / Delete with `ProjectFormDialog` + `DeleteConfirmDialog`, gated by `isLoggedIn`.
- ✅ **Equipment CRUD** — same pattern with `EquipmentFormDialog`. Fixed v5.0 bug where DB-numeric columns were being string-concatenated in JS sums (`Number()` cast added; `formatBaht` is now defensive too).
- ✅ **Audit log** (`/admin/audit`) — every mutation calls `apiLogAudit` which writes to `audit_events`.
- ✅ **Excel export** (`src/lib/export.ts`) — dashboard + filtered project list.
- ✅ **Login redirect uses `window.location.href`** — full reload after `serverLogin` so the `admin_session` cookie is included on the next render and `useAuth` returns `isLoggedIn=true` immediately.
- ✅ Dashboard with recharts visualizations (live data).
- ✅ **Interactive chart filtering** — clicking any chart bar/slice/row instantly filters the project table below. Active filter shown as a dismissible chip.
- ✅ **Multi-sort** on every dashboard section (strategies, progress, departments, years, project table) — dedicated `<SortSelect>` controls.
- ✅ **Strategy progress chart** — stacked bar chart showing planning/in_progress/completed/cancelled per strategy, with completion rate overlay.
- ✅ **Radar chart** — budget vs. project count by strategy (dual-axis).
- ✅ **Treemap** — budget allocation by strategy, clickable.
- ✅ **HoverCard on strategy rows** — preview popup with full name, budget, per-status counts, completion %, openDelay 400ms.
- ✅ **Tooltips on KPI + stat cards** — Radix `Tooltip` with description text and filter hint.
- ✅ **Toast notifications** (Sonner) — on filter apply, filter clear, copy link, copy row data.
- ✅ **Count-up animation** (`useCountUp`) — KPI integers animate from 0 on load; hook placed before early returns (Rules of Hooks compliant).
- ✅ **Micro-animations** — `animate-fade-up` + stagger delays on card sections; `hover-lift` on stat cards; `press-effect` on strategy row buttons.
- ✅ **`TooltipProvider` + `Toaster`** mounted globally in `AppLayout`.
- ✅ **QuickMenu** per project row — view/edit links + copy link/copy data with toast feedback.
- ✅ Project list with server-side filters + pagination (12/page) via PostgREST.
- ✅ Project detail with hierarchy path + budget bar chart (live data).
- ✅ Equipment list with pagination + search (live data).
- ✅ Import page UI (file picker, drag-and-drop, validation — stub).
- ✅ Thai locale number formatting (`formatBaht`).
- ✅ shadcn/ui component library (45+ components).
- ✅ TailwindCSS 4 theming with custom CSS properties + animation utilities.
- ✅ IBM Plex Sans Thai font.
- ✅ `ProjectFormDialog`, `EquipmentFormDialog`, `DeleteConfirmDialog` components (wired to pages).

### 9.2 What is Missing

- ❌ Strategy / Tactic / Plan management UI (CLI only).
- ❌ Functional Excel **upload** (`/import` page UI is a stub; `scripts/import-projects.cjs` is a working CLI importer).
- ❌ `/admin/users` page is wired to `apiGetUsers` / `apiCreateUser` / `apiDeleteUser` which currently return stubs (`Auth disabled`) — needs reimplementation against the `admin_users` table for v5.1.
- ❌ Account routes (`/account/*`) are leftover from the Better Auth era and no longer functional. Remove or rewrite.
- ❌ Granular admin roles (currently every admin has full power).
- ❌ Unit / integration tests.

### 9.3 File Map

```
C:\Users\PC\Documents\Projects\Five-Year Local Development Strategy\
├── api/
│   └── server.js                    # Vercel serverless wrapper around dist/server/server.js
├── docs/
│   ├── SYSTEM_DOCUMENT.md           # This file
│   └── FORENSIC_IMPORT_ANALYSIS.md  # Deep analysis of source Excel workbook structure
├── src/
│   ├── components/
│   │   ├── AppLayout.tsx            # Sidebar + header + Login/Logout button + admin nav gating
│   │   ├── StatusBadge.tsx          # Thai status pill (incl. not_set style)
│   │   ├── ProjectFormDialog.tsx    # Create/edit project Dialog
│   │   ├── EquipmentFormDialog.tsx  # Create/edit equipment Dialog
│   │   ├── DeleteConfirmDialog.tsx  # Generic delete confirmation
│   │   └── ui/                      # shadcn/ui primitives
│   ├── hooks/
│   │   ├── use-mobile.tsx           # useIsMobile()
│   │   └── use-auth.ts              # useAuth() — TanStack Query against serverGetSession + login/logout
│   ├── lib/
│   │   ├── api.ts                   # Public wrappers (apiXxx) calling server functions
│   │   ├── server-fns.ts            # All createServerFn handlers — DB queries + requireAdmin guards
│   │   ├── auth.ts                  # serverLogin / serverLogout / serverGetSession
│   │   ├── session.server.ts        # getServerSession() + requireAdmin() — server-only import
│   │   ├── db.ts                    # Lazy Neon SQL client (getSql()) — server-only
│   │   ├── mock-data.ts             # Static reference arrays + formatBaht (defensive Number cast)
│   │   ├── export.ts                # Excel export helpers (xlsx-js-style)
│   │   └── utils.ts                 # cn() helper
│   ├── routes/
│   │   ├── __root.tsx               # HTML shell, QueryClientProvider, fonts
│   │   ├── index.tsx                # Dashboard
│   │   ├── projects.tsx             # Project list + bulk-status toolbar (admin)
│   │   ├── projects.$projectId.tsx  # Project detail (status, edit, delete, budget edit — admin)
│   │   ├── equipment.tsx            # Equipment list (with admin CRUD)
│   │   ├── login.tsx                # Admin login form
│   │   ├── import.tsx               # Excel upload UI (stub)
│   │   ├── admin.users.tsx          # User mgmt (currently stubbed pending v5.1)
│   │   ├── admin.audit.tsx          # Audit log viewer
│   │   └── account.$pathname.tsx    # LEGACY (Better Auth) — non-functional, slated for removal
│   ├── routeTree.gen.ts             # AUTO-GENERATED — do not edit
│   ├── router.tsx                   # createRouter()
│   └── styles.css                   # TailwindCSS 4 + animation utilities
├── scripts/                         # CLI tools — connect to DB via DATABASE_URL
│   ├── migrate.js                   # DDL migration
│   ├── seed.js                      # Seed reference data
│   ├── add-users.js                 # Legacy Neon Auth seed (kept for reference)
│   ├── import-projects.cjs          # Excel → DB import pipeline
│   ├── extract-textboxes.cjs        # Excel text box extraction
│   ├── seed-textboxes.js            # Annotations + sheet metadata seed
│   ├── forensic-extract.cjs         # Workbook forensic analysis
│   ├── sheet-inventory.cjs          # Sheet inventory
│   └── lib/textbox-lookup.cjs       # Reusable text box lookup
├── .env                             # DATABASE_URL, SESSION_PASSWORD (gitignored)
├── .env.example
├── vercel.json                      # Single rewrite rule → /api/server
├── package.json
├── vite.config.ts                   # @lovable.dev/vite-tanstack-config (cloudflare:false)
├── tsconfig.json
├── components.json                  # shadcn/ui config
└── eslint.config.js
```

---

## 10. Deployment and Operations

### 10.1 Local Development

```bash
npm install
npm run dev          # Vite dev server → http://localhost:8080
```

`.env` must contain `DATABASE_URL` and `SESSION_PASSWORD`. See `.env.example`.

### 10.2 Production Build

```bash
npm run build        # outputs dist/client and dist/server
npm run preview      # serves the build locally
```

### 10.3 Vercel Deployment

The repo is connected to Vercel (project `five-year-local-dev-strategy`). Every push to `main` triggers an automatic build + deploy.

**Required env vars on Vercel** (Settings → Environment Variables, all three scopes):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Same Neon pooler endpoint as local `.env` |
| `SESSION_PASSWORD` | 32+ char hex; must match what was used to seal existing cookies, otherwise users are silently logged out |

After changing env vars, manually **Redeploy** the latest deployment — env var changes do not auto-redeploy. Verify a deploy used the new values by hitting any `/_serverFn/*` endpoint and confirming you don't get the `DATABASE_URL is not set` error message.

### 10.4 Database Migrations

```bash
npm run migrate                 # CREATE TABLE IF NOT EXISTS — idempotent
npm run seed                    # Reference data + 248 projects
npm run import-projects         # Full Excel pipeline (project source workbook)
```

Admin user seeding is currently **inline** (run via the Node REPL with the `--env-file=.env` flag). A dedicated `scripts/seed-admins.js` is a v5.1 follow-up.

All scripts use `@neondatabase/serverless` with `process.env.DATABASE_URL`. The connection string is never bundled into client code.

---

## 11. Extension Points and Roadmap

### 11.1 Near-Term (v5.1)

1. **Re-implement `/admin/users`** against the `admin_users` table — list, create (with password set), reset password, delete. The existing page is wired to stub server functions returning `[]` / throwing.
2. **Functional Excel upload** — wire `/import` page to `serverBatchImportProjects` using the parsing logic already in `scripts/import-projects.cjs`.
3. **Remove leftover `/account/*` routes** — Better Auth artefacts that no longer work.
4. **Replace static filter dropdowns** — `strategies`, `tactics`, `plans` arrays in `mock-data.ts` should come from `useQuery(apiGetStrategies)` etc.
5. **`scripts/seed-admins.js`** — convert the inline admin seed into a checked-in script.

### 11.2 Mid-Term (v5.2)

6. **Granular admin roles** — `admin_users.role` column with `super_admin` / `editor` / `viewer`.
7. **Audit log filters + diff viewer** in `/admin/audit`.
8. **`projects.status_changed_at`** — track when a status was last updated and by whom.

### 11.3 Long-Term (v6.0)

9. **Approval workflow** — `draft → submitted → approved → active → completed`.
10. **Actual vs. planned tracking** — `project_disbursements(project_id, year, quarter, amount, note)`.
11. **Citizen-facing view** — Already exists implicitly (the public read-only mode).

### 11.4 Guardrails for Future Agents

When modifying this system:

- **Never hand-edit `src/routeTree.gen.ts`** — it is auto-generated by TanStack Router's Vite plugin on every dev/build run.
- **Never break the Strategy → Tactic → Plan → Project hierarchy.** Upstream Excel work relies on it.
- **Preserve Thai locale** in all user-facing strings. `formatBaht()` is part of that contract.
- **`mock-data.ts` is now a static reference only.** Live data comes from `src/lib/api.ts`. New data requirements should be implemented in `api.ts` as typed fetch functions, not in `mock-data.ts`.
- **Never commit `.env`.** It contains the Neon Data API URL. Use environment variables in CI/CD.
- **Keep component additions inside `src/components/`.** Add new shadcn/ui components via `npx shadcn@latest add <component>` to keep the `components.json` manifest in sync.
- **Do not add duplicate Vite plugins.** `@lovable.dev/vite-tanstack-config` already bundles TanStack Start, React, Tailwind, tsconfig-paths, and Cloudflare plugins. See the comment at the top of `vite.config.ts`.
- **`optimizeDeps.include` for `use-sync-external-store`** — `vite.config.ts` explicitly includes `use-sync-external-store/shim/with-selector` in `optimizeDeps.include` to force Vite to pre-bundle the CJS module into ESM. Without this, a `SyntaxError: does not provide an export named 'useSyncExternalStoreWithSelector'` occurs on first load. **Do not remove this entry.**
- **DB credentials must never reach the client.** Never import `db.ts`, `session.server.ts`, or anything from `@neondatabase/serverless` into a file that is reachable from the client. The TanStack Start import-protection plugin will fail the build and `dist/client/` will be scanned in CI for `neondb_owner` / `npg_` to verify. Use `*.server.ts` suffix for files that must be server-only.
- **Server functions must throw `Response`, not `Error`, for HTTP-shaped errors.** Throwing `new Error(...)` causes Seroval (TanStack Start's error serializer) to fail with `Seroval Error (step: 3)` 500 on Vercel. Pattern:
  ```ts
  if (!session.data?.userId) {
    throw new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }
  ```
  For *expected* failure cases (e.g. wrong password), return a discriminated-union result instead of throwing — see `serverLogin` in `src/lib/auth.ts`.
- **Login flow uses `window.location.href = "/"`, not `navigate()`.** A SPA navigation does not refetch the session cookie reliably; a full reload guarantees the new `admin_session` cookie is read on first render and `useAuth` returns `isLoggedIn=true` immediately.
- **Never `+` Postgres `numeric` columns directly.** The Neon serverless driver returns numerics as strings. Always `Number(x)` first, or use `formatBaht` which already does the cast. Bug fixed in v5.0 was equipment totals showing `526000067400030700000…` (string concat).
- **Don't add a `not_set` arm to `STATUS_COLOR` charts that hardcode 4 statuses.** `byStrategyProgress` in `serverGetDashboard` intentionally omits `not_set` from the stacked-bar chart to keep the existing visualization compact. If you want to surface `not_set` counts, do it as a separate KPI.
- **All hooks in `DashboardPage` MUST be called before any early return.** Both `useCountUp` (×5) and all `useMemo` calls (×5: `stratSorted`, `progressSorted`, `yearSorted`, `deptSorted`, `tableSorted`) must precede the `if (isLoading)` and `if (error || !data)` guard blocks. All `useMemo` deps use optional chaining (`data?.byStrategy ?? []`) so they are safe when data is `undefined`. Violating this causes a React "Rendered more hooks than during the previous render" crash.
- **Animate only `transform` and `opacity`.** Never animate `width`, `height`, `top`, `left`, or use `transition: all`. See `src/styles.css` keyframes for approved patterns.
- **Recharts `Tooltip` must be aliased** as `ReTooltip` in `index.tsx` to avoid naming conflict with Radix UI `Tooltip` (imported as `TipRoot`).
- **`CustomPolarAngleTick`** is a standalone function component (not inside `DashboardPage`) used as the `tick` prop for `PolarAngleAxis` in the radar chart. It wraps long labels into multiple `<tspan>` lines at 8 chars each.
- **SVG `<clipPath>` for Treemap cells** — Each `TreemapCell` defines its own `<defs><clipPath id="tree-clip-{stratId}">` to clip text within the cell boundary. This prevents label overflow across cell borders.
- **Strategy name display:** radar chart `subject` and treemap cell `name` both use the full untruncated strategy name. Short codes (`S1`–`S6`) are used only on the stacked-bar Y-axis for space efficiency.

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-20 | System analyst (AI) | Initial consolidated SRS + SDD based on original `webapp/` design target. |
| 2.0 | 2026-04-21 | System analyst (AI) | Full rewrite to reflect actual codebase: TanStack Start + Vite 7 + React 19 + TailwindCSS 4 + mock-data frontend-only app. Corrected all outdated Express/SQLite/`webapp/` references. Updated file map, technology table, data types, routes, and implementation status. |
| 3.0 | 2026-04-21 | System analyst (AI) | Backend integration: Neon PostgreSQL schema + seed data; Neon Auth (Better Auth); Neon Data API (PostgREST) wired via `src/lib/api.ts`; TanStack Query in all pages; route protection in `AppLayout`; `scripts/migrate.js` and `scripts/seed.js` added. Updated architecture diagram, FR table, tech stack, file map. |
| 3.1 | 2026-04-21 | System analyst (AI) | Added user management: `/admin/users` page (list/create/delete), `apiGetUsers`/`apiCreateUser`/`apiDeleteUser` in `api.ts`, `scripts/add-users.js`, `npm run add-users`. Fixed hydration mismatch (`suppressHydrationWarning` on `<html>`). Added `enabled: !!session` gate to all `useQuery` calls to prevent unauthenticated API requests. Updated FR table (FR-16), routes, file map, nav, and deployment sections. |
| 4.0 | 2026-04-23 | System analyst (AI) | **UX Enhancement release.** Added: interactive chart filtering (click any bar/slice/row → filters project table), multi-sort controls on all dashboard sections, strategy progress stacked bar chart, radar chart, Treemap, HoverCard on strategy rows, Radix Tooltip on KPI + stat cards, Sonner toast notifications (filter/copy actions), `useCountUp` animated KPI hook, micro-animation CSS utilities (fade-up, hover-lift, press-effect, stagger delays), `TooltipProvider` + `Toaster` in `AppLayout`. Added `ProjectFormDialog`, `EquipmentFormDialog`, `DeleteConfirmDialog` components. Added Excel import pipeline scripts (`import-projects.cjs`, `extract-textboxes.cjs`, `seed-textboxes.js`) + forensic analysis. Updated all section 7 subsections, FR-01, NFR-09/10, file map, guardrails, and change log. Fixed Rules of Hooks violation (moved `useCountUp` before early returns). |
| 4.1 | 2026-04-23 | System analyst (AI) + User | **Chart polish + final Rules-of-Hooks fix.** (1) Moved all 5 `useMemo` hooks before early returns with `data?.xxx ?? []` optional-chaining deps — resolves "Rendered more hooks" crash. (2) Radar chart: `CustomPolarAngleTick` word-wrap component, full strategy names as `subject`, `outerRadius=90`, wider margins. (3) Treemap: SVG `<clipPath>` per cell to prevent text overflow, full `name` labels, `<title>` tooltip. (4) Strategy progress chart: Y-axis short codes `S1`–`S6` (`width=30`), `fullName` in tooltip payload. (5) Project table strategy column: `max-w-[160px] truncate` + `title` native tooltip. Updated §7.3 (sections 6–10), §7.4, §11.4 guardrails, and change log. |
| 4.2 | 2026-04-27 | System analyst (AI) + User | **Auth overhaul + stability fixes.** (1) Replaced `AuthView` with custom username/password login form using `authClient.signIn.email()` — no email label shown to user; username auto-converted to `@nmt.local`. (2) Self-registration blocked: `/auth/sign-up` redirects to sign-in. (3) Forgot password + Google login disabled. (4) Password padding: `padEnd(8, "_")` in both `apiCreateUser` and login form allows 3-char passwords. (5) Fixed double `res.json()` call in `apiCreateUser` that prevented localStorage mirror from updating. (6) Added `optimizeDeps.include: ["use-sync-external-store/shim/with-selector"]` to `vite.config.ts` to fix recurring `SyntaxError: useSyncExternalStoreWithSelector` on dev server. (7) Auth guard temporarily disabled in `AppLayout.tsx` — app accessible without login pending auth stability review. Updated §3.1, §3.2 FR-12, §4.4, §6.2, §9.1, §10.4, §11.4, change log. |
| 5.0 | 2026-04-30 | System analyst (AI) + User | **Backend rearchitecture + Vercel deployment + custom auth + read-only public mode.** (1) Removed Neon Auth / Better Auth / PostgREST entirely. All SQL now runs inside `createServerFn` handlers via `@neondatabase/serverless`. New files: `src/lib/db.ts` (lazy `getSql()`), `src/lib/server-fns.ts` (all DB queries), `src/lib/auth.ts` (login/logout/session), `src/lib/session.server.ts` (`requireAdmin`). `src/lib/api.ts` becomes a thin wrapper. Eliminates security regression where DB credentials had been bundled into client JS via `VITE_DATABASE_URL`. (2) Two-tier auth: public read-only / admin CRUD. New `admin_users` table with bcrypt hashes; demo users `pop`/`pop` and `pok`/`pok`. Sealed httpOnly session cookies via `useSession()`. New `/login` route. Sidebar gates Admin section + CRUD buttons by `useAuth().isLoggedIn`. (3) Vercel deployment: `api/server.js` wrapper + `vercel.json` rewrites. Required env vars: `DATABASE_URL`, `SESSION_PASSWORD`. (4) New `not_set` status (default for new projects); reset all 248 existing projects; DB CHECK constraint updated. (5) Bulk status update on `/projects` (admin only) — `serverBulkPatchProjectStatus` with `WHERE id = ANY($1::int[])`. (6) Bug fixes: equipment budget columns were string-concatenating in JS sums (`Number()` cast added); `formatBaht` is now defensive. (7) Server functions throw `Response`, not `Error` — Seroval cannot serialize Error correctly on Vercel; `serverLogin` returns discriminated-union result. (8) Login uses `window.location.href` for full reload after success so cookie + AppLayout state propagate cleanly. (9) Updated all sections: Topology diagram, tech stack (Vercel, no PostgREST, no Better Auth), data model (`Status` adds `not_set`, `admin_users` table), API spec (server-fn RPC), routes (`/login`, admin gating), file map, deployment, roadmap, guardrails. |

---

*End of document.*
