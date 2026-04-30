import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import type {
  DBStrategy, DBTactic, DBPlan, DBProject, DBProjectBudget,
  DBProjectAnnotation, DBDepartment, DBAuditEvent, DBEquipment,
  AuthUser, ProjectCreateInput, EquipmentCreateInput,
  ProjectListParams, ProjectListResult, ProjectRow, ProjectDetail,
  EquipmentListResult, DashboardData, ImportResult, StrategyProgress,
} from "./api";
import type { Status } from "./mock-data";

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export const serverGetStrategies = createServerFn({ method: "GET" })
  .handler(async () => (await getSql()`SELECT * FROM strategies ORDER BY id`) as DBStrategy[]);

export const serverGetTactics = createServerFn({ method: "GET" })
  .handler(async () => (await getSql()`SELECT * FROM tactics ORDER BY code`) as DBTactic[]);

export const serverGetPlans = createServerFn({ method: "GET" })
  .handler(async () => (await getSql()`SELECT * FROM plans ORDER BY id`) as DBPlan[]);

export const serverGetDepartments = createServerFn({ method: "GET" })
  .handler(async () => {
    const rows = await getSql()`SELECT DISTINCT department FROM projects WHERE department IS NOT NULL ORDER BY department`;
    return rows.map((r: any) => r.department as string);
  });

