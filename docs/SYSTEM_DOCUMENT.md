# System Document — Local Development Plan Management System

> **Document Type:** Combined Software Requirements Specification (SRS) + System Design Document (SDD)
> **Target Audience:** AI development agents analyzing, maintaining, and extending this codebase
> **Version:** 4.2
> **Date:** 2026-04-27
> **Repository Root:** `C:\Users\PC\Documents\Projects\Five-Year Local Development Strategy`

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

Authentication is currently **disabled** — the app is accessible without login. Auth was temporarily bypassed in `AppLayout.tsx` (v4.2) pending a stable auth implementation. When re-enabled, it will use Neon Auth (Better Auth). Role separation is not yet enforced at the API level.

| Role | Description | Primary use cases |
|---|---|---|
| Planning Officer | Day-to-day data entry and import | Import Excel, create/edit projects, update status |
| Department Head | Owns a subset of projects | Review, status update, filtered reporting |
| Executive | Reviews aggregate performance | Dashboard, budget-by-year, budget-by-strategy |
| System Admin | Maintains reference data and users | Manage strategies, tactics, plans, user accounts |

### 3.2 Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-01 | System SHALL display an overview dashboard showing total projects, total budget, budget-by-year, budget-by-strategy, status breakdown, strategy progress, radar chart, top 10 departments, and a sortable project table. | ✅ Implemented |
| FR-02 | System SHALL list all projects with pagination (default 12/page) and filters for search text, strategy, plan, department, status, and year. | ✅ Implemented |
| FR-03 | System SHALL show a single-project detail view including hierarchy path, objective, target, KPI, expected result, department, and per-year budget. | ✅ Implemented |
| FR-04 | System SHALL allow changing a project's status to one of: `planning`, `in_progress`, `completed`, `cancelled`. | ✅ Implemented — persisted to Neon via PATCH |
| FR-05 | System SHALL list equipment items with pagination and search. | ✅ Implemented — live from Neon DB |
| FR-06 | System SHALL accept an `.xlsx` file upload and display import confirmation UI. | ✅ UI only — no backend wired |
| FR-07 | System SHALL provide reference data (strategies, tactics, plans, departments) for filter dropdowns. | ✅ Implemented (static from mock-data; DB data used at runtime) |
| FR-08 | System SHOULD support full project CRUD (create, edit, delete) through UI forms. | ❌ Missing |
| FR-09 | System SHOULD support editing strategies, tactics, and plans through UI. | ❌ Missing |
| FR-10 | System SHOULD support editing per-year budget rows directly on the project detail page. | ❌ Missing |
| FR-11 | System SHOULD provide Excel export of filtered project lists and dashboard data. | ❌ Missing |
| FR-12 | System SHOULD support user authentication and role-based permissions. | ⚠️ Auth temporarily disabled — `AppLayout` no longer redirects unauthenticated users. Custom login form exists at `/auth/sign-in` but is not enforced. |
| FR-13 | System SHOULD provide an audit trail for all mutations (who changed what, when). | ❌ Missing |
| FR-16 | System SHALL provide a user management page to list, create, and delete user accounts. | ✅ Implemented — `/admin/users` page with `apiGetUsers`, `apiCreateUser`, `apiDeleteUser` |
| FR-14 | System SHOULD support multi-sheet import that respects the Strategy/Tactic/Plan hierarchy from source workbook structure. | ❌ Missing |
| FR-15 | System SHOULD persist data mutations to a durable backend (database). | ✅ Implemented — Neon PostgreSQL via Neon Data API (PostgREST) |

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
│  TanStack Query · @neondatabase/neon-js (Neon Auth)             │
│  Served from  http://localhost:8080  (Vite dev)                 │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         │ Auth (Better Auth)           │ Data (PostgREST HTTP)
         ▼                              ▼
┌──────────────────┐        ┌────────────────────────────────────┐
│   Neon Auth      │        │   Neon Data API (PostgREST)        │
│  (managed auth   │        │   Base URL: apirest.c-2.ap-…       │
│   service)       │        │   JWT-authenticated REST API       │
│  Issues JWT      │        │   maps to neondb tables            │
└──────────────────┘        └───────────────┬────────────────────┘
                                            │ SQL
                                            ▼
                             ┌──────────────────────────┐
                             │  Neon PostgreSQL (neondb) │
                             │  Region: ap-southeast-1  │
                             │  6 tables, 248 projects   │
                             └──────────────────────────┘
