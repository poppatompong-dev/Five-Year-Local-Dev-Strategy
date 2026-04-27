import { neon } from "@neondatabase/serverless";
import type { Status } from "./mock-data";

// ---------------------------------------------------------------------------
// DB connection via Neon serverless driver (works in browser & edge)
// ---------------------------------------------------------------------------
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL as string;
if (!DATABASE_URL) {
  console.error("VITE_DATABASE_URL is not set — add it to .env");
}

const sql = neon(DATABASE_URL);

// ---------------------------------------------------------------------------
// Types (DB row shapes)
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

export type AnnotationType =
  | 'amendment' | 'change' | 'addition' | 'transfer' | 'merge'
  | 'duplicate' | 'budget_source' | 'status_note' | 'form_index' | 'cover_metadata';

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

export interface DBDepartment {
  id: number;
  name: string;
}

export interface DBAuditEvent {
  id: number;
  action: 'create' | 'update' | 'delete' | 'import' | 'status_change';
  entity: string;
  entity_id: number | null;
  before: any | null;
  after: any | null;
  timestamp: string;
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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
  role?: string;
  banned?: boolean;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export async function apiGetStrategies(): Promise<DBStrategy[]> {
  return (await sql`SELECT * FROM strategies ORDER BY id`) as DBStrategy[];
}

export async function apiGetTactics(): Promise<DBTactic[]> {
  return (await sql`SELECT * FROM tactics ORDER BY code`) as DBTactic[];
}

export async function apiGetPlans(): Promise<DBPlan[]> {
  return (await sql`SELECT * FROM plans ORDER BY id`) as DBPlan[];
}

export async function apiGetDepartments(): Promise<string[]> {
  const rows = await sql`SELECT DISTINCT department FROM projects WHERE department IS NOT NULL ORDER BY department`;
  return rows.map((r: any) => r.department as string);
}

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
  const { page = 1, limit = 12, search, status, strategy_id, plan_id, department } = params;
  const offset = (page - 1) * limit;

  // Fetch all with joins then filter in JS (neon tagged templates don't support dynamic WHERE easily)
  const allProjects = await sql`
    SELECT
      p.*,
      pl.name AS plan_name,
      t.code AS tactic_code,
      t.name AS tactic_name,
      s.id AS strategy_id,
      s.name AS strategy_name,
      COALESCE((SELECT SUM(pb.amount) FROM project_budgets pb WHERE pb.project_id = p.id), 0)::numeric AS total_budget
    FROM projects p
    LEFT JOIN plans pl ON p.plan_id = pl.id
    LEFT JOIN tactics t ON pl.tactic_id = t.id
    LEFT JOIN strategies s ON t.strategy_id = s.id
    ORDER BY p.id
  `;

  let filtered = allProjects as any[];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((r) => r.name?.toLowerCase().includes(s));
  }
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (department) {
    const d = department.toLowerCase();
    filtered = filtered.filter((r) => r.department?.toLowerCase().includes(d));
  }
  if (plan_id) {
    filtered = filtered.filter((r) => r.plan_id === plan_id);
  } else if (strategy_id) {
    filtered = filtered.filter((r) => r.strategy_id === strategy_id);
  }

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);
  const data: ProjectRow[] = paged.map((r: any) => ({ ...r, total_budget: Number(r.total_budget) }));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export interface ProjectDetail extends DBProject {
  plan: DBPlan | null;
  tactic: DBTactic | null;
  strategy: DBStrategy | null;
  budgets: Record<number, number>;
  total_budget: number;
}