// ---------------------------------------------------------------------------
// Projects list
// ---------------------------------------------------------------------------
export const serverGetProjects = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ProjectListParams }) => {
    const { page = 1, limit = 12, search, status, strategy_id, plan_id, department } = data ?? {};
    const offset = (page - 1) * limit;

    const allProjects = await getSql()`
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
    const result: ProjectListResult = {
      data: paged.map((r: any) => ({ ...r, total_budget: Number(r.total_budget) })) as ProjectRow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
    return result;
  });

// ---------------------------------------------------------------------------
// Single project
// ---------------------------------------------------------------------------
export const serverGetProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const rows = await getSql()`
      SELECT p.*,
        row_to_json(pl.*) AS plan_data,
        row_to_json(t.*) AS tactic_data,
        row_to_json(s.*) AS strategy_data
      FROM projects p
      LEFT JOIN plans pl ON p.plan_id = pl.id
      LEFT JOIN tactics t ON pl.tactic_id = t.id
      LEFT JOIN strategies s ON t.strategy_id = s.id
      WHERE p.id = ${data.id}
      LIMIT 1
    `;
    if (!rows.length) return null;
    const r: any = rows[0];

    const budgetRows = await getSql()`SELECT year, amount FROM project_budgets WHERE project_id = ${data.id}`;
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
    } as ProjectDetail;
  });

// ---------------------------------------------------------------------------
// Patch project status
// ---------------------------------------------------------------------------
export const serverPatchProjectStatus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number; status: Status } }) => {
    await getSql()`UPDATE projects SET status = ${data.status} WHERE id = ${data.id}`;
  });

// ---------------------------------------------------------------------------
// Create project
// ---------------------------------------------------------------------------
export const serverCreateProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ProjectCreateInput }) => {
    const { budgets, ...p } = data;
    const rows = await getSql()`
      INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, amendment_version)
      VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
              ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
              ${p.status || "planning"}, ${p.source_sheet ?? null}, ${p.amendment_version ?? null})
      RETURNING *
    `;
    const created = rows[0] as DBProject;
    if (budgets) {
      for (const [year, amount] of Object.entries(budgets)) {
        if (Number(amount) > 0) {
          await getSql()`INSERT INTO project_budgets (project_id, year, amount) VALUES (${created.id}, ${Number(year)}, ${Number(amount)})`;
        }
      }
    }
    return created;
  });

// ---------------------------------------------------------------------------
// Update project
// ---------------------------------------------------------------------------
export const serverUpdateProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } & ProjectCreateInput }) => {
    const { id, budgets, ...p } = data;
    await getSql()`
      UPDATE projects SET
        name = ${p.name}, objective = ${p.objective ?? null}, target = ${p.target ?? null},
        kpi = ${p.kpi ?? null}, expected_result = ${p.expected_result ?? null},
        department = ${p.department ?? null}, plan_id = ${p.plan_id ?? null},
        status = ${p.status || "planning"}, source_sheet = ${p.source_sheet ?? null},
        amendment_version = ${p.amendment_version ?? null}
      WHERE id = ${id}
    `;
    if (budgets) {
      await getSql()`DELETE FROM project_budgets WHERE project_id = ${id}`;
      for (const [year, amount] of Object.entries(budgets)) {
        if (Number(amount) > 0) {
          await getSql()`INSERT INTO project_budgets (project_id, year, amount) VALUES (${id}, ${Number(year)}, ${Number(amount)})`;
        }
      }
    }
  });

// ---------------------------------------------------------------------------
// Update budgets only
// ---------------------------------------------------------------------------
export const serverUpdateBudgets = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { projectId: number; budgets: Record<number, number> } }) => {
    await getSql()`DELETE FROM project_budgets WHERE project_id = ${data.projectId}`;
    for (const [year, amount] of Object.entries(data.budgets)) {
      if (Number(amount) > 0) {
        await getSql()`INSERT INTO project_budgets (project_id, year, amount) VALUES (${data.projectId}, ${Number(year)}, ${Number(amount)})`;
      }
    }
  });

// ---------------------------------------------------------------------------
// Delete project
// ---------------------------------------------------------------------------
export const serverDeleteProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    await getSql()`DELETE FROM project_budgets WHERE project_id = ${data.id}`;
    await getSql()`DELETE FROM project_annotations WHERE project_id = ${data.id}`;
    await getSql()`DELETE FROM projects WHERE id = ${data.id}`;
  });

// ---------------------------------------------------------------------------
// Batch import projects
// ---------------------------------------------------------------------------
export const serverBatchImportProjects = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { rows: ProjectCreateInput[] } }) => {
    const result: ImportResult = { inserted: 0, updated: 0, warnings: [], errors: [] };
    const createdIds: number[] = [];
    try {
      for (let i = 0; i < data.rows.length; i++) {
        const { budgets, ...p } = data.rows[i];
        try {
          const created = await getSql()`
            INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, amendment_version)
            VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
                    ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
                    ${p.status || "planning"}, ${p.source_sheet ?? null}, ${p.amendment_version ?? null})
            RETURNING id
          `;
          const projId = (created[0] as any).id;
          createdIds.push(projId);
          result.inserted++;
          if (budgets) {
            for (const [year, amount] of Object.entries(budgets)) {
              if (Number(amount) > 0) {
                await getSql()`INSERT INTO project_budgets (project_id, year, amount) VALUES (${projId}, ${Number(year)}, ${Number(amount)})`;
              }
            }
          }
        } catch (err: any) {
          result.errors.push(`แถว ${i + 1} "${data.rows[i].name}": ${err.message}`);
        }
      }
    } catch (err: any) {
      for (const cid of createdIds) {
        try {
          await getSql()`DELETE FROM project_budgets WHERE project_id = ${cid}`;
          await getSql()`DELETE FROM projects WHERE id = ${cid}`;
        } catch { /* best effort */ }
      }
      result.errors.push(`การนำเข้าล้มเหลว (rollback แล้ว): ${err.message}`);
      result.inserted = 0;
    }
    return result;
  });

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
export const serverGetEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { search?: string; page?: number; limit?: number } }) => {
    const { page = 1, limit = 10, search } = data ?? {};
    const offset = (page - 1) * limit;
    const allRows = await getSql()`SELECT * FROM equipment ORDER BY id`;
    let filtered = allRows as any[];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((r: any) => r.item_type?.toLowerCase().includes(s));
    }
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    const result: EquipmentListResult = {
      data: paged as DBEquipment[],
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    return result;
  });

export const serverCreateEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: EquipmentCreateInput }) => {
    const rows = await getSql()`
      INSERT INTO equipment (plan_name, category, item_type, target, department, budget_2566, budget_2567, budget_2568, budget_2569, budget_2570)
      VALUES (${data.plan_name ?? null}, ${data.category ?? null}, ${data.item_type ?? null},
              ${data.target ?? null}, ${data.department ?? null},
              ${data.budget_2566 ?? 0}, ${data.budget_2567 ?? 0}, ${data.budget_2568 ?? 0},
              ${data.budget_2569 ?? 0}, ${data.budget_2570 ?? 0})
      RETURNING *
    `;
    return rows[0] as DBEquipment;
  });

export const serverUpdateEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } & EquipmentCreateInput }) => {
    await getSql()`
      UPDATE equipment SET
        plan_name = ${data.plan_name ?? null}, category = ${data.category ?? null},
        item_type = ${data.item_type ?? null}, target = ${data.target ?? null},
        department = ${data.department ?? null},
        budget_2566 = ${data.budget_2566 ?? 0}, budget_2567 = ${data.budget_2567 ?? 0},
        budget_2568 = ${data.budget_2568 ?? 0}, budget_2569 = ${data.budget_2569 ?? 0},
        budget_2570 = ${data.budget_2570 ?? 0}
      WHERE id = ${data.id}
    `;
  });

export const serverDeleteEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    await getSql()`DELETE FROM equipment WHERE id = ${data.id}`;
  });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const serverGetDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
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
    } as DashboardData;
  });

// ---------------------------------------------------------------------------
// Departments (normalized)
// ---------------------------------------------------------------------------
export const serverGetDepartmentsList = createServerFn({ method: "GET" })
  .handler(async () => (await getSql()`SELECT * FROM departments ORDER BY name`) as DBDepartment[]);

export const serverCreateDepartment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { name: string } }) => {
    const rows = await getSql()`INSERT INTO departments (name) VALUES (${data.name}) RETURNING *`;
    return rows[0] as DBDepartment;
  });

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export const serverLogAudit = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { action: DBAuditEvent["action"]; entity: string; entity_id?: number | null; before?: any; after?: any } }) => {
    await getSql()`
      INSERT INTO audit_events (action, entity, entity_id, before, after)
      VALUES (${data.action}, ${data.entity}, ${data.entity_id ?? null},
              ${data.before ? JSON.stringify(data.before) : null},
              ${data.after ? JSON.stringify(data.after) : null})
    `;
  });

export const serverGetAuditEvents = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { entity?: string; entity_id?: number; limit?: number } }) => {
    const lim = data.limit ?? 50;
    if (data.entity && data.entity_id) {
      return (await getSql()`SELECT * FROM audit_events WHERE entity = ${data.entity} AND entity_id = ${data.entity_id} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
    } else if (data.entity) {
      return (await getSql()`SELECT * FROM audit_events WHERE entity = ${data.entity} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
    }
    return (await getSql()`SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
  });