```

### 4.3 Technology Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | ≥18 | |
| Framework | TanStack Start | ^1.167 | File-based routing via `@tanstack/react-router` |
| Build tool | Vite | ^7.3 | Config via `@lovable.dev/vite-tanstack-config` |
| UI framework | React | ^19.2 | |
| Styling | TailwindCSS | ^4.2 | Via `@tailwindcss/vite` plugin |
| Component library | shadcn/ui (Radix UI) | various | 45 components under `src/components/ui/` |
| Charts | recharts | ^3.8 | Dashboard visualizations |
| Icons | Lucide React | ^0.575 | |
| Forms | react-hook-form + zod | ^7.71 / ^3.24 | Available; not yet widely used |
| State / fetch | TanStack Query | ^5 | Wired in all route pages; 5-min stale time |
| Auth | Neon Auth (@neondatabase/neon-js) | ^0.2.0-beta | Better Auth-based; `src/auth.ts` + `NeonAuthUIProvider` |
| Database | Neon PostgreSQL | — | `neondb` on ap-southeast-1; accessed via Data API |
| Data API | Neon Data API (PostgREST) | — | REST endpoint with `Prefer: count=exact` for pagination |
| Font | IBM Plex Sans Thai | — | Loaded from Google Fonts in `__root.tsx` |
| Deployment target | Cloudflare Workers | — | `@cloudflare/vite-plugin` + `wrangler.jsonc` present |

### 4.4 Trade-offs (current state)

- **`mock-data.ts` retained** — still exports static reference arrays (`strategies`, `tactics`, `plans`, `DEPARTMENTS`, `YEARS`, `STATUS_LABEL`, `STATUS_COLOR`, `formatBaht`) used by filter dropdowns and formatting. The generator functions (`getDashboardData`, `getProjectWithHierarchy`) are no longer called at runtime.
- **Auth-gated data** — Auth guard is currently disabled. `AppLayout` no longer redirects unauthenticated users (v4.2). Data API requests still send a JWT if a session exists, but do not block if there is none.
- **File-based routing** — TanStack Router auto-generates `src/routeTree.gen.ts` from the files in `src/routes/`. Never hand-edit `routeTree.gen.ts`.
- **Import page** — UI exists; file upload is still a stub (no parsing/persistence).
- **CORS** — Neon Data API must have this app's origin in its allowed-origins list (configure in Neon Console → Data API → Settings).

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
type Status = "planning" | "in_progress" | "completed" | "cancelled";
```

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

### 5.3 API Layer (`src/lib/api.ts`)

All data fetching goes through `src/lib/api.ts`, which wraps the Neon Data API:

| Function | Returns | Description |
|---|---|---|
| `apiGetDashboard()` | `DashboardData` | Fetches all tables in parallel; aggregates stats client-side |
| `apiGetProjects(params)` | `ProjectListResult` | Paginated + filtered project list with joins |
| `apiGetProject(id)` | `ProjectDetail \| null` | Single project with full hierarchy |
| `apiPatchProjectStatus(id, status)` | `void` | PATCH to Neon Data API |
| `apiGetEquipment(params)` | `EquipmentListResult` | Paginated equipment list |
| `apiGetStrategies()` | `DBStrategy[]` | All strategies |
| `apiGetTactics()` | `DBTactic[]` | All tactics |
| `apiGetPlans()` | `DBPlan[]` | All plans |
| `apiGetUsers()` | `AuthUser[]` | All user accounts (from Better Auth `user` table) |
| `apiCreateUser(data)` | `void` | Signs up a new user via Neon Auth `/sign-up/email` endpoint |
| `apiDeleteUser(userId)` | `void` | Deletes user's sessions, accounts, verifications, then the user row |

`AuthUser` interface: `{ id, name, email, email_verified, image, created_at, updated_at }`.

All functions call `getToken()` (from `authClient.getSession()`) and inject `Authorization: Bearer <JWT>`. Pagination uses `Prefer: count=exact` → reads `Content-Range` header.

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

> **Current status: Neon Data API (PostgREST) is the live backend.** There is no custom Express/Hono server. All reads/writes go directly to the Neon database via its PostgREST-compatible REST API.

**Data API base URL:** `https://ep-plain-darkness-ao06zq83.apirest.c-2.ap-southeast-1.aws.neon.tech/neondb/rest/v1`
**Auth URL:** `https://ep-plain-darkness-ao06zq83.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth`
**Authentication:** Bearer JWT from Neon Auth session (`authClient.getSession().data.session.token`).
**Env vars (in `.env`):** `VITE_NEON_AUTH_URL`, `VITE_NEON_DATA_API_URL`.

