// Mock data for the Local Development Plan management system
// Thai municipal planning data — fiscal years 2566-2570 B.E.

export type Status = "planning" | "in_progress" | "completed" | "cancelled";

export const STATUS_LABEL: Record<Status, string> = {
  planning: "วางแผน",
  in_progress: "ดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const STATUS_COLOR: Record<Status, string> = {
  planning: "var(--color-info)",
  in_progress: "var(--color-warning)",
  completed: "var(--color-success)",
  cancelled: "var(--color-destructive)",
};

export const YEARS = [2566, 2567, 2568, 2569, 2570] as const;

export const strategies = [
  { id: 1, name: "ยุทธศาสตร์การพัฒนาด้านโครงสร้างพื้นฐาน", short_name: "โครงสร้างพื้นฐาน", department: "กองช่าง" },
  { id: 2, name: "ยุทธศาสตร์การพัฒนาด้านเศรษฐกิจและการท่องเที่ยว", short_name: "เศรษฐกิจ", department: "กองส่งเสริมการเกษตร" },
  { id: 3, name: "ยุทธศาสตร์การพัฒนาด้านสังคมและคุณภาพชีวิต", short_name: "สังคมและคุณภาพชีวิต", department: "กองสวัสดิการสังคม" },
  { id: 4, name: "ยุทธศาสตร์การพัฒนาด้านการศึกษา ศาสนา และวัฒนธรรม", short_name: "การศึกษา", department: "กองการศึกษา" },
  { id: 5, name: "ยุทธศาสตร์การพัฒนาด้านสาธารณสุขและสิ่งแวดล้อม", short_name: "สาธารณสุข", department: "กองสาธารณสุข" },
  { id: 6, name: "ยุทธศาสตร์การพัฒนาด้านการบริหารจัดการบ้านเมืองที่ดี", short_name: "การบริหารจัดการ", department: "สำนักปลัดเทศบาล" },
];

export const tactics = [
  { id: 1, code: "1.1", name: "พัฒนาระบบถนน ทางเท้า และระบายน้ำ", strategy_id: 1 },
  { id: 2, code: "1.2", name: "พัฒนาระบบไฟฟ้าและแสงสว่างสาธารณะ", strategy_id: 1 },
  { id: 3, code: "1.3", name: "พัฒนาระบบประปาและน้ำสะอาด", strategy_id: 1 },
  { id: 4, code: "2.1", name: "ส่งเสริมการท่องเที่ยวเชิงวัฒนธรรม", strategy_id: 2 },
  { id: 5, code: "2.2", name: "ส่งเสริมเศรษฐกิจชุมชนและ SMEs", strategy_id: 2 },
  { id: 6, code: "3.1", name: "พัฒนาคุณภาพชีวิตผู้สูงอายุและผู้ด้อยโอกาส", strategy_id: 3 },
  { id: 7, code: "3.2", name: "ส่งเสริมความปลอดภัยในชีวิตและทรัพย์สิน", strategy_id: 3 },
  { id: 8, code: "4.1", name: "ยกระดับคุณภาพการศึกษา", strategy_id: 4 },
  { id: 9, code: "4.2", name: "อนุรักษ์ศิลปวัฒนธรรมและภูมิปัญญาท้องถิ่น", strategy_id: 4 },
  { id: 10, code: "5.1", name: "ส่งเสริมสุขภาวะประชาชน", strategy_id: 5 },
  { id: 11, code: "5.2", name: "บริหารจัดการขยะและสิ่งแวดล้อม", strategy_id: 5 },
  { id: 12, code: "6.1", name: "พัฒนาระบบบริการประชาชนและธรรมาภิบาล", strategy_id: 6 },
];

export const plans = tactics.flatMap((t, i) => [
  { id: i * 2 + 1, name: `แผนงาน ${t.code} หลัก`, tactic_id: t.id },
  { id: i * 2 + 2, name: `แผนงาน ${t.code} รอง`, tactic_id: t.id },
]);

const departments = [
  "กองช่าง",
  "กองคลัง",
  "กองการศึกษา",
  "กองสาธารณสุขและสิ่งแวดล้อม",
  "กองสวัสดิการสังคม",
  "กองวิชาการและแผนงาน",
  "สำนักปลัดเทศบาล",
  "กองส่งเสริมการเกษตร",
  "หน่วยตรวจสอบภายใน",
  "กองทะเบียนราษฎร",
];

