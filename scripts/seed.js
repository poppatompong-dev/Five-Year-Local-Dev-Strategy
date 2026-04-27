// Seed script — pushes mock data from src/lib/mock-data into Neon PostgreSQL
// Run: node scripts/seed.js

import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// ---------------------------------------------------------------------------
// Mirror of src/lib/mock-data.ts — plain JS (no TS transforms needed)
// ---------------------------------------------------------------------------
const strategies = [
  { id: 1, name: "ยุทธศาสตร์การพัฒนาด้านโครงสร้างพื้นฐาน", short_name: "โครงสร้างพื้นฐาน", department: "กองช่าง" },
  { id: 2, name: "ยุทธศาสตร์การพัฒนาด้านเศรษฐกิจและการท่องเที่ยว", short_name: "เศรษฐกิจ", department: "กองส่งเสริมการเกษตร" },
  { id: 3, name: "ยุทธศาสตร์การพัฒนาด้านสังคมและคุณภาพชีวิต", short_name: "สังคมและคุณภาพชีวิต", department: "กองสวัสดิการสังคม" },
  { id: 4, name: "ยุทธศาสตร์การพัฒนาด้านการศึกษา ศาสนา และวัฒนธรรม", short_name: "การศึกษา", department: "กองการศึกษา" },
  { id: 5, name: "ยุทธศาสตร์การพัฒนาด้านสาธารณสุขและสิ่งแวดล้อม", short_name: "สาธารณสุข", department: "กองสาธารณสุข" },
  { id: 6, name: "ยุทธศาสตร์การพัฒนาด้านการบริหารจัดการบ้านเมืองที่ดี", short_name: "การบริหารจัดการ", department: "สำนักปลัดเทศบาล" },
];

const tactics = [
  { code: "1.1", name: "พัฒนาระบบถนน ทางเท้า และระบายน้ำ", strategy_id: 1 },
  { code: "1.2", name: "พัฒนาระบบไฟฟ้าและแสงสว่างสาธารณะ", strategy_id: 1 },
  { code: "1.3", name: "พัฒนาระบบประปาและน้ำสะอาด", strategy_id: 1 },
  { code: "2.1", name: "ส่งเสริมการท่องเที่ยวเชิงวัฒนธรรม", strategy_id: 2 },
  { code: "2.2", name: "ส่งเสริมเศรษฐกิจชุมชนและ SMEs", strategy_id: 2 },
  { code: "3.1", name: "พัฒนาคุณภาพชีวิตผู้สูงอายุและผู้ด้อยโอกาส", strategy_id: 3 },
  { code: "3.2", name: "ส่งเสริมความปลอดภัยในชีวิตและทรัพย์สิน", strategy_id: 3 },
  { code: "4.1", name: "ยกระดับคุณภาพการศึกษา", strategy_id: 4 },
  { code: "4.2", name: "อนุรักษ์ศิลปวัฒนธรรมและภูมิปัญญาท้องถิ่น", strategy_id: 4 },
  { code: "5.1", name: "ส่งเสริมสุขภาวะประชาชน", strategy_id: 5 },
  { code: "5.2", name: "บริหารจัดการขยะและสิ่งแวดล้อม", strategy_id: 5 },
  { code: "6.1", name: "พัฒนาระบบบริการประชาชนและธรรมาภิบาล", strategy_id: 6 },
];

const YEARS = [2566, 2567, 2568, 2569, 2570];

const departments = [
  "กองช่าง", "กองคลัง", "กองการศึกษา", "กองสาธารณสุขและสิ่งแวดล้อม",
  "กองสวัสดิการสังคม", "กองวิชาการและแผนงาน", "สำนักปลัดเทศบาล",
  "กองส่งเสริมการเกษตร", "หน่วยตรวจสอบภายใน", "กองทะเบียนราษฎร",
];