### 6.1 Data API Endpoints (PostgREST conventions)

| Method | Path | Key params | Purpose |
|---|---|---|---|
| GET | `/projects` | `select`, `order`, `limit`, `offset`, filter cols, `Prefer: count=exact` | Paginated project list |
| GET | `/projects?id=eq.{id}` | `select=*,plans(*,tactics(*,strategies(*)))` | Single project with joins |
| PATCH | `/projects?id=eq.{id}` | JSON body `{status}` | Update project status |
| GET | `/strategies` | `order=id.asc` | All strategies |
| GET | `/tactics` | `order=code.asc` | All tactics |
| GET | `/plans` | — | All plans |
| GET | `/project_budgets` | `select=project_id,year,amount` | All budget rows |
| GET | `/equipment` | `select=*`, `item_type=ilike.*q*`, `Prefer: count=exact` | Equipment list |

All filtering uses PostgREST operators: `eq.`, `ilike.*val*`, `not.is.null`, etc.
Pagination uses `Prefer: count=exact` header → reads `Content-Range: from-to/total` response header.

### 6.2 Auth Endpoints (Neon Auth / Better Auth)

`auth.$pathname.tsx` now uses a **custom login form** (not `AuthView`) calling `authClient.signIn.email()` directly.

| Path | Component | Purpose |
|---|---|---|
| `/auth/sign-in` | Custom form | Username + password login — no email label shown |
| `/auth/sign-up` | Redirect → `/auth/sign-in` | Self-registration disabled |
| `/account/profile` | `AccountView` | Profile management |

**Username-to-email synthesis:** bare username (e.g. `pop`) is converted to `pop@nmt.local` before calling the Better Auth API. Users never see this internal email.

**Password padding:** Better Auth enforces ≥8 char passwords server-side. Passwords shorter than 8 chars are padded with `_` characters (`padEnd(8, "_")`) both on sign-up (`apiCreateUser`) and sign-in (`auth.$pathname.tsx`) so admins can set 3-char passwords.

**Demo users:** `pop` / `pop_1234`, `pok` / `pok_1234` (created via `npm run add-users`).

### 6.3 Future: Import Endpoint

#### `POST /api/import` (not yet implemented)
Multipart form with field `file` → `.xlsx`. Target flow described in §8.2.

---

## 7. Frontend / UI Design

### 7.1 Routes

Defined as files in `src/routes/`. `src/routeTree.gen.ts` is **auto-generated** — never edit manually.

| File | Path | Component / Purpose |
|---|---|---|
| `__root.tsx` | (root shell) | HTML shell, Google Fonts, `<HeadContent>`, `<Scripts>`. |
| `index.tsx` | `/` | Dashboard — stat cards + recharts visualizations. |
| `projects.tsx` | `/projects` | Filterable, paginated project list. |
| `projects.$projectId.tsx` | `/projects/:projectId` | Single project detail with hierarchy + budget chart. |
| `equipment.tsx` | `/equipment` | Paginated equipment list with search. |
| `import.tsx` | `/import` | Excel upload UI (no backend wired yet). |
| `admin.users.tsx` | `/admin/users` | User management — list, add, delete users. |

### 7.2 Layout (`src/components/AppLayout.tsx`)

- Fixed left sidebar (280 px on `lg+`, hidden on smaller screens) — branding, nav, user footer.
- Sticky top header — search bar, notification bell, current fiscal year badge.
- Main content area with `px-5 lg:px-8 py-7` padding.
- Footer with copyright and version string.

Navigation items:

**เมนูหลัก**
| Label | Route | Icon |
|---|---|---|
| ภาพรวม | `/` | `LayoutDashboard` |
| โครงการ | `/projects` | `FolderKanban` |
| ครุภัณฑ์ | `/equipment` | `Wrench` |
| นำเข้าข้อมูล | `/import` | `Upload` |

**ผู้ดูแลระบบ**
| Label | Route | Icon |
|---|---|---|
| จัดการผู้ใช้ | `/admin/users` | `Users` |

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