const projectNames = [
  "ก่อสร้างถนนคอนกรีตเสริมเหล็ก ซอย",
  "ปรับปรุงระบบระบายน้ำบริเวณ",
  "ติดตั้งไฟฟ้าแสงสว่างสาธารณะ ถนน",
  "ขยายเขตประปาหมู่บ้าน",
  "จัดงานประเพณีลอยกระทง",
  "ส่งเสริมอาชีพกลุ่มแม่บ้าน",
  "เบี้ยยังชีพผู้สูงอายุ",
  "ติดตั้งกล้องวงจรปิด CCTV",
  "พัฒนาศูนย์เด็กเล็ก",
  "อนุรักษ์โบราณสถานวัด",
  "รณรงค์ป้องกันโรคไข้เลือดออก",
  "จัดเก็บและกำจัดขยะมูลฝอย",
  "ปรับปรุงระบบสารสนเทศเพื่อบริการประชาชน",
  "ก่อสร้างศาลาอเนกประสงค์",
  "ปรับปรุงสวนสาธารณะ",
  "จัดซื้อเครื่องสูบน้ำ",
  "ฝึกอบรม อสม. ประจำชุมชน",
  "พัฒนาแหล่งท่องเที่ยวริมแม่น้ำ",
  "ส่งเสริมเกษตรอินทรีย์",
  "จัดทำแผนพัฒนาท้องถิ่น",
];

const locations = [
  "ชุมชนบ้านดอน", "ชุมชนสะพานดำ", "ชุมชนวัดเขา", "ชุมชนตลาดเก่า",
  "ชุมชนหน้าเมือง", "ชุมชนริมน้ำ", "ชุมชนบางมะฝ่อ", "ชุมชนปากน้ำโพ",
  "ชุมชนสันคู", "ชุมชนเกาะหงษ์", "ชุมชนวัดไทร", "ชุมชนหนองปลิง",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);

export interface Project {
  id: number;
  name: string;
  objective: string;
  target: string;
  kpi: string;
  expected_result: string;
  department: string;
  plan_id: number;
  status: Status;
  source_sheet: string;
  budgets: Record<number, number>;
  total_budget: number;
}

const statuses: Status[] = ["planning", "planning", "in_progress", "in_progress", "completed", "cancelled"];

export const projects: Project[] = Array.from({ length: 248 }, (_, i) => {
  const plan = plans[Math.floor(rand() * plans.length)];
  const tactic = tactics.find((t) => t.id === plan.tactic_id)!;
  const projectBaseName = projectNames[Math.floor(rand() * projectNames.length)];
  const location = locations[Math.floor(rand() * locations.length)];
  const dept = departments[Math.floor(rand() * departments.length)];
  const status = statuses[Math.floor(rand() * statuses.length)];

  const budgets: Record<number, number> = {};
  let total = 0;
  YEARS.forEach((y) => {
    const has = rand() > 0.3;
    if (has) {
      const amt = Math.floor((rand() * 4900 + 100)) * 1000;
      budgets[y] = amt;
      total += amt;
    } else {
      budgets[y] = 0;
    }
  });

  return {
    id: i + 1,
    name: `${projectBaseName} ${location}`,
    objective: `เพื่อพัฒนาและยกระดับคุณภาพชีวิตของประชาชนใน${location} ให้ได้รับบริการสาธารณะที่มีมาตรฐาน`,
    target: `ประชาชนใน${location} จำนวนไม่น้อยกว่า ${Math.floor(rand() * 500 + 50)} ครัวเรือน`,
    kpi: `ร้อยละ ${Math.floor(rand() * 30 + 70)} ของประชาชนได้รับประโยชน์จากโครงการ`,
    expected_result: `${location} มีโครงสร้างพื้นฐานและบริการสาธารณะที่ดีขึ้น ส่งผลให้คุณภาพชีวิตของประชาชนดีขึ้น`,
    department: dept,
    plan_id: plan.id,
    status,
    source_sheet: `ผ.02/${tactic.strategy_id}`,
    budgets,
    total_budget: total,
  };
});

