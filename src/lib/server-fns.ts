import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { getServerSession, requireAdmin } from "./session.server";
import type {
  DBStrategy, DBTactic, DBPlan, DBProject, DBProjectBudget,
  DBProjectAnnotation, DBDepartment, DBAuditEvent, DBEquipment,
  AuthUser, ProjectCreateInput, EquipmentCreateInput,
  ProjectListParams, ProjectListResult, ProjectRow, ProjectDetail,
  EquipmentListResult, DashboardData, ImportResult, StrategyProgress,
  PublicDataSummary, AnnotationLabelOption,
} from "./api";
import type { Status } from "./mock-data";

const VALID_STATUSES: Status[] = ["not_set", "planning", "in_progress", "completed", "cancelled"];
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
    .toLowerCase();
}

function compactSearchText(value: unknown) {
  return normalizeSearchText(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function searchTokens(value: unknown) {
  const normalized = normalizeSearchText(value).trim();
  const compact = compactSearchText(normalized);
  return Array.from(new Set([normalized, compact].filter(Boolean)));
}

function annotationSearchText(annotation: DBProjectAnnotation) {
  const parts = [
    annotation.raw_text,
    annotation.annotation_type,
    annotation.amendment_type,
    annotation.target_plan,
    annotation.target_ref,
    annotation.funding_source,
  ];
  if (annotation.amendment_number && annotation.amendment_year) {
    parts.push(`${annotation.amendment_number}/${annotation.amendment_year}`);
    parts.push(`ครั้งที่ ${annotation.amendment_number}/${annotation.amendment_year}`);
    parts.push(`ครั้งที่ ${annotation.amendment_number} / ${annotation.amendment_year}`);
    if (annotation.amendment_type) {
      parts.push(`${annotation.amendment_type} ${annotation.amendment_number}/${annotation.amendment_year}`);
      parts.push(`${annotation.amendment_type} ครั้งที่ ${annotation.amendment_number}/${annotation.amendment_year}`);
    }
  }
  return parts.filter(Boolean).join(" ");
}

function annotationProjectLinkTokens(annotation: DBProjectAnnotation) {
  const parts = [
    annotation.target_plan,
    annotation.target_ref,
    annotation.source_sheet,
  ];
  if (annotation.amendment_number && annotation.amendment_year) {
    parts.push(`${annotation.amendment_number}/${annotation.amendment_year}`);
    parts.push(`ครั้งที่ ${annotation.amendment_number}/${annotation.amendment_year}`);
    if (annotation.amendment_type) {
      parts.push(`${annotation.amendment_type} ${annotation.amendment_number}/${annotation.amendment_year}`);
    }
  }
  return searchTokens(parts.filter(Boolean).join(" "));
}

function annotationDropdownLabel(annotation: DBProjectAnnotation) {
  if (annotation.amendment_number && annotation.amendment_year) {
    const prefix = annotation.amendment_type ? `${annotation.amendment_type} ` : "";
    return `${prefix}ครั้งที่ ${annotation.amendment_number}/${annotation.amendment_year}`;
  }
  return [
    annotation.target_ref,
    annotation.target_plan,
    annotation.funding_source,
    annotation.raw_text,
  ]
    .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
    .find(Boolean) ?? "";
}

function toAnnotationLabelOptions(annotations: DBProjectAnnotation[]) {
  const labelMap = new Map<string, AnnotationLabelOption>();
  annotations.forEach((annotation) => {
    const label = annotationDropdownLabel(annotation);
    if (!label) return;
    const value = label;
    const prev = labelMap.get(value);
    labelMap.set(value, {
      label: label.length > 90 ? `${label.slice(0, 87)}...` : label,
      value,
      count: (prev?.count ?? 0) + 1,
    });
  });

  return [...labelMap.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "th"))
    .slice(0, 120);
}

function matchesSmartSearch(needles: string[], values: unknown[]) {
  if (!needles.length) return true;
  const normalizedHaystack = values.map(normalizeSearchText).join(" ");
  const compactHaystack = compactSearchText(normalizedHaystack);
  return needles.every((needle) => (
    normalizedHaystack.includes(needle) ||
    compactHaystack.includes(compactSearchText(needle))
  ));
}

function matchesAnySmartSearch(needles: string[], values: unknown[]) {
  if (!needles.length) return false;
  const normalizedHaystack = values.map(normalizeSearchText).join(" ");
  const compactHaystack = compactSearchText(normalizedHaystack);
  return needles.some((needle) => (
    normalizedHaystack.includes(needle) ||
    compactHaystack.includes(compactSearchText(needle))
  ));
}

function getLinkedAnnotations(
  row: { id: number },
  byProject: Map<number, DBProjectAnnotation[]>,
) {
  const candidates = byProject.get(row.id) ?? [];
  const seen = new Set<number>();
  return candidates.filter((annotation) => {
    if (seen.has(annotation.id)) return false;
    seen.add(annotation.id);
    return true;
  });
}

function attachAnnotationSummary(row: any, annotations: DBProjectAnnotation[]): ProjectRow {
  const types = Array.from(new Set(annotations.map((annotation) => annotation.annotation_type)));
  return {
    ...row,
    total_budget: Number(row.total_budget),
    annotation_count: annotations.length,
    annotation_types: types,
    annotation_preview: annotations[0]?.raw_text ?? null,
  } as ProjectRow;
}

async function getAnnotationsByProjectIds(sql: any, projectIds: number[]) {
  const ids = Array.from(new Set(projectIds.filter(Boolean)));
  if (!ids.length) return new Map<number, DBProjectAnnotation[]>();

  const annotations = (await sql`
    SELECT *
    FROM project_annotations
    WHERE project_id = ANY(${ids}::int[])
    ORDER BY source_sheet, source_row, id
  `) as DBProjectAnnotation[];

  return buildAnnotationsByProject(annotations);
}

function buildAnnotationsByProject(annotations: DBProjectAnnotation[]) {
  const annotationsByProject = new Map<number, DBProjectAnnotation[]>();
  annotations.forEach((annotation) => {
    if (annotation.project_id !== null) {
      const list = annotationsByProject.get(annotation.project_id) ?? [];
      list.push(annotation);
      annotationsByProject.set(annotation.project_id, list);
    }
  });
  return annotationsByProject;
}

let annotationLabelCache:
  | { expiresAt: number; value: AnnotationLabelOption[] }
  | null = null;

function actorFromSession(session: AdminSession) {
  return {
    userId: session.userId ?? null,
    username: session.username ?? null,
  };
}

const columnCache = new Map<string, boolean>();

async function hasColumn(sql: any, tableName: string, columnName: string) {
  const key = `${tableName}.${columnName}`;
  if (columnCache.has(key)) return columnCache.get(key)!;
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    LIMIT 1
  `;
  const exists = rows.length > 0;
  columnCache.set(key, exists);
  return exists;
}

async function isAdminViewer() {
  try {
    const session = await getServerSession();
    return !!session.data?.userId;
  } catch {
    return false;
  }
}

async function applyPublishedFilter(sql: any, rows: any[], tableName: "projects" | "equipment") {
  if (await isAdminViewer()) return rows;
  if (!(await hasColumn(sql, tableName, "publish_status"))) return rows;
  const publicRows = rows.filter((row) => row.publish_status === "published" || row.publish_status === "reviewed");
  return publicRows.length > 0 ? publicRows : rows;
}

function maxIsoDate(values: Array<string | null | undefined>) {
  const times = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString();
}

function auditSystemMeta(entity: string, action: DBAuditEvent["action"]) {
  return {
    eventId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: "server-fn",
    entity,
    action,
    recordedAt: new Date().toISOString(),
  };
}

async function insertAuditEvent(
  sql: any,
  session: AdminSession,
  data: { action: DBAuditEvent["action"]; entity: string; entity_id?: number | null; before?: any; after?: any },
) {
  await sql`
    INSERT INTO audit_events (action, entity, entity_id, before, after)
    VALUES (${data.action}, ${data.entity}, ${data.entity_id ?? null},
            ${data.before ? JSON.stringify(data.before) : null},
            ${JSON.stringify({ system: auditSystemMeta(data.entity, data.action), actor: actorFromSession(session), ...(data.after ?? {}) })})
  `;
}

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
    const sql = getSql();
    const rows = await sql`SELECT * FROM projects WHERE department IS NOT NULL ORDER BY department`;
    const filtered = await applyPublishedFilter(sql, rows as any[], "projects");
    return Array.from(new Set(filtered.map((r: any) => r.department as string).filter(Boolean))).sort();
  });

// ---------------------------------------------------------------------------
// Projects list
// ---------------------------------------------------------------------------
export const serverGetProjects = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ProjectListParams }) => {
    const {
      page = 1,
      limit = 12,
      search,
      annotation_search,
      annotation_type,
      has_annotations,
      status,
      strategy_id,
      plan_id,
      department,
      year,
    } = data ?? {};
    const offset = (page - 1) * limit;
    const sql = getSql();

    const allProjectRows = await sql`
      SELECT
        p.*,
        pl.name AS plan_name,
        t.code AS tactic_code,
        t.name AS tactic_name,
        s.id AS strategy_id,
        s.name AS strategy_name,
        COALESCE((SELECT SUM(pb.amount) FROM project_budgets pb WHERE pb.project_id = p.id), 0)::numeric AS total_budget,
        COALESCE((SELECT SUM(pb.amount) FROM project_budgets pb WHERE pb.project_id = p.id AND pb.year = ${year ?? null}), 0)::numeric AS year_budget
      FROM projects p
      LEFT JOIN plans pl ON p.plan_id = pl.id
      LEFT JOIN tactics t ON pl.tactic_id = t.id
      LEFT JOIN strategies s ON t.strategy_id = s.id
      ORDER BY p.id
    `;
    const allProjects = await applyPublishedFilter(sql, allProjectRows as any[], "projects");
    const needsGlobalAnnotations = Boolean(search || annotation_search || annotation_type || has_annotations);
    const allAnnotations = needsGlobalAnnotations
      ? ((await sql`
          SELECT *
          FROM project_annotations
          ORDER BY source_sheet, source_row, id
        `) as DBProjectAnnotation[])
      : [];
    let annotationsByProject = buildAnnotationsByProject(allAnnotations);

    let filtered = allProjects as any[];
    if (search) {
      const needles = searchTokens(search);
      filtered = filtered.filter((r) => {
        const annotations = getLinkedAnnotations(r, annotationsByProject);
        return matchesSmartSearch(needles, [
          r.name,
          r.objective,
          r.target,
          r.kpi,
          r.expected_result,
          r.department,
          r.plan_name,
          r.tactic_code,
          r.tactic_name,
          r.strategy_name,
          r.source_sheet,
          r.amendment_version,
          ...annotations.map(annotationSearchText),
        ]);
      });
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
    if (year) filtered = filtered.filter((r) => Number(r.year_budget) > 0);
    if (has_annotations) {
      filtered = filtered.filter((r) => getLinkedAnnotations(r, annotationsByProject).length > 0);
    }
    if (annotation_type) {
      filtered = filtered.filter((r) =>
        getLinkedAnnotations(r, annotationsByProject)
          .some((annotation) => annotation.annotation_type === annotation_type),
      );
    }
    if (annotation_search) {
      const needles = searchTokens(annotation_search);
      const matchingUnlinkedAnnotations = allAnnotations.filter((annotation) =>
        annotation.project_id === null &&
        matchesSmartSearch(needles, [annotationSearchText(annotation)]),
      );
      filtered = filtered.filter((r) => {
        const linkedAnnotations = getLinkedAnnotations(r, annotationsByProject);
        const projectTextMatches = matchesSmartSearch(needles, [
          r.name,
          r.objective,
          r.target,
          r.kpi,
          r.expected_result,
          r.department,
          r.plan_name,
          r.tactic_code,
          r.tactic_name,
          r.strategy_name,
          r.source_sheet,
          r.source_row,
          r.amendment_version,
        ]);
        const linkedAnnotationMatches = linkedAnnotations
          .some((annotation) => matchesSmartSearch(needles, [annotationSearchText(annotation)]));
        if (projectTextMatches || linkedAnnotationMatches) return true;

        return matchingUnlinkedAnnotations.some((annotation) =>
          matchesAnySmartSearch(annotationProjectLinkTokens(annotation), [
            r.name,
            r.objective,
            r.target,
            r.kpi,
            r.expected_result,
            r.department,
            r.plan_name,
            r.tactic_code,
            r.tactic_name,
            r.strategy_name,
            r.source_sheet,
            r.source_row,
            r.amendment_version,
          ]),
        );
      });
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    if (!needsGlobalAnnotations) {
      annotationsByProject = await getAnnotationsByProjectIds(sql, paged.map((row: any) => Number(row.id)));
    }
    const result: ProjectListResult = {
      data: paged.map((r: any) => attachAnnotationSummary(
        { ...r, total_budget: Number(year ? r.year_budget : r.total_budget) },
        getLinkedAnnotations(r, annotationsByProject),
      )),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
    return result;
  });

export const serverBulkPatchProjectStatusByFilter = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { filters: ProjectListParams; status: Status } }) => {
    const session = await requireAdmin();
    if (!VALID_STATUSES.includes(data.status)) {
      throw new Response(JSON.stringify({ error: "INVALID_STATUS" }), { status: 400 });
    }

    const {
      search,
      annotation_search,
      annotation_type,
      has_annotations,
      status,
      strategy_id,
      plan_id,
      department,
      year,
    } = data.filters ?? {};
    const sql = getSql();

    const allProjectRows = await sql`
      SELECT
        p.*,
        pl.name AS plan_name,
        t.code AS tactic_code,
        t.name AS tactic_name,
        s.id AS strategy_id,
        s.name AS strategy_name,
        COALESCE((SELECT SUM(pb.amount) FROM project_budgets pb WHERE pb.project_id = p.id), 0)::numeric AS total_budget,
        COALESCE((SELECT SUM(pb.amount) FROM project_budgets pb WHERE pb.project_id = p.id AND pb.year = ${year ?? null}), 0)::numeric AS year_budget
      FROM projects p
      LEFT JOIN plans pl ON p.plan_id = pl.id
      LEFT JOIN tactics t ON pl.tactic_id = t.id
      LEFT JOIN strategies s ON t.strategy_id = s.id
      ORDER BY p.id
    `;
    const allProjects = await applyPublishedFilter(sql, allProjectRows as any[], "projects");
    const allAnnotations = (await sql`
      SELECT *
      FROM project_annotations
      ORDER BY source_sheet, source_row, id
    `) as DBProjectAnnotation[];
    const annotationsByProject = new Map<number, DBProjectAnnotation[]>();
    allAnnotations.forEach((annotation) => {
      if (annotation.project_id !== null) {
        const list = annotationsByProject.get(annotation.project_id) ?? [];
        list.push(annotation);
        annotationsByProject.set(annotation.project_id, list);
      }
    });

    let filtered = allProjects as any[];
    if (search) {
      const needles = searchTokens(search);
      filtered = filtered.filter((r) => {
        const annotations = getLinkedAnnotations(r, annotationsByProject);
        return matchesSmartSearch(needles, [
          r.name,
          r.objective,
          r.target,
          r.kpi,
          r.expected_result,
          r.department,
          r.plan_name,
          r.tactic_code,
          r.tactic_name,
          r.strategy_name,
          r.source_sheet,
          r.amendment_version,
          ...annotations.map(annotationSearchText),
        ]);
      });
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
    if (year) filtered = filtered.filter((r) => Number(r.year_budget) > 0);
    if (has_annotations) {
      filtered = filtered.filter((r) => getLinkedAnnotations(r, annotationsByProject).length > 0);
    }
    if (annotation_type) {
      filtered = filtered.filter((r) =>
        getLinkedAnnotations(r, annotationsByProject)
          .some((annotation) => annotation.annotation_type === annotation_type),
      );
    }
    if (annotation_search) {
      const needles = searchTokens(annotation_search);
      const matchingUnlinkedAnnotations = allAnnotations.filter((annotation) =>
        annotation.project_id === null &&
        matchesSmartSearch(needles, [annotationSearchText(annotation)]),
      );
      filtered = filtered.filter((r) => {
        const linkedAnnotations = getLinkedAnnotations(r, annotationsByProject);
        const projectTextMatches = matchesSmartSearch(needles, [
          r.name,
          r.objective,
          r.target,
          r.kpi,
          r.expected_result,
          r.department,
          r.plan_name,
          r.tactic_code,
          r.tactic_name,
          r.strategy_name,
          r.source_sheet,
          r.source_row,
          r.amendment_version,
        ]);
        const linkedAnnotationMatches = linkedAnnotations
          .some((annotation) => matchesSmartSearch(needles, [annotationSearchText(annotation)]));
        if (projectTextMatches || linkedAnnotationMatches) return true;

        return matchingUnlinkedAnnotations.some((annotation) =>
          matchesAnySmartSearch(annotationProjectLinkTokens(annotation), [
            r.name,
            r.objective,
            r.target,
            r.kpi,
            r.expected_result,
            r.department,
            r.plan_name,
            r.tactic_code,
            r.tactic_name,
            r.strategy_name,
            r.source_sheet,
            r.source_row,
            r.amendment_version,
          ]),
        );
      });
    }

    const ids = filtered.map((row) => Number((row as any).id)).filter(Boolean);
    if (!ids.length) return { updated: 0 };

    const beforeRows = await sql`SELECT id, name, status FROM projects WHERE id = ANY(${ids}::int[]) ORDER BY id`;
    const updatedRows = await sql`UPDATE projects SET status = ${data.status} WHERE id = ANY(${ids}::int[]) RETURNING id`;
    await insertAuditEvent(sql, session, {
      action: "status_change",
      entity: "project",
      entity_id: null,
      before: { projects: beforeRows, selection: "filtered" },
      after: { ids: updatedRows.map((row: any) => row.id), status: data.status },
    });
    return { updated: updatedRows.length };
  });

export const serverGetProjectAnnotationLabels = createServerFn({ method: "GET" })
  .handler(async (): Promise<AnnotationLabelOption[]> => {
    const now = Date.now();
    if (annotationLabelCache && annotationLabelCache.expiresAt > now) {
      return annotationLabelCache.value;
    }

    const rows = (await getSql()`
      SELECT *
      FROM project_annotations
      ORDER BY amendment_year DESC NULLS LAST, amendment_number DESC NULLS LAST, source_sheet, source_row, id
    `) as DBProjectAnnotation[];
    const value = toAnnotationLabelOptions(rows);
    annotationLabelCache = { value, expiresAt: now + 5 * 60_000 };
    return value;
  });

// ---------------------------------------------------------------------------
// Single project
// ---------------------------------------------------------------------------
export const serverGetProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const sql = getSql();
    const rows = await sql`
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
    const visibleRows = await applyPublishedFilter(sql, [r], "projects");
    if (!visibleRows.length) return null;

    const budgetRows = await sql`SELECT year, amount FROM project_budgets WHERE project_id = ${data.id}`;
    const budgets: Record<number, number> = {};
    let totalBudget = 0;
    budgetRows.forEach((b: any) => {
      budgets[b.year] = Number(b.amount);
      totalBudget += Number(b.amount);
    });
    const annotations = (await sql`
      SELECT *
      FROM project_annotations
      WHERE project_id = ${data.id}
      ORDER BY source_row, id
    `) as DBProjectAnnotation[];

    return {
      ...r,
      plan: r.plan_data ?? null,
      tactic: r.tactic_data ?? null,
      strategy: r.strategy_data ?? null,
      budgets,
      total_budget: totalBudget,
      annotations,
    } as ProjectDetail;
  });