- ✅ Full React SPA with 7 pages and sidebar navigation.
- ✅ TanStack Router with file-based routing.
- ⚠️ **Auth temporarily disabled** — `AppLayout` session guard removed; app is publicly accessible without login. Custom login form (`auth.$pathname.tsx`) still exists and works but is not enforced.
- ✅ **Custom login form** — `AuthView` replaced with hand-built username/password form using `authClient.signIn.email()`. Username converted to `@nmt.local` email. Password padded to 8 chars.
- ✅ **Self-registration blocked** — `/auth/sign-up` redirects to `/auth/sign-in`. Only admin can create users via `/admin/users`.
- ✅ **Forgot password disabled** — `credentials={{ forgotPassword: false }}` in `NeonAuthUIProvider`. Google social login removed (`providers: []`).
- ✅ **Hydration** — `suppressHydrationWarning` on `<html>` to silence Neon Auth UI class injection mismatch.
- ✅ **User management page** (`/admin/users`) — list all users, create new user (via Better Auth sign-up), delete user (cascades sessions/accounts).
- ✅ **`scripts/add-users.js`** — CLI script to seed demo users (`npm run add-users`).
- ✅ **Neon PostgreSQL** — 6-table schema live in `neondb`; seeded with 248 projects, 869 budget rows, 64 equipment items.
- ✅ **TanStack Query** — all pages use `useQuery` / `useMutation` to fetch from the Neon Data API.
- ✅ **Status mutation** — PATCH to Neon Data API is wired on the project detail page.
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

### 9.2 What is Missing (v1.0 → v1.1)

- ❌ Project create/edit/delete UI and API calls.
- ❌ Per-year budget editing UI.
- ❌ Strategy / Tactic / Plan management UI.
- ❌ Functional Excel import processing (parse + upsert).
- ❌ Hierarchy-aware multi-sheet importer.
- ❌ Excel export of filtered views.
- ❌ Role-based access control (currently any authenticated user can access `/admin/users` and all pages).
- ❌ Audit log.
- ❌ CORS configuration in Neon Console for non-localhost origins.
- ❌ Unit / integration tests.

### 9.3 File Map

```
C:\Users\PC\Documents\Projects\Five-Year Local Development Strategy\
├── docs/
│   ├── SYSTEM_DOCUMENT.md           # This file
│   └── FORENSIC_IMPORT_ANALYSIS.md  # Deep analysis of source Excel workbook structure
├── src/
│   ├── components/
│   │   ├── AppLayout.tsx            # Sidebar + header + layout shell; TooltipProvider + Toaster
│   │   ├── StatusBadge.tsx          # Thai status pill component
│   │   ├── ProjectFormDialog.tsx    # Create/edit project Dialog form
│   │   ├── EquipmentFormDialog.tsx  # Create/edit equipment Dialog form
│   │   ├── DeleteConfirmDialog.tsx  # Generic delete confirmation Dialog
│   │   └── ui/                      # 45+ shadcn/ui components incl. tooltip, hover-card, sonner
│   ├── hooks/
│   │   └── use-mobile.tsx           # useIsMobile() hook
│   ├── lib/
│   │   ├── api.ts                   # All Neon Data API fetch helpers + types
│   │   ├── mock-data.ts             # Static reference arrays + formatBaht
│   │   └── utils.ts                 # cn() helper
│   ├── routes/
│   │   ├── __root.tsx               # HTML shell, NeonAuthUIProvider, QueryClientProvider
│   │   ├── index.tsx                # Dashboard page — charts, filters, animations, HoverCard, Toast
│   │   ├── projects.tsx             # Project list page (server-side filter + pagination)
│   │   ├── projects.$projectId.tsx  # Project detail page (status PATCH to Neon)
│   │   ├── equipment.tsx            # Equipment list page
│   │   ├── import.tsx               # Excel import page (stub)
│   │   ├── admin.users.tsx          # User management page (list / create / delete)
│   │   ├── auth.$pathname.tsx       # Sign-in / sign-up / forgot-password views
│   │   └── account.$pathname.tsx    # Account management views
│   ├── auth.ts                      # Neon Auth client (createAuthClient)
│   ├── routeTree.gen.ts             # AUTO-GENERATED — do not edit
│   ├── router.tsx                   # createRouter() + error boundary
│   └── styles.css                   # TailwindCSS 4 + animation utilities + Neon Auth UI styles
├── scripts/
│   ├── migrate.js                   # DDL migration (node scripts/migrate.js)
│   ├── seed.js                      # Seed data from mock arrays (node scripts/seed.js)
│   ├── add-users.js                 # Create demo users via Neon Auth API
│   ├── import-projects.cjs          # Full Excel import pipeline (548 projects, 33 sheets)
│   ├── extract-textboxes.cjs        # Extracts 212 text box annotations from source workbook
│   ├── seed-textboxes.js            # Seeds project_annotations, sheet_metadata, document_metadata
│   ├── forensic-extract.cjs         # Workbook forensic analysis + report
│   ├── sheet-inventory.cjs          # Sheet inventory tool
│   └── lib/
│       └── textbox-lookup.cjs       # Reusable Map<sheet, Map<row, annotations>> lookup
├── .env                             # VITE_NEON_AUTH_URL, VITE_NEON_DATA_API_URL (gitignored)
├── package.json                     # npm scripts: dev, build, preview, lint, migrate, seed,
│                                    #   add-users, extract-textboxes, seed-textboxes, import-projects
├── skills-lock.json                 # Windsurf installed skills manifest
├── vite.config.ts                   # @lovable.dev/vite-tanstack-config
├── tsconfig.json
├── components.json                  # shadcn/ui config
├── eslint.config.js
└── wrangler.jsonc                   # Cloudflare Workers deploy config
```