const projectNames = [
  "ก่อสร้างถนนคอนกรีตเสริมเหล็ก ซอย", "ปรับปรุงระบบระบายน้ำบริเวณ",
  "ติดตั้งไฟฟ้าแสงสว่างสาธารณะ ถนน", "ขยายเขตประปาหมู่บ้าน",
  "จัดงานประเพณีลอยกระทง", "ส่งเสริมอาชีพกลุ่มแม่บ้าน",
  "เบี้ยยังชีพผู้สูงอายุ", "ติดตั้งกล้องวงจรปิด CCTV",
  "พัฒนาศูนย์เด็กเล็ก", "อนุรักษ์โบราณสถานวัด",
  "รณรงค์ป้องกันโรคไข้เลือดออก", "จัดเก็บและกำจัดขยะมูลฝอย",
  "ปรับปรุงระบบสารสนเทศเพื่อบริการประชาชน", "ก่อสร้างศาลาอเนกประสงค์",
  "ปรับปรุงสวนสาธารณะ", "จัดซื้อเครื่องสูบน้ำ",
  "ฝึกอบรม อสม. ประจำชุมชน", "พัฒนาแหล่งท่องเที่ยวริมแม่น้ำ",
  "ส่งเสริมเกษตรอินทรีย์", "จัดทำแผนพัฒนาท้องถิ่น",
];

const locations = [
  "ชุมชนบ้านดอน", "ชุมชนสะพานดำ", "ชุมชนวัดเขา", "ชุมชนตลาดเก่า",
  "ชุมชนหน้าเมือง", "ชุมชนริมน้ำ", "ชุมชนบางมะฝ่อ", "ชุมชนปากน้ำโพ",
  "ชุมชนสันคู", "ชุมชนเกาะหงษ์", "ชุมชนวัดไทร", "ชุมชนหนองปลิง",
];

const equipmentItems = [
  { cat: "ครุภัณฑ์สำนักงาน", items: ["เครื่องคอมพิวเตอร์", "เครื่องพิมพ์", "เครื่องถ่ายเอกสาร", "ตู้เก็บเอกสาร", "โต๊ะทำงาน"] },
  { cat: "ครุภัณฑ์ยานพาหนะ", items: ["รถบรรทุกขยะ", "รถยนต์ตรวจการ", "รถจักรยานยนต์", "รถดับเพลิง", "รถพยาบาล"] },
  { cat: "ครุภัณฑ์การเกษตร", items: ["เครื่องสูบน้ำ", "เครื่องตัดหญ้า", "เครื่องพ่นยา", "รถไถนา"] },
  { cat: "ครุภัณฑ์ก่อสร้าง", items: ["รถตัก", "รถบดถนน", "เครื่องผสมคอนกรีต", "เครื่องเจาะคอนกรีต"] },
  { cat: "ครุภัณฑ์การแพทย์", items: ["เครื่องวัดความดัน", "เครื่อง AED", "เตียงผู้ป่วย"] },
];