// ---------------------------------------------------------------------------
// Patch project status
// ---------------------------------------------------------------------------
export const serverPatchProjectStatus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number; status: Status } }) => {
    const session = await requireAdmin();
    if (!VALID_STATUSES.includes(data.status)) {
      throw new Response(JSON.stringify({ error: "INVALID_STATUS" }), { status: 400 });
    }
    const sql = getSql();
    const beforeRows = await sql`SELECT id, name, status FROM projects WHERE id = ${data.id} LIMIT 1`;
    const rows = await sql`UPDATE projects SET status = ${data.status} WHERE id = ${data.id} RETURNING id, status`;
    if (!rows.length) {
      throw new Response(JSON.stringify({ error: "PROJECT_NOT_FOUND" }), { status: 404 });
    }
    await insertAuditEvent(sql, session, {
      action: "status_change",
      entity: "project",
      entity_id: data.id,
      before: beforeRows[0] ?? null,
      after: { status: (rows[0] as any).status },
    });
    return { updated: rows.length };
  });

export const serverBulkPatchProjectStatus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { ids: number[]; status: Status } }) => {
    const session = await requireAdmin();
    if (!data.ids.length) return { updated: 0 };
    if (!VALID_STATUSES.includes(data.status)) {
      throw new Response(JSON.stringify({ error: "INVALID_STATUS" }), { status: 400 });
    }
    const sql = getSql();
    const beforeRows = await sql`SELECT id, name, status FROM projects WHERE id = ANY(${data.ids}::int[]) ORDER BY id`;
    const r = await sql`UPDATE projects SET status = ${data.status} WHERE id = ANY(${data.ids}::int[]) RETURNING id`;
    await insertAuditEvent(sql, session, {
      action: "status_change",
      entity: "project",
      entity_id: null,
      before: { projects: beforeRows },
      after: { ids: r.map((row: any) => row.id), status: data.status },
    });
    return { updated: r.length };
  });

