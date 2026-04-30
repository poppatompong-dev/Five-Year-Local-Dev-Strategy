import type { Status } from "./mock-data";
import {
  serverGetStrategies, serverGetTactics, serverGetPlans, serverGetDepartments,
  serverGetProjects, serverGetProject, serverPatchProjectStatus,
  serverCreateProject, serverUpdateProject, serverUpdateBudgets, serverDeleteProject,
  serverBatchImportProjects,
  serverGetEquipment, serverCreateEquipment, serverUpdateEquipment, serverDeleteEquipment,
  serverGetDashboard, serverGetDepartmentsList, serverCreateDepartment,
  serverLogAudit, serverGetAuditEvents,
} from "./server-fns";

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
  return serverGetStrategies();
}

export async function apiGetTactics(): Promise<DBTactic[]> {
  return serverGetTactics();
}

export async function apiGetPlans(): Promise<DBPlan[]> {
  return serverGetPlans();
}

export async function apiGetDepartments(): Promise<string[]> {
  return serverGetDepartments();
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
  return serverGetProjects({ data: params });
}

export interface ProjectDetail extends DBProject {
  plan: DBPlan | null;
  tactic: DBTactic | null;
  strategy: DBStrategy | null;
  budgets: Record<number, number>;
  total_budget: number;
}

export async function apiGetProject(id: number): Promise<ProjectDetail | null> {
  return serverGetProject({ data: { id } });
}

export async function apiPatchProjectStatus(id: number, status: Status): Promise<void> {
  await serverPatchProjectStatus({ data: { id, status } });
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
  return serverCreateProject({ data: input });
}

export async function apiUpdateProject(id: number, input: ProjectCreateInput): Promise<void> {
  await serverUpdateProject({ data: { id, ...input } });
}

export async function apiUpdateBudgets(projectId: number, budgets: Record<number, number>): Promise<void> {
  await serverUpdateBudgets({ data: { projectId, budgets } });
}

export async function apiDeleteProject(id: number): Promise<void> {
  await serverDeleteProject({ data: { id } });
}

export interface ImportResult {
  inserted: number;
  updated: number;
  warnings: string[];
  errors: string[];
}

export async function apiBatchImportProjects(rows: ProjectCreateInput[]): Promise<ImportResult> {
  return serverBatchImportProjects({ data: { rows } });
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
  return serverGetEquipment({ data: params });
}

export async function apiCreateEquipment(input: EquipmentCreateInput): Promise<DBEquipment> {
  return serverCreateEquipment({ data: input });
}

export async function apiUpdateEquipment(id: number, input: EquipmentCreateInput): Promise<void> {
  await serverUpdateEquipment({ data: { id, ...input } });
}

export async function apiDeleteEquipment(id: number): Promise<void> {
  await serverDeleteEquipment({ data: { id } });
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
  return serverGetDashboard();
}

// ---------------------------------------------------------------------------
// Departments (normalized)
// ---------------------------------------------------------------------------
export async function apiGetDepartmentsList(): Promise<DBDepartment[]> {
  return serverGetDepartmentsList();
}

export async function apiCreateDepartment(name: string): Promise<DBDepartment> {
  return serverCreateDepartment({ data: { name } });
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
  await serverLogAudit({ data: event });
}

export async function apiGetAuditEvents(params: {
  entity?: string;
  entity_id?: number;
  limit?: number;
} = {}): Promise<DBAuditEvent[]> {
  return serverGetAuditEvents({ data: params });
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