export async function apiGetProject(id: number): Promise<ProjectDetail | null> {
  const rows = await sql`
    SELECT p.*,
      row_to_json(pl.*) AS plan_data,
      row_to_json(t.*) AS tactic_data,
      row_to_json(s.*) AS strategy_data
    FROM projects p
    LEFT JOIN plans pl ON p.plan_id = pl.id
    LEFT JOIN tactics t ON pl.tactic_id = t.id
    LEFT JOIN strategies s ON t.strategy_id = s.id
    WHERE p.id = ${id}
    LIMIT 1
  `;
  if (!rows.length) return null;
  const r: any = rows[0];

  const budgetRows = await sql`SELECT year, amount FROM project_budgets WHERE project_id = ${id}`;
  const budgets: Record<number, number> = {};
  let totalBudget = 0;
  budgetRows.forEach((b: any) => {
    budgets[b.year] = Number(b.amount);
    totalBudget += Number(b.amount);
  });

  return {
    ...r,
    plan: r.plan_data ?? null,
    tactic: r.tactic_data ?? null,
    strategy: r.strategy_data ?? null,
    budgets,
    total_budget: totalBudget,
  };
}

export async function apiPatchProjectStatus(id: number, status: Status): Promise<void> {
  await sql`UPDATE projects SET status = ${status} WHERE id = ${id}`;
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
  const { budgets, ...p } = input;
  const rows = await sql`
    INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, amendment_version)
    VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
            ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
            ${p.status || 'planning'}, ${p.source_sheet ?? null}, ${p.amendment_version ?? null})
    RETURNING *
  `;
  const created = rows[0] as DBProject;

  if (budgets) {
    for (const [year, amount] of Object.entries(budgets)) {
      if (Number(amount) > 0) {
        await sql`INSERT INTO project_budgets (project_id, year, amount) VALUES (${created.id}, ${Number(year)}, ${Number(amount)})`;
      }
    }
  }

  return created;
}

export async function apiUpdateProject(id: number, input: ProjectCreateInput): Promise<void> {
  const { budgets, ...p } = input;
  await sql`
    UPDATE projects SET
      name = ${p.name}, objective = ${p.objective ?? null}, target = ${p.target ?? null},
      kpi = ${p.kpi ?? null}, expected_result = ${p.expected_result ?? null},
      department = ${p.department ?? null}, plan_id = ${p.plan_id ?? null},
      status = ${p.status || 'planning'}, source_sheet = ${p.source_sheet ?? null},
      amendment_version = ${p.amendment_version ?? null}
    WHERE id = ${id}
  `;

  if (budgets) {
    await sql`DELETE FROM project_budgets WHERE project_id = ${id}`;
    for (const [year, amount] of Object.entries(budgets)) {
      if (Number(amount) > 0) {
        await sql`INSERT INTO project_budgets (project_id, year, amount) VALUES (${id}, ${Number(year)}, ${Number(amount)})`;
      }
    }
  }
}

export async function apiUpdateBudgets(projectId: number, budgets: Record<number, number>): Promise<void> {
  await sql`DELETE FROM project_budgets WHERE project_id = ${projectId}`;
  for (const [year, amount] of Object.entries(budgets)) {
    if (Number(amount) > 0) {
      await sql`INSERT INTO project_budgets (project_id, year, amount) VALUES (${projectId}, ${Number(year)}, ${Number(amount)})`;
    }
  }
}

export async function apiDeleteProject(id: number): Promise<void> {
  await sql`DELETE FROM project_budgets WHERE project_id = ${id}`;
  await sql`DELETE FROM project_annotations WHERE project_id = ${id}`;
  await sql`DELETE FROM projects WHERE id = ${id}`;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  warnings: string[];
  errors: string[];
}