// ---------------------------------------------------------------------------
// Create project
// ---------------------------------------------------------------------------
export const serverCreateProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ProjectCreateInput }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const { budgets, ...p } = data;
    const rows = await sql`
      INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, source_row, amendment_version)
      VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
              ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
              ${p.status || "planning"}, ${p.source_sheet ?? null}, ${p.source_row ?? null}, ${p.amendment_version ?? null})
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
    await insertAuditEvent(sql, session, {
      action: "create",
      entity: "project",
      entity_id: created.id,
      after: { project: created, budgets: budgets ?? {} },
    });
    return created;
  });

// ---------------------------------------------------------------------------
// Update project
// ---------------------------------------------------------------------------
export const serverUpdateProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } & ProjectCreateInput }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const { id, budgets, ...p } = data;
    const beforeProject = await sql`SELECT * FROM projects WHERE id = ${id} LIMIT 1`;
    const beforeBudgets = await sql`SELECT * FROM project_budgets WHERE project_id = ${id} ORDER BY year`;
    await sql`
      UPDATE projects SET
        name = ${p.name}, objective = ${p.objective ?? null}, target = ${p.target ?? null},
        kpi = ${p.kpi ?? null}, expected_result = ${p.expected_result ?? null},
        department = ${p.department ?? null}, plan_id = ${p.plan_id ?? null},
        status = ${p.status || "planning"}, source_sheet = ${p.source_sheet ?? null},
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
    const afterProject = await sql`SELECT * FROM projects WHERE id = ${id} LIMIT 1`;
    const afterBudgets = await sql`SELECT * FROM project_budgets WHERE project_id = ${id} ORDER BY year`;
    await insertAuditEvent(sql, session, {
      action: "update",
      entity: "project",
      entity_id: id,
      before: { project: beforeProject[0] ?? null, budgets: beforeBudgets },
      after: { project: afterProject[0] ?? null, budgets: afterBudgets },
    });
  });