const statuses = ["planning", "planning", "in_progress", "in_progress", "completed", "cancelled"];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function seed() {
  await client.connect();
  console.log("Connected to Neon PostgreSQL");

  const rand = seededRandom(42);

  // Clear existing data
  await client.query("TRUNCATE project_budgets, equipment, projects, plans, tactics, strategies RESTART IDENTITY CASCADE");
  console.log("Tables cleared");

  // Strategies (manual IDs)
  for (const s of strategies) {
    await client.query(
      "INSERT INTO strategies (id, name, short_name, department) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=$2, short_name=$3, department=$4",
      [s.id, s.name, s.short_name, s.department]
    );
  }
  console.log(`Seeded ${strategies.length} strategies`);

  // Tactics
  const tacticRows = [];
  for (const t of tactics) {
    const res = await client.query(
      "INSERT INTO tactics (code, name, strategy_id) VALUES ($1,$2,$3) RETURNING id",
      [t.code, t.name, t.strategy_id]
    );
    tacticRows.push({ ...t, id: res.rows[0].id });
  }
  console.log(`Seeded ${tacticRows.length} tactics`);

  // Plans (2 per tactic)
  const planRows = [];
  for (const t of tacticRows) {
    for (const suffix of ["หลัก", "รอง"]) {
      const res = await client.query(
        "INSERT INTO plans (name, tactic_id) VALUES ($1,$2) RETURNING id",
        [`แผนงาน ${t.code} ${suffix}`, t.id]
      );
      planRows.push({ id: res.rows[0].id, tactic_id: t.id, tactic_code: t.code, strategy_id: t.strategy_id });
    }
  }
  console.log(`Seeded ${planRows.length} plans`);

  // Projects (248)
  const rand2 = seededRandom(42);
  let projectCount = 0;
  let budgetCount = 0;
  for (let i = 0; i < 248; i++) {
    const plan = planRows[Math.floor(rand2() * planRows.length)];
    const projectBase = projectNames[Math.floor(rand2() * projectNames.length)];
    const location = locations[Math.floor(rand2() * locations.length)];
    const dept = departments[Math.floor(rand2() * departments.length)];
    const status = statuses[Math.floor(rand2() * statuses.length)];

    const res = await client.query(
      `INSERT INTO projects (name, objective, target, kpi, expected_result, department, plan_id, status, source_sheet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        `${projectBase} ${location}`,
        `เพื่อพัฒนาและยกระดับคุณภาพชีวิตของประชาชนใน${location} ให้ได้รับบริการสาธารณะที่มีมาตรฐาน`,
        `ประชาชนใน${location} จำนวนไม่น้อยกว่า ${Math.floor(rand2() * 500 + 50)} ครัวเรือน`,
        `ร้อยละ ${Math.floor(rand2() * 30 + 70)} ของประชาชนได้รับประโยชน์จากโครงการ`,
        `${location} มีโครงสร้างพื้นฐานและบริการสาธารณะที่ดีขึ้น ส่งผลให้คุณภาพชีวิตของประชาชนดีขึ้น`,
        dept,
        plan.id,
        status,
        `ผ.02/${plan.strategy_id}`,
      ]
    );
    const projectId = res.rows[0].id;
    projectCount++;

    for (const year of YEARS) {
      const has = rand2() > 0.3;
      if (has) {
        const amt = Math.floor((rand2() * 4900 + 100)) * 1000;
        await client.query(
          "INSERT INTO project_budgets (project_id, year, amount) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [projectId, year, amt]
        );
        budgetCount++;
      }
    }
  }
  console.log(`Seeded ${projectCount} projects, ${budgetCount} budget rows`);

  // Equipment (64)
  const rand3 = seededRandom(42);
  let eqCount = 0;
  for (let i = 0; i < 64; i++) {
    const cat = equipmentItems[Math.floor(rand3() * equipmentItems.length)];
    const item = cat.items[Math.floor(rand3() * cat.items.length)];
    await client.query(
      `INSERT INTO equipment (plan_name, category, item_type, target, department, budget_2566, budget_2567, budget_2568, budget_2569, budget_2570)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        `แผนจัดซื้อครุภัณฑ์ปี ${2566 + Math.floor(rand3() * 5)}`,
        cat.cat,
        item,
        `จำนวน ${Math.floor(rand3() * 5 + 1)} รายการ`,
        departments[Math.floor(rand3() * departments.length)],
        rand3() > 0.5 ? Math.floor(rand3() * 800 + 50) * 1000 : 0,
        rand3() > 0.5 ? Math.floor(rand3() * 800 + 50) * 1000 : 0,
        rand3() > 0.5 ? Math.floor(rand3() * 800 + 50) * 1000 : 0,
        rand3() > 0.5 ? Math.floor(rand3() * 800 + 50) * 1000 : 0,
        rand3() > 0.5 ? Math.floor(rand3() * 800 + 50) * 1000 : 0,
      ]
    );
    eqCount++;
  }
  console.log(`Seeded ${eqCount} equipment items`);

  await client.end();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
