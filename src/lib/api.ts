import { authClient } from "@/auth";
import type { Status } from "./mock-data";
import { plans as staticPlans, tactics as staticTactics } from "./mock-data";

const BASE = import.meta.env.VITE_NEON_DATA_API_URL as string;

// ---------------------------------------------------------------------------
// Core fetch helper — injects Bearer JWT from active Neon Auth session
// ---------------------------------------------------------------------------
async function getToken(): Promise<string> {
  try {
    const session = await authClient.getSession();
    return (session as any)?.data?.session?.token ?? "";
  } catch {
    return "";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/** Returns { data, total } using PostgREST Prefer: count=exact + Content-Range header */
async function apiFetchWithCount<T>(path: string): Promise<{ data: T[]; total: number }> {
  const token = await getToken();
  const separator = path.includes("?") ? "&" : "?";

  const res = await fetch(`${BASE}${path}${separator}limit=1000`, {
    headers: {
      "Content-Type": "application/json",
      Prefer: "count=exact",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const contentRange = res.headers.get("Content-Range") ?? "";
  const total = contentRange.includes("/")
    ? parseInt(contentRange.split("/")[1], 10)
    : 0;

  const data = (await res.json()) as T[];
  return { data, total };
}

// ---------------------------------------------------------------------------
// Types returned by the Data API (PostgREST row shapes)
// ---------------------------------------------------------------------------
export interface DBStrategy {
  id: number;
  name: string;
  short_name: string | null;
  department: string | null;
}

export interface DBTactic {
  id: number;
  code: string;
  name: string;
  strategy_id: number;
}

export interface DBPlan {
  id: number;
  name: string;
  tactic_id: number;
}

export interface DBProject {
  id: number;
  name: string;
  objective: string | null;
  target: string | null;
  kpi: string | null;
  expected_result: string | null;
  department: string | null;
  plan_id: number | null;
  status: Status;
  source_sheet: string | null;
  amendment_version: string | null;
  source_row: number | null;
  import_batch_id: string | null;
  created_at: string;
}

export interface DBProjectBudget {
  id: number;
  project_id: number;
  year: number;
  amount: number;
  ordinance_amount: number;
}

// ---------------------------------------------------------------------------
// Text Box Annotation Types (from OOXML drawing extraction)
// ---------------------------------------------------------------------------
export type AnnotationType =
  | 'amendment'
  | 'change'
  | 'addition'
  | 'transfer'
  | 'merge'
  | 'duplicate'
  | 'budget_source'
  | 'status_note'
  | 'form_index'
  | 'cover_metadata';

export interface DBProjectAnnotation {
  id: number;
  project_id: number | null;
  source_sheet: string;
  source_row: number;
  annotation_type: AnnotationType;
  raw_text: string;
  amendment_type: string | null;
  amendment_number: number | null;
  amendment_year: number | null;
  target_plan: string | null;
  target_ref: string | null;
  funding_source: string | null;
  created_at: string;
}

export interface DBSheetMetadata {
  id: number;
  sheet_name: string;
  sheet_index: number;
  form_type: string | null;
  form_title: string | null;
  col_layout: '17-col' | '12-col' | 'summary' | 'equipment' | 'other' | null;
  row_count: number | null;
  strategy_num: string | null;
  tactic_code: string | null;
  plan_name: string | null;
}

export interface DBDocumentMetadata {
  id: number;
  key: string;
  value: string;
}

export interface DBEquipment {
  id: number;
  plan_name: string | null;
  category: string | null;
  item_type: string | null;
  target: string | null;
  department: string | null;
  budget_2566: number;
  budget_2567: number;
  budget_2568: number;
  budget_2569: number;
  budget_2570: number;
}

// ---------------------------------------------------------------------------
// User management (Better Auth tables exposed via Data API)
// ---------------------------------------------------------------------------
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
}

// Neon Auth's user tables are not exposed via the PostgREST Data API, and the
// hosted Better Auth instance doesn't expose a public `/admin/list-users`
// endpoint. As a pragmatic workaround for the admin console, we mirror any
// user created through this UI into localStorage and merge with the current
// session user. This keeps the "Add user" flow working end-to-end without
// requiring DB schema changes.
const USER_STORE_KEY = "app.admin.users.v1";

function readLocalUsers(): AuthUser[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_STORE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser[]) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: AuthUser[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
}

export async function apiGetUsers(): Promise<AuthUser[]> {
  const local = readLocalUsers();
  // Merge with the current session user so at least "you" always appear,
  // even on a fresh browser.
  try {
    const session = await authClient.getSession();
    const u = (session as any)?.data?.user;
    if (u?.id && !local.find((x) => x.id === u.id)) {
      local.unshift({
        id: String(u.id),
        name: u.name ?? u.email ?? "",
        email: u.email ?? "",
        email_verified: Boolean(u.emailVerified ?? u.email_verified ?? false),
        image: u.image ?? null,
        created_at: u.createdAt ?? u.created_at ?? new Date().toISOString(),
        updated_at: u.updatedAt ?? u.updated_at ?? new Date().toISOString(),
      });
    }
  } catch {
    // session lookup is best-effort
  }
  return local.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Create a user via Better Auth email/password sign-up.
 *
 * The Neon-hosted Better Auth enforces two server-side rules that cannot be
 * disabled from the client:
 *   1. `email` must pass Zod email validation (must have a domain).
 *   2. `password` must be at least 8 characters.
 *
 * To keep the admin UX simple (username-style logins like "pop"), the caller
 * can pass a bare username — we synthesise an email using a local domain so
 * Better Auth accepts it. The real login identifier remains the email.
 */
export async function apiCreateUser(data: {
  name: string;
  /** Either a bare username ("pop") or a full email. */
  email: string;
  password: string;
}): Promise<void> {
  const AUTH_BASE = import.meta.env.VITE_NEON_AUTH_URL as string;
  const rawEmail = data.email.trim();
  const email = rawEmail.includes("@")
    ? rawEmail
    : `${rawEmail.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@nakhonsawan.local`;

  const res = await fetch(`${AUTH_BASE}/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: window.location.origin,
    },
    body: JSON.stringify({
      name: data.name || rawEmail,
      email,
      password: data.password,
      callbackURL: window.location.origin,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = (body as any)?.code;
    const msg = (body as any)?.message ?? `HTTP ${res.status}`;
    // Friendlier Thai errors for the most common validation failures
    if (code === "PASSWORD_TOO_SHORT") {
      throw new Error("รหัสผ่านสั้นเกินไป — ต้องมีอย่างน้อย 8 ตัวอักษร");
    }
    if (code === "VALIDATION_ERROR") {
      throw new Error(`ข้อมูลไม่ถูกต้อง: ${msg}`);
    }
    if (code === "USER_ALREADY_EXISTS" || res.status === 409) {
      throw new Error("ชื่อผู้ใช้/อีเมลนี้ถูกใช้งานแล้ว");
    }
    throw new Error(msg);
  }

  // Mirror the new user into the local admin list so the UI can show it.
  const body = (await res.json().catch(() => ({}))) as any;
  const u = body?.user;
  if (u?.id) {
    const list = readLocalUsers();
    if (!list.find((x) => x.id === u.id)) {
      list.push({
        id: String(u.id),
        name: u.name ?? data.name ?? email,
        email: u.email ?? email,
        email_verified: Boolean(u.emailVerified ?? false),
        image: u.image ?? null,
        created_at: u.createdAt ?? new Date().toISOString(),
        updated_at: u.updatedAt ?? new Date().toISOString(),
      });
      writeLocalUsers(list);
    }
  }
}

export async function apiDeleteUser(userId: string): Promise<void> {
  // Remove from the local mirror; Better Auth account deletion isn't exposed
  // by the hosted Neon Auth instance, so this removes the user from the admin
  // console only. The auth record itself persists in Neon and can still log
  // in — this matches what the UI can actually deliver today.
  const list = readLocalUsers().filter((u) => u.id !== userId);
  writeLocalUsers(list);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export const apiGetStrategies = () =>
  apiFetch<DBStrategy[]>("/strategies?order=id.asc");

export const apiGetTactics = () =>
  apiFetch<DBTactic[]>("/tactics?order=code.asc");

export const apiGetPlans = () =>
  apiFetch<DBPlan[]>("/plans?order=id.asc");

export const apiGetDepartments = async (): Promise<string[]> => {
  const rows = await apiFetch<{ department: string }[]>(
    "/projects?select=department&department=not.is.null&order=department.asc"
  );
  return [...new Set(rows.map((r) => r.department).filter(Boolean))];
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export interface ProjectListParams {
  search?: string;
  strategy_id?: number;
  plan_id?: number;
  department?: string;
  status?: Status;
  year?: number;
  page?: number;
  limit?: number;
}

export interface ProjectRow extends DBProject {
  plan_name: string | null;
  tactic_code: string | null;
  tactic_name: string | null;
  strategy_id: number | null;
  strategy_name: string | null;
  total_budget: number;
}

export interface ProjectListResult {
  data: ProjectRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function apiGetProjects(params: ProjectListParams = {}): Promise<ProjectListResult> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { page = 1, limit = 12, search, status, strategy_id, plan_id, department, year: _year } = params;
  const offset = (page - 1) * limit;

  const qs = new URLSearchParams();
  qs.set("select", [
    "id,name,objective,target,kpi,expected_result,department,plan_id,status,source_sheet,created_at",
    "plans(name,tactics(code,name,strategies(id,name)))",
    "project_budgets(year,amount)",
  ].join(","));
  qs.set("order", "id.asc");
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));

  // strategy_id has no direct column — derive matching plan IDs from static reference data
  let effectivePlanId = plan_id;
  let inPlanIds: number[] | null = null;
  if (strategy_id && !plan_id) {
    const tacticIds = staticTactics
      .filter((t) => t.strategy_id === strategy_id)
      .map((t) => t.id);
    inPlanIds = staticPlans
      .filter((p) => tacticIds.includes(p.tactic_id))
      .map((p) => p.id);
  }

  if (search) qs.set("name", `ilike.*${search}*`);
  if (status) qs.set("status", `eq.${status}`);
  if (effectivePlanId) qs.set("plan_id", `eq.${effectivePlanId}`);
  else if (inPlanIds) qs.set("plan_id", `in.(${inPlanIds.join(",")})`);
  if (department) qs.set("department", `ilike.*${department}*`);

  const rows = await apiFetch<any[]>(`/projects?${qs}`);

  // Count using Prefer: count=exact — fetch with same filters but no joins, limit=0
  const countQs = new URLSearchParams();
  countQs.set("select", "id");
  if (search) countQs.set("name", `ilike.*${search}*`);
  if (status) countQs.set("status", `eq.${status}`);
  if (effectivePlanId) countQs.set("plan_id", `eq.${effectivePlanId}`);
  else if (inPlanIds) countQs.set("plan_id", `in.(${inPlanIds.join(",")})`);
  if (department) countQs.set("department", `ilike.*${department}*`);

  const countToken = await getToken();
  const countRes = await fetch(`${BASE}/projects?${countQs}`, {
    headers: {
      "Content-Type": "application/json",
      Prefer: "count=exact",
      ...(countToken ? { Authorization: `Bearer ${countToken}` } : {}),
    },
  });
  const cr = countRes.headers.get("Content-Range") ?? "";
  const total = cr.includes("/") ? parseInt(cr.split("/")[1], 10) : rows.length;

  const data: ProjectRow[] = rows.map((r) => {
    const budgets: Record<number, number> = {};
    let totalBudget = 0;
    (r.project_budgets ?? []).forEach((b: DBProjectBudget) => {
      budgets[b.year] = Number(b.amount);
      totalBudget += Number(b.amount);
    });
    const plan = r.plans;
    const tactic = plan?.tactics;
    const strategy = tactic?.strategies;
    return {
      ...r,
      plan_name: plan?.name ?? null,
      tactic_code: tactic?.code ?? null,
      tactic_name: tactic?.name ?? null,
      strategy_id: strategy?.id ?? null,
      strategy_name: strategy?.name ?? null,
      total_budget: totalBudget,
    };
  });

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export interface ProjectDetail extends DBProject {
  plan: DBPlan | null;
  tactic: DBTactic | null;
  strategy: DBStrategy | null;
  budgets: Record<number, number>;
  total_budget: number;
}

export async function apiGetProject(id: number): Promise<ProjectDetail | null> {
  const rows = await apiFetch<any[]>(
    `/projects?id=eq.${id}&select=*,plans(*,tactics(*,strategies(*))),project_budgets(year,amount)&limit=1`
  );
  if (!rows.length) return null;
  const r = rows[0];
  const budgets: Record<number, number> = {};
  let total = 0;
  (r.project_budgets ?? []).forEach((b: DBProjectBudget) => {
    budgets[b.year] = Number(b.amount);
    total += Number(b.amount);
  });
  return {
    ...r,
    plan: r.plans ?? null,
    tactic: r.plans?.tactics ?? null,
    strategy: r.plans?.tactics?.strategies ?? null,
    budgets,
    total_budget: total,
  };
}

export async function apiPatchProjectStatus(id: number, status: Status): Promise<void> {
  await apiFetch(`/projects?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface ProjectCreateInput {
  name: string;
  objective?: string;
  target?: string;
  kpi?: string;
  expected_result?: string;
  department?: string;
  plan_id?: number | null;
  status?: Status;
  source_sheet?: string;
  amendment_version?: string;
  budgets?: Record<number, number>;
}

export async function apiCreateProject(input: ProjectCreateInput): Promise<DBProject> {
  const { budgets, ...projectData } = input;
  const rows = await apiFetch<DBProject[]>("/projects", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...projectData,
      status: projectData.status || "planning",
    }),
  });
  const created = rows[0];

  if (budgets && created) {
    const budgetRows = Object.entries(budgets)
      .filter(([, amount]) => amount > 0)
      .map(([year, amount]) => ({
        project_id: created.id,
        year: Number(year),
        amount,
      }));
    if (budgetRows.length > 0) {
      await apiFetch("/project_budgets", {
        method: "POST",
        body: JSON.stringify(budgetRows),
      });
    }
  }

  return created;
}

export async function apiUpdateProject(id: number, input: ProjectCreateInput): Promise<void> {
  const { budgets, ...projectData } = input;
  await apiFetch(`/projects?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(projectData),
  });

  if (budgets) {
    await apiFetch(`/project_budgets?project_id=eq.${id}`, { method: "DELETE" });
    const budgetRows = Object.entries(budgets)
      .filter(([, amount]) => amount > 0)
      .map(([year, amount]) => ({
        project_id: id,
        year: Number(year),
        amount,
      }));
    if (budgetRows.length > 0) {
      await apiFetch("/project_budgets", {
        method: "POST",
        body: JSON.stringify(budgetRows),
      });
    }
  }
}

export async function apiDeleteProject(id: number): Promise<void> {
  await apiFetch(`/project_budgets?project_id=eq.${id}`, { method: "DELETE" });
  await apiFetch(`/project_annotations?project_id=eq.${id}`, { method: "DELETE" });
  await apiFetch(`/projects?id=eq.${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export interface EquipmentCreateInput {
  plan_name?: string;
  category?: string;
  item_type?: string;
  target?: string;
  department?: string;
  budget_2566?: number;
  budget_2567?: number;
  budget_2568?: number;
  budget_2569?: number;
  budget_2570?: number;
}

export async function apiCreateEquipment(input: EquipmentCreateInput): Promise<DBEquipment> {
  const rows = await apiFetch<DBEquipment[]>("/equipment", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...input,
      budget_2566: input.budget_2566 ?? 0,
      budget_2567: input.budget_2567 ?? 0,
      budget_2568: input.budget_2568 ?? 0,
      budget_2569: input.budget_2569 ?? 0,
      budget_2570: input.budget_2570 ?? 0,
    }),
  });
  return rows[0];
}

export async function apiUpdateEquipment(id: number, input: EquipmentCreateInput): Promise<void> {
  await apiFetch(`/equipment?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function apiDeleteEquipment(id: number): Promise<void> {
  await apiFetch(`/equipment?id=eq.${id}`, { method: "DELETE" });
}
export interface EquipmentListResult {
  data: DBEquipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function apiGetEquipment(params: { search?: string; page?: number; limit?: number } = {}): Promise<EquipmentListResult> {
  const { page = 1, limit = 10, search } = params;
  const offset = (page - 1) * limit;
  const qs = new URLSearchParams();
  qs.set("select", "*");
  qs.set("order", "id.asc");
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  if (search) qs.set("item_type", `ilike.*${search}*`);

  const rows = await apiFetch<DBEquipment[]>(`/equipment?${qs}`);

  const eqCountToken = await getToken();
  const eqCountQs = new URLSearchParams({ select: "id" });
  if (search) eqCountQs.set("item_type", `ilike.*${search}*`);
  const eqCountRes = await fetch(`${BASE}/equipment?${eqCountQs}`, {
    headers: {
      "Content-Type": "application/json",
      Prefer: "count=exact",
      ...(eqCountToken ? { Authorization: `Bearer ${eqCountToken}` } : {}),
    },
  });
  const eqCr = eqCountRes.headers.get("Content-Range") ?? "";
  const total = eqCr.includes("/") ? parseInt(eqCr.split("/")[1], 10) : rows.length;
  return { data: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface StrategyProgress {
  id: number;
  name: string;
  full_name: string;
  project_count: number;
  total_budget: number;
  planning: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  completion_rate: number;
}

export interface DashboardData {
  totalProjects: number;
  totalBudget: number;
  totalStrategies: number;
  totalPlans: number;
  totalDepartments: number;
  byStatus: { status: Status; label: string; count: number }[];
  byStrategy: { id: number; name: string; full_name: string; project_count: number; total_budget: number }[];
  byStrategyProgress: StrategyProgress[];
  byYear: { year: number; label: string; total: number; project_count: number }[];
  topDepts: { department: string; count: number; budget: number }[];
}

export async function apiGetDashboard(): Promise<DashboardData> {
  const [projects, strategies, plans, budgets] = await Promise.all([
    apiFetch<DBProject[]>("/projects?select=id,status,department,plan_id"),
    apiFetch<DBStrategy[]>("/strategies?order=id.asc"),
    apiFetch<DBPlan[]>("/plans?select=id,tactic_id"),
    apiFetch<DBProjectBudget[]>("/project_budgets?select=project_id,year,amount"),
  ]);

  const tactics = await apiFetch<DBTactic[]>("/tactics?select=id,strategy_id");

  const budgetByProject = new Map<number, number>();
  const budgetByYear = new Map<number, { total: number; count: Set<number> }>();
  budgets.forEach((b) => {
    budgetByProject.set(b.project_id, (budgetByProject.get(b.project_id) ?? 0) + Number(b.amount));
    const yb = budgetByYear.get(b.year) ?? { total: 0, count: new Set() };
    yb.total += Number(b.amount);
    yb.count.add(b.project_id);
    budgetByYear.set(b.year, yb);
  });

  const STATUS_LABEL: Record<Status, string> = {
    planning: "วางแผน", in_progress: "ดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
  };

  const byStatus = (["planning", "in_progress", "completed", "cancelled"] as Status[]).map((s) => ({
    status: s, label: STATUS_LABEL[s], count: projects.filter((p) => p.status === s).length,
  }));

  const byStrategy = strategies.map((s) => {
    const sTacticIds = tactics.filter((t) => t.strategy_id === s.id).map((t) => t.id);
    const sPlanIds = plans.filter((p) => sTacticIds.includes(p.tactic_id)).map((p) => p.id);
    const sProjects = projects.filter((p) => p.plan_id !== null && sPlanIds.includes(p.plan_id!));
    const totalBudget = sProjects.reduce((sum, p) => sum + (budgetByProject.get(p.id) ?? 0), 0);
    return { id: s.id, name: s.short_name ?? s.name, full_name: s.name, project_count: sProjects.length, total_budget: totalBudget };
  });

  const byStrategyProgress: StrategyProgress[] = strategies.map((s) => {
    const sTacticIds = tactics.filter((t) => t.strategy_id === s.id).map((t) => t.id);
    const sPlanIds = plans.filter((p) => sTacticIds.includes(p.tactic_id)).map((p) => p.id);
    const sProjects = projects.filter((p) => p.plan_id !== null && sPlanIds.includes(p.plan_id!));
    const totalBudget = sProjects.reduce((sum, p) => sum + (budgetByProject.get(p.id) ?? 0), 0);
    const cnt = (st: Status) => sProjects.filter((p) => p.status === st).length;
    const completed = cnt("completed");
    const total = sProjects.length;
    return {
      id: s.id,
      name: s.short_name ?? s.name,
      full_name: s.name,
      project_count: total,
      total_budget: totalBudget,
      planning: cnt("planning"),
      in_progress: cnt("in_progress"),
      completed,
      cancelled: cnt("cancelled"),
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const byYear = [2566, 2567, 2568, 2569, 2570].map((year) => {
    const yb = budgetByYear.get(year);
    return { year, label: String(year), total: yb?.total ?? 0, project_count: yb?.count.size ?? 0 };
  });

  const deptMap = new Map<string, { count: number; budget: number }>();
  projects.forEach((p) => {
    if (!p.department) return;
    const cur = deptMap.get(p.department) ?? { count: 0, budget: 0 };
    cur.count += 1;
    cur.budget += budgetByProject.get(p.id) ?? 0;
    deptMap.set(p.department, cur);
  });
  const topDepts = [...deptMap.entries()]
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const depts = new Set(projects.map((p) => p.department).filter(Boolean));

  return {
    totalProjects: projects.length,
    totalBudget: [...budgetByProject.values()].reduce((s, v) => s + v, 0),
    totalStrategies: strategies.length,
    totalPlans: plans.length,
    totalDepartments: depts.size,
    byStatus,
    byStrategy,
    byStrategyProgress,
    byYear,
    topDepts,
  };
}