// ---------------------------------------------------------------------------
// Update budgets only
// ---------------------------------------------------------------------------
export const serverUpdateBudgets = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { projectId: number; budgets: Record<number, number> } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const beforeBudgets = await sql`SELECT * FROM project_budgets WHERE project_id = ${data.projectId} ORDER BY year`;
    await sql`DELETE FROM project_budgets WHERE project_id = ${data.projectId}`;
    for (const [year, amount] of Object.entries(data.budgets)) {
      if (Number(amount) > 0) {
        await sql`INSERT INTO project_budgets (project_id, year, amount) VALUES (${data.projectId}, ${Number(year)}, ${Number(amount)})`;
      }
    }
    const afterBudgets = await sql`SELECT * FROM project_budgets WHERE project_id = ${data.projectId} ORDER BY year`;
    await insertAuditEvent(sql, session, {
      action: "update",
      entity: "project_budget",
      entity_id: data.projectId,
      before: { budgets: beforeBudgets },
      after: { budgets: afterBudgets },
    });
  });

// ---------------------------------------------------------------------------
// Delete project
// ---------------------------------------------------------------------------
export const serverDeleteProject = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const beforeProject = await sql`SELECT * FROM projects WHERE id = ${data.id} LIMIT 1`;
    const beforeBudgets = await sql`SELECT * FROM project_budgets WHERE project_id = ${data.id} ORDER BY year`;
    const beforeAnnotations = await sql`SELECT COUNT(*)::int AS count FROM project_annotations WHERE project_id = ${data.id}`;
    await sql`DELETE FROM project_budgets WHERE project_id = ${data.id}`;
    await sql`DELETE FROM project_annotations WHERE project_id = ${data.id}`;
    await sql`DELETE FROM projects WHERE id = ${data.id}`;
    await insertAuditEvent(sql, session, {
      action: "delete",
      entity: "project",
      entity_id: data.id,
      before: {
        project: beforeProject[0] ?? null,
        budgets: beforeBudgets,
        annotations: (beforeAnnotations[0] as any)?.count ?? 0,
      },
      after: { deleted: true },
    });
  });