---

## 10. Deployment and Operations

### 10.1 Local Development

```bash
# Install dependencies (use cmd on Windows if PowerShell execution policy blocks npm)
cmd /c npm install

# Start Vite dev server → http://localhost:8080
cmd /c npm run dev
```

> On Windows, PowerShell may block `.ps1` scripts. Use `cmd /c npm ...` as a workaround, or enable PowerShell script execution with `Set-ExecutionPolicy RemoteSigned`.

### 10.2 Production Build

```bash
cmd /c npm run build    # outputs to dist/
cmd /c npm run preview  # serves dist/ locally for verification
```

### 10.3 Cloudflare Workers Deployment

`wrangler.jsonc` and `@cloudflare/vite-plugin` are preconfigured. Deploy with:
```bash
cmd /c npx wrangler deploy
```

### 10.4 Database Migrations

```bash
# Re-run schema (idempotent — uses CREATE TABLE IF NOT EXISTS)
cmd /c npm run migrate

# Re-seed all tables (destructive — TRUNCATE first)
cmd /c npm run seed

# Add demo users to Neon Auth (idempotent — skips existing)
cmd /c npm run add-users
```

Note: Neon Auth (Better Auth) enforces **minimum 8-character passwords** server-side. The UI allows 3-char minimum; passwords are automatically padded to 8 chars with `_` via `padEnd(8, "_")` before calling the API. Demo users: `pop` / `pop_1234`, `pok` / `pok_1234`.

Both migration/seed scripts use the `pg` Node.js client with the direct PostgreSQL connection string. The connection string is **only in `scripts/*.js`** and never exposed to the browser.

### 10.5 Configuring CORS for Production

1. Open [console.neon.tech](https://console.neon.tech) → your project → **Data API** → **Settings**.
2. Add your production domain (e.g., `https://myapp.pages.dev`) to the allowed origins list.
3. For local dev, `localhost` origins are typically permitted by default.

---

## 11. Extension Points and Roadmap

### 11.1 Near-Term (v1.1)

1. **Project CRUD** — `ProjectFormDialog` exists; wire `POST /projects` and `DELETE /projects?id=eq.{id}` via Data API.
2. **Functional Excel import** — `scripts/import-projects.cjs` pipeline exists for Node.js; wire to UI upload handler on `/import` page.
3. **Replace static filter dropdowns** — Replace `strategies`, `tactics`, `plans` arrays from `mock-data.ts` with `useQuery(apiGetStrategies)` etc.
4. **CORS for production** — Configure Neon Data API allowed origins before deploying.
5. **Role-based access control** — Gate `/admin/users` and mutation endpoints to `admin` role only.

### 11.2 Mid-Term (v1.2)

6. **Per-year budget editing** — Inline-editable budget rows on the project detail page.
7. **Excel export** — Filtered project list and dashboard export via SheetJS.
8. **Auth + roles** — Session-based; `users` table; role enum `{admin, officer, viewer}`.
9. **Audit log** — `audit_events(id, actor, action, entity, entity_id, diff, at)`.

### 11.3 Long-Term (v2.0)

10. **Approval workflow** — `draft → submitted → approved → active → completed`.
11. **Actual vs. planned tracking** — `project_disbursements(project_id, year, quarter, amount, note)`.
12. **Citizen-facing view** — Read-only subset at `/public` with no auth.

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
- **Auth guard is currently disabled.** Do not re-enable `if (!session) return <RedirectToSignIn />` in `AppLayout.tsx` until the auth stability issues are resolved. See §9.1 for current auth status.
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

---

*End of document.*