export async function apiBatchImportProjects(rows: ProjectCreateInput[]): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, warnings: [], errors: [] };
  const createdIds: number[] = [];

  try {
    for (let i = 0; i < rows.length; i++) {
      const { budgets, ...p } = rows[i];
      try {
        const created = await sql`
          INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, amendment_version)
          VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
                  ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
                  ${p.status || 'planning'}, ${p.source_sheet ?? null}, ${p.amendment_version ?? null})
          RETURNING id
        `;
        const projId = (created[0] as any).id;
        createdIds.push(projId);
        result.inserted++;

        if (budgets) {
          for (const [year, amount] of Object.entries(budgets)) {
            if (Number(amount) > 0) {
              await sql`INSERT INTO project_budgets (project_id, year, amount) VALUES (${projId}, ${Number(year)}, ${Number(amount)})`;
            }
          }
        }
      } catch (err: any) {
        result.errors.push(`แถว ${i + 1} "${rows[i].name}": ${err.message}`);
      }
    }
  } catch (err: any) {
    for (const cid of createdIds) {
      try {
        await sql`DELETE FROM project_budgets WHERE project_id = ${cid}`;
        await sql`DELETE FROM projects WHERE id = ${cid}`;
      } catch { /* best effort */ }
    }
    result.errors.push(`การนำเข้าล้มเหลว (rollback แล้ว): ${err.message}`);
    result.inserted = 0;
  }

  return result;
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

  const allRows = await sql`SELECT * FROM equipment ORDER BY id`;
  let filtered = allRows as any[];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((r: any) => r.item_type?.toLowerCase().includes(s));
  }
  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);
  return { data: paged as DBEquipment[], total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function apiCreateEquipment(input: EquipmentCreateInput): Promise<DBEquipment> {
  const rows = await sql`
    INSERT INTO equipment (plan_name, category, item_type, target, department, budget_2566, budget_2567, budget_2568, budget_2569, budget_2570)
    VALUES (${input.plan_name ?? null}, ${input.category ?? null}, ${input.item_type ?? null},
            ${input.target ?? null}, ${input.department ?? null},
            ${input.budget_2566 ?? 0}, ${input.budget_2567 ?? 0}, ${input.budget_2568 ?? 0},
            ${input.budget_2569 ?? 0}, ${input.budget_2570 ?? 0})
    RETURNING *
  `;
  return rows[0] as DBEquipment;
}

export async function apiUpdateEquipment(id: number, input: EquipmentCreateInput): Promise<void> {
  await sql`
    UPDATE equipment SET
      plan_name = ${input.plan_name ?? null}, category = ${input.category ?? null},
      item_type = ${input.item_type ?? null}, target = ${input.target ?? null},
      department = ${input.department ?? null},
      budget_2566 = ${input.budget_2566 ?? 0}, budget_2567 = ${input.budget_2567 ?? 0},
      budget_2568 = ${input.budget_2568 ?? 0}, budget_2569 = ${input.budget_2569 ?? 0},
      budget_2570 = ${input.budget_2570 ?? 0}
    WHERE id = ${id}
  `;
}

export async function apiDeleteEquipment(id: number): Promise<void> {
  await sql`DELETE FROM equipment WHERE id = ${id}`;
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
  const [projects, strategies, plans, budgets, tactics] = await Promise.all([
    sql`SELECT id, status, department, plan_id FROM projects`,
    sql`SELECT * FROM strategies ORDER BY id`,
    sql`SELECT id, tactic_id FROM plans`,
    sql`SELECT project_id, year, amount FROM project_budgets`,
    sql`SELECT id, strategy_id FROM tactics`,
  ]);

  const budgetByProject = new Map<number, number>();
  const budgetByYear = new Map<number, { total: number; count: Set<number> }>();
  budgets.forEach((b: any) => {
    budgetByProject.set(b.project_id, (budgetByProject.get(b.project_id) ?? 0) + Number(b.amount));
    const yb = budgetByYear.get(b.year) ?? { total: 0, count: new Set<number>() };
    yb.total += Number(b.amount);
    yb.count.add(b.project_id);
    budgetByYear.set(b.year, yb);
  });

  const STATUS_LABEL: Record<Status, string> = {
    planning: "วางแผน", in_progress: "ดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
  };

  const byStatus = (["planning", "in_progress", "completed", "cancelled"] as Status[]).map((s) => ({
    status: s, label: STATUS_LABEL[s], count: projects.filter((p: any) => p.status === s).length,
  }));

  const byStrategy = strategies.map((s: any) => {
    const sTacticIds = tactics.filter((t: any) => t.strategy_id === s.id).map((t: any) => t.id);
    const sPlanIds = plans.filter((p: any) => sTacticIds.includes(p.tactic_id)).map((p: any) => p.id);
    const sProjects = projects.filter((p: any) => p.plan_id !== null && sPlanIds.includes(p.plan_id));
    const totalBudget = sProjects.reduce((sum: number, p: any) => sum + (budgetByProject.get(p.id) ?? 0), 0);
    return { id: s.id, name: s.short_name ?? s.name, full_name: s.name, project_count: sProjects.length, total_budget: totalBudget };
  });

  const byStrategyProgress: StrategyProgress[] = strategies.map((s: any) => {
    const sTacticIds = tactics.filter((t: any) => t.strategy_id === s.id).map((t: any) => t.id);
    const sPlanIds = plans.filter((p: any) => sTacticIds.includes(p.tactic_id)).map((p: any) => p.id);
    const sProjects = projects.filter((p: any) => p.plan_id !== null && sPlanIds.includes(p.plan_id));
    const totalBudget = sProjects.reduce((sum: number, p: any) => sum + (budgetByProject.get(p.id) ?? 0), 0);
    const cnt = (st: Status) => sProjects.filter((p: any) => p.status === st).length;
    const completedCount = cnt("completed");
    const totalCount = sProjects.length;
    return {
      id: s.id,
      name: s.short_name ?? s.name,
      full_name: s.name,
      project_count: totalCount,
      total_budget: totalBudget,
      planning: cnt("planning"),
      in_progress: cnt("in_progress"),
      completed: completedCount,
      cancelled: cnt("cancelled"),
      completion_rate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  });

  const byYear = [2566, 2567, 2568, 2569, 2570].map((year) => {
    const yb = budgetByYear.get(year);
    return { year, label: String(year), total: yb?.total ?? 0, project_count: yb?.count.size ?? 0 };
  });

  const deptMap = new Map<string, { count: number; budget: number }>();
  projects.forEach((p: any) => {
    if (!p.department) return;
    const cur = deptMap.get(p.department) ?? { count: 0, budget: 0 };
    cur.count += 1;
    cur.budget += budgetByProject.get(p.id) ?? 0;
    deptMap.set(p.department, cur);
  });
  const topDepts = [...deptMap.entries()]
    .map(([dept, v]) => ({ department: dept, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const depts = new Set(projects.map((p: any) => p.department).filter(Boolean));

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

// ---------------------------------------------------------------------------
// Departments (normalized)
// ---------------------------------------------------------------------------
export async function apiGetDepartmentsList(): Promise<DBDepartment[]> {
  return (await sql`SELECT * FROM departments ORDER BY name`) as DBDepartment[];
}

export async function apiCreateDepartment(name: string): Promise<DBDepartment> {
  const rows = await sql`INSERT INTO departments (name) VALUES (${name}) RETURNING *`;
  return rows[0] as DBDepartment;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export async function apiLogAudit(event: {
  action: DBAuditEvent['action'];
  entity: string;
  entity_id?: number | null;
  before?: any;
  after?: any;
}): Promise<void> {
  await sql`
    INSERT INTO audit_events (action, entity, entity_id, before, after)
    VALUES (${event.action}, ${event.entity}, ${event.entity_id ?? null},
            ${event.before ? JSON.stringify(event.before) : null},
            ${event.after ? JSON.stringify(event.after) : null})
  `;
}

export async function apiGetAuditEvents(params: {
  entity?: string;
  entity_id?: number;
  limit?: number;
} = {}): Promise<DBAuditEvent[]> {
  const lim = params.limit ?? 50;
  if (params.entity && params.entity_id) {
    return (await sql`SELECT * FROM audit_events WHERE entity = ${params.entity} AND entity_id = ${params.entity_id} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
  } else if (params.entity) {
    return (await sql`SELECT * FROM audit_events WHERE entity = ${params.entity} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
  }
  return (await sql`SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
}

// ---------------------------------------------------------------------------
// User management stubs (disabled — auth removed)
// ---------------------------------------------------------------------------
export async function apiGetUsers(): Promise<AuthUser[]> {
  return [];
}

export async function apiCreateUser(_data: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  throw new Error("Auth disabled");
}

export async function apiDeleteUser(_userId: string): Promise<void> {
  throw new Error("Auth disabled");
}