// ---------------------------------------------------------------------------
// Batch import projects
// ---------------------------------------------------------------------------
export const serverBatchImportProjects = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { rows: ProjectCreateInput[] } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const result: ImportResult = { inserted: 0, updated: 0, warnings: [], errors: [] };
    const createdIds: number[] = [];
    try {
      for (let i = 0; i < data.rows.length; i++) {
        const { budgets, ...p } = data.rows[i];
        try {
          const created = await sql`
            INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet, source_row, amendment_version)
            VALUES (${p.name}, ${p.objective ?? null}, ${p.target ?? null}, ${p.kpi ?? null},
                    ${p.expected_result ?? null}, ${p.department ?? null}, ${p.plan_id ?? null},
                    ${p.status || "planning"}, ${p.source_sheet ?? null}, ${p.source_row ?? null}, ${p.amendment_version ?? null})
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
          result.errors.push(`แถว ${i + 1} "${data.rows[i].name}": ${err.message}`);
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
    if (result.inserted > 0 || result.errors.length > 0) {
      await insertAuditEvent(sql, session, {
        action: "import",
        entity: "project",
        entity_id: null,
        after: {
          requested: data.rows.length,
          inserted: result.inserted,
          errors: result.errors.length,
          createdIds,
        },
      });
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
    const sql = getSql();
    const allRows = await sql`SELECT * FROM equipment ORDER BY id`;
    let filtered = await applyPublishedFilter(sql, allRows as any[], "equipment");
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
    const session = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO equipment (plan_name, category, item_type, target, department, budget_2566, budget_2567, budget_2568, budget_2569, budget_2570)
      VALUES (${data.plan_name ?? null}, ${data.category ?? null}, ${data.item_type ?? null},
              ${data.target ?? null}, ${data.department ?? null},
              ${data.budget_2566 ?? 0}, ${data.budget_2567 ?? 0}, ${data.budget_2568 ?? 0},
              ${data.budget_2569 ?? 0}, ${data.budget_2570 ?? 0})
      RETURNING *
    `;
    const created = rows[0] as DBEquipment;
    await insertAuditEvent(sql, session, {
      action: "create",
      entity: "equipment",
      entity_id: created.id,
      after: { equipment: created },
    });
    return created;
  });

export const serverUpdateEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } & EquipmentCreateInput }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const beforeRows = await sql`SELECT * FROM equipment WHERE id = ${data.id} LIMIT 1`;
    await sql`
      UPDATE equipment SET
        plan_name = ${data.plan_name ?? null}, category = ${data.category ?? null},
        item_type = ${data.item_type ?? null}, target = ${data.target ?? null},
        department = ${data.department ?? null},
        budget_2566 = ${data.budget_2566 ?? 0}, budget_2567 = ${data.budget_2567 ?? 0},
        budget_2568 = ${data.budget_2568 ?? 0}, budget_2569 = ${data.budget_2569 ?? 0},
        budget_2570 = ${data.budget_2570 ?? 0}
      WHERE id = ${data.id}
    `;
    const afterRows = await sql`SELECT * FROM equipment WHERE id = ${data.id} LIMIT 1`;
    await insertAuditEvent(sql, session, {
      action: "update",
      entity: "equipment",
      entity_id: data.id,
      before: beforeRows[0] ?? null,
      after: { equipment: afterRows[0] ?? null },
    });
  });