export interface Equipment {
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

const equipmentItems = [
  { cat: "ครุภัณฑ์สำนักงาน", items: ["เครื่องคอมพิวเตอร์", "เครื่องพิมพ์", "เครื่องถ่ายเอกสาร", "ตู้เก็บเอกสาร", "โต๊ะทำงาน"] },
  { cat: "ครุภัณฑ์ยานพาหนะ", items: ["รถบรรทุกขยะ", "รถยนต์ตรวจการ", "รถจักรยานยนต์", "รถดับเพลิง", "รถพยาบาล"] },
  { cat: "ครุภัณฑ์การเกษตร", items: ["เครื่องสูบน้ำ", "เครื่องตัดหญ้า", "เครื่องพ่นยา", "รถไถนา"] },
  { cat: "ครุภัณฑ์ก่อสร้าง", items: ["รถตัก", "รถบดถนน", "เครื่องผสมคอนกรีต", "เครื่องเจาะคอนกรีต"] },
  { cat: "ครุภัณฑ์การแพทย์", items: ["เครื่องวัดความดัน", "เครื่อง AED", "เตียงผู้ป่วย"] },
];

export const equipment: Equipment[] = Array.from({ length: 64 }, (_, i) => {
  const cat = equipmentItems[Math.floor(rand() * equipmentItems.length)];
  const item = cat.items[Math.floor(rand() * cat.items.length)];
  return {
    id: i + 1,
    plan_name: `แผนจัดซื้อครุภัณฑ์ปี ${2566 + Math.floor(rand() * 5)}`,
    category: cat.cat,
    item_type: item,
    target: `จำนวน ${Math.floor(rand() * 5 + 1)} รายการ`,
    department: departments[Math.floor(rand() * departments.length)],
    budget_2566: rand() > 0.5 ? Math.floor(rand() * 800 + 50) * 1000 : 0,
    budget_2567: rand() > 0.5 ? Math.floor(rand() * 800 + 50) * 1000 : 0,
    budget_2568: rand() > 0.5 ? Math.floor(rand() * 800 + 50) * 1000 : 0,
    budget_2569: rand() > 0.5 ? Math.floor(rand() * 800 + 50) * 1000 : 0,
    budget_2570: rand() > 0.5 ? Math.floor(rand() * 800 + 50) * 1000 : 0,
  };
});

// Helper getters
export function getProjectWithHierarchy(id: number) {
  const p = projects.find((x) => x.id === id);
  if (!p) return null;
  const plan = plans.find((x) => x.id === p.plan_id);
  const tactic = plan ? tactics.find((x) => x.id === plan.tactic_id) : null;
  const strategy = tactic ? strategies.find((x) => x.id === tactic.strategy_id) : null;
  return { ...p, plan, tactic, strategy };
}

export function getDashboardData() {
  const totalProjects = projects.length;
  const totalBudget = projects.reduce((s, p) => s + p.total_budget, 0);

  const byStatus = (["planning", "in_progress", "completed", "cancelled"] as Status[]).map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: projects.filter((p) => p.status === status).length,
  }));

  const byStrategy = strategies.map((s) => {
    const sTactics = tactics.filter((t) => t.strategy_id === s.id).map((t) => t.id);
    const sPlans = plans.filter((p) => sTactics.includes(p.tactic_id)).map((p) => p.id);
    const sProjects = projects.filter((p) => sPlans.includes(p.plan_id));
    return {
      id: s.id,
      name: s.short_name,
      full_name: s.name,
      project_count: sProjects.length,
      total_budget: sProjects.reduce((sum, p) => sum + p.total_budget, 0),
    };
  });

  const byYear = YEARS.map((year) => ({
    year,
    label: `${year}`,
    total: projects.reduce((sum, p) => sum + (p.budgets[year] || 0), 0),
    project_count: projects.filter((p) => (p.budgets[year] || 0) > 0).length,
  }));

  const deptMap = new Map<string, { count: number; budget: number }>();
  projects.forEach((p) => {
    const cur = deptMap.get(p.department) || { count: 0, budget: 0 };
    cur.count += 1;
    cur.budget += p.total_budget;
    deptMap.set(p.department, cur);
  });
  const topDepts = Array.from(deptMap.entries())
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalProjects,
    totalBudget,
    totalStrategies: strategies.length,
    totalPlans: plans.length,
    totalDepartments: deptMap.size,
    byStatus,
    byStrategy,
    byYear,
    topDepts,
  };
}

export function formatBaht(n: number, options: { compact?: boolean } = {}) {
  if (options.compact) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} พันล้าน`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน`;
    if (n >= 1_000) return `${(n / 1_000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} พัน`;
  }
  return n.toLocaleString("th-TH");
}

export const DEPARTMENTS = departments;