export const serverDeleteEquipment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const beforeRows = await sql`SELECT * FROM equipment WHERE id = ${data.id} LIMIT 1`;
    await sql`DELETE FROM equipment WHERE id = ${data.id}`;
    await insertAuditEvent(sql, session, {
      action: "delete",
      entity: "equipment",
      entity_id: data.id,
      before: beforeRows[0] ?? null,
      after: { deleted: true },
    });
  });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const serverGetDashboard = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = getSql();
    const [projectRows, strategies, plans, budgets, tactics] = await Promise.all([
      sql`SELECT * FROM projects`,
      sql`SELECT * FROM strategies ORDER BY id`,
      sql`SELECT id, tactic_id FROM plans`,
      sql`SELECT project_id, year, amount FROM project_budgets`,
      sql`SELECT id, strategy_id FROM tactics`,
    ]);
    const projects = await applyPublishedFilter(sql, projectRows as any[], "projects");
    const visibleProjectIds = new Set(projects.map((p: any) => p.id));

    const budgetByProject = new Map<number, number>();
    const budgetByYear = new Map<number, { total: number; count: Set<number> }>();
    budgets.forEach((b: any) => {
      if (!visibleProjectIds.has(b.project_id)) return;
      budgetByProject.set(b.project_id, (budgetByProject.get(b.project_id) ?? 0) + Number(b.amount));
      const yb = budgetByYear.get(b.year) ?? { total: 0, count: new Set<number>() };
      yb.total += Number(b.amount);
      yb.count.add(b.project_id);
      budgetByYear.set(b.year, yb);
    });

    const STATUS_LABEL: Record<Status, string> = {
      not_set: "ยังไม่ได้ปรับสถานะ", planning: "วางแผน", in_progress: "ดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
    };

    const byStatus = (["not_set", "planning", "in_progress", "completed", "cancelled"] as Status[]).map((s) => ({
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

export const serverGetPublicDataSummary = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = getSql();
    const [projectMeta, equipmentMeta, auditMetaRows, batchRows, documentRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count, MAX(created_at) AS last_updated FROM projects`.catch(() => []),
      sql`SELECT COUNT(*)::int AS count FROM equipment`.catch(() => []),
      sql`SELECT MAX(timestamp) AS last_updated FROM audit_events WHERE action IN ('import','update','status_change')`.catch(() => []),
      sql`SELECT source_file, imported_at, status FROM import_batches ORDER BY imported_at DESC LIMIT 1`.catch(() => []),
      sql`SELECT key, value FROM document_metadata WHERE key IN ('source_file','workbook_name','document_title','last_imported_at')`.catch(() => []),
    ]);

    const documentMeta = new Map((documentRows as any[]).map((row) => [String(row.key), String(row.value)]));
    const latestBatch = (batchRows as any[])[0] as any | undefined;
    const sourceName =
      documentMeta.get("document_title") ??
      "แผนพัฒนาท้องถิ่น พ.ศ. 2566-2570 เทศบาลนครนครสวรรค์";
    const sourceFileName =
      latestBatch?.source_file ??
      documentMeta.get("source_file") ??
      documentMeta.get("workbook_name") ??
      "เอกสารแผนพัฒนาท้องถิ่นฉบับทางราชการ";

    return {
      sourceName,
      sourceFileName,
      dataStatus: "เผยแพร่แบบอ่านอย่างเดียว",
      validationStatus: latestBatch?.status ?? "validated",
      reconciliationStatus: "อยู่ระหว่างตรวจทานเทียบเอกสารต้นทาง",
      lastUpdated: maxIsoDate([
        (projectMeta as any[])[0]?.last_updated,
        (auditMetaRows as any[])[0]?.last_updated,
        latestBatch?.imported_at,
        documentMeta.get("last_imported_at"),
      ]),
      verificationNote: "ข้อมูลเผยแพร่สำหรับประชาชนเป็นข้อมูลอ่านอย่างเดียว และจะปรับปรุงเมื่อเจ้าหน้าที่ตรวจทานหรือเผยแพร่ข้อมูลชุดใหม่",
      projectCount: Number((projectMeta as any[])[0]?.count ?? 0),
      equipmentCount: Number((equipmentMeta as any[])[0]?.count ?? 0),
    } as PublicDataSummary;
  });

// ---------------------------------------------------------------------------
// Departments (normalized)
// ---------------------------------------------------------------------------
export const serverGetDepartmentsList = createServerFn({ method: "GET" })
  .handler(async () => (await getSql()`SELECT * FROM departments ORDER BY name`) as DBDepartment[]);

export const serverCreateDepartment = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { name: string } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const rows = await sql`INSERT INTO departments (name) VALUES (${data.name}) RETURNING *`;
    const created = rows[0] as DBDepartment;
    await insertAuditEvent(sql, session, {
      action: "create",
      entity: "department",
      entity_id: created.id,
      after: { department: created },
    });
    return created;
  });

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export const serverLogAudit = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { action: DBAuditEvent["action"]; entity: string; entity_id?: number | null; before?: any; after?: any } }) => {
    const session = await requireAdmin();
    await insertAuditEvent(getSql(), session, data);
  });

export const serverGetAuditEvents = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { entity?: string; entity_id?: number; limit?: number } }) => {
    await requireAdmin();
    const lim = data.limit ?? 50;
    if (data.entity && data.entity_id) {
      return (await getSql()`SELECT * FROM audit_events WHERE entity = ${data.entity} AND entity_id = ${data.entity_id} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
    } else if (data.entity) {
      return (await getSql()`SELECT * FROM audit_events WHERE entity = ${data.entity} ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
    }
    return (await getSql()`SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ${lim}`) as DBAuditEvent[];
  });

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------
function normalizeUsername(value: string) {
  return value.trim().toLowerCase().split("@")[0].replace(/[^a-z0-9._-]/g, "");
}

function toAuthUser(row: any): AuthUser {
  const username = String(row.username ?? "");
  return {
    id: String(row.id),
    name: username,
    email: `${username}@nakhonsawan.local`,
    email_verified: true,
    image: null,
    created_at: row.created_at,
    updated_at: row.created_at,
    role: "admin",
    banned: false,
  };
}

export const serverGetUsers = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireAdmin();
    const rows = await getSql()`SELECT id, username, created_at FROM admin_users ORDER BY id`;
    return rows.map(toAuthUser);
  });

export const serverCreateUser = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { username: string; password: string } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const username = normalizeUsername(data.username);
    if (!username) {
      throw new Response(JSON.stringify({ error: "INVALID_USERNAME" }), { status: 400 });
    }
    if (!data.password || data.password.length < 3) {
      throw new Response(JSON.stringify({ error: "PASSWORD_TOO_SHORT" }), { status: 400 });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const rows = await sql`
      INSERT INTO admin_users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, created_at
    `;
    if (!rows.length) {
      throw new Response(JSON.stringify({ error: "USER_EXISTS" }), { status: 409 });
    }
    await insertAuditEvent(sql, session, {
      action: "create",
      entity: "admin_user",
      entity_id: (rows[0] as any).id,
      after: { username },
    });
    return toAuthUser(rows[0]);
  });

export const serverDeleteUser = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string } }) => {
    const session = await requireAdmin();
    const id = Number(data.id);
    if (!Number.isInteger(id)) {
      throw new Response(JSON.stringify({ error: "INVALID_USER_ID" }), { status: 400 });
    }
    if (id === session.userId) {
      throw new Response(JSON.stringify({ error: "CANNOT_DELETE_SELF" }), { status: 400 });
    }
    const sql = getSql();
    const beforeRows = await sql`SELECT id, username, created_at FROM admin_users WHERE id = ${id} LIMIT 1`;
    const remaining = await sql`SELECT COUNT(*)::int AS count FROM admin_users WHERE id <> ${id}`;
    if (Number((remaining[0] as any).count) === 0) {
      throw new Response(JSON.stringify({ error: "CANNOT_DELETE_LAST_ADMIN" }), { status: 400 });
    }
    await sql`DELETE FROM admin_users WHERE id = ${id}`;
    await insertAuditEvent(sql, session, {
      action: "delete",
      entity: "admin_user",
      entity_id: id,
      before: beforeRows[0] ?? null,
      after: { deleted: true },
    });
  });

export const serverResetUserPassword = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { userId: number; newPassword: string } }) => {
    const session = await requireAdmin();
    if (!data.newPassword || data.newPassword.length < 4) {
      throw new Response(JSON.stringify({ error: "PASSWORD_TOO_SHORT" }), { status: 400 });
    }
    const sql = getSql();
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await sql`UPDATE admin_users SET password_hash = ${passwordHash} WHERE id = ${data.userId}`;
    await insertAuditEvent(sql, session, {
      action: "update",
      entity: "admin_user",
      entity_id: data.userId,
      after: { password_reset: true },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Hierarchy CRUD (Strategy / Tactic / Plan)
// ---------------------------------------------------------------------------
export const serverCreateStrategy = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { name: string; short_name: string; department: string } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO strategies (name, short_name, department)
      VALUES (${data.name}, ${data.short_name}, ${data.department})
      RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "create", entity: "strategy", entity_id: (rows[0] as any).id, after: rows[0] });
    return rows[0] as DBStrategy;
  });

export const serverUpdateStrategy = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number; name: string; short_name: string; department: string } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const before = await sql`SELECT * FROM strategies WHERE id = ${data.id} LIMIT 1`;
    const rows = await sql`
      UPDATE strategies SET name = ${data.name}, short_name = ${data.short_name}, department = ${data.department}
      WHERE id = ${data.id} RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "update", entity: "strategy", entity_id: data.id, before: before[0] ?? null, after: rows[0] });
    return rows[0] as DBStrategy;
  });

export const serverDeleteStrategy = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const childCount = await sql`SELECT COUNT(*)::int AS count FROM tactics WHERE strategy_id = ${data.id}`;
    if (Number((childCount[0] as any).count) > 0) {
      throw new Response(JSON.stringify({ error: "HAS_CHILDREN" }), { status: 409 });
    }
    const before = await sql`SELECT * FROM strategies WHERE id = ${data.id} LIMIT 1`;
    await sql`DELETE FROM strategies WHERE id = ${data.id}`;
    await insertAuditEvent(sql, session, { action: "delete", entity: "strategy", entity_id: data.id, before: before[0] ?? null, after: { deleted: true } });
  });

export const serverCreateTactic = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { code: string; name: string; strategy_id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO tactics (code, name, strategy_id)
      VALUES (${data.code}, ${data.name}, ${data.strategy_id})
      RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "create", entity: "tactic", entity_id: (rows[0] as any).id, after: rows[0] });
    return rows[0] as DBTactic;
  });

export const serverUpdateTactic = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number; code: string; name: string; strategy_id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const before = await sql`SELECT * FROM tactics WHERE id = ${data.id} LIMIT 1`;
    const rows = await sql`
      UPDATE tactics SET code = ${data.code}, name = ${data.name}, strategy_id = ${data.strategy_id}
      WHERE id = ${data.id} RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "update", entity: "tactic", entity_id: data.id, before: before[0] ?? null, after: rows[0] });
    return rows[0] as DBTactic;
  });

export const serverDeleteTactic = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const childCount = await sql`SELECT COUNT(*)::int AS count FROM plans WHERE tactic_id = ${data.id}`;
    if (Number((childCount[0] as any).count) > 0) {
      throw new Response(JSON.stringify({ error: "HAS_CHILDREN" }), { status: 409 });
    }
    const before = await sql`SELECT * FROM tactics WHERE id = ${data.id} LIMIT 1`;
    await sql`DELETE FROM tactics WHERE id = ${data.id}`;
    await insertAuditEvent(sql, session, { action: "delete", entity: "tactic", entity_id: data.id, before: before[0] ?? null, after: { deleted: true } });
  });

export const serverCreatePlan = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { name: string; tactic_id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO plans (name, tactic_id)
      VALUES (${data.name}, ${data.tactic_id})
      RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "create", entity: "plan", entity_id: (rows[0] as any).id, after: rows[0] });
    return rows[0] as DBPlan;
  });

export const serverUpdatePlan = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number; name: string; tactic_id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const before = await sql`SELECT * FROM plans WHERE id = ${data.id} LIMIT 1`;
    const rows = await sql`
      UPDATE plans SET name = ${data.name}, tactic_id = ${data.tactic_id}
      WHERE id = ${data.id} RETURNING *
    `;
    await insertAuditEvent(sql, session, { action: "update", entity: "plan", entity_id: data.id, before: before[0] ?? null, after: rows[0] });
    return rows[0] as DBPlan;
  });

export const serverDeletePlan = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await requireAdmin();
    const sql = getSql();
    const childCount = await sql`SELECT COUNT(*)::int AS count FROM projects WHERE plan_id = ${data.id}`;
    if (Number((childCount[0] as any).count) > 0) {
      throw new Response(JSON.stringify({ error: "HAS_CHILDREN" }), { status: 409 });
    }
    const before = await sql`SELECT * FROM plans WHERE id = ${data.id} LIMIT 1`;
    await sql`DELETE FROM plans WHERE id = ${data.id}`;
    await insertAuditEvent(sql, session, { action: "delete", entity: "plan", entity_id: data.id, before: before[0] ?? null, after: { deleted: true } });
  });
