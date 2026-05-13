import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, Download, FolderKanban, Gauge, Lock, Printer, Search, Wrench } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "คู่มือการใช้งาน · ระบบบริหารแผนพัฒนาท้องถิ่น" },
      { name: "description", content: "คู่มือการใช้งานระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี เทศบาลนครนครสวรรค์" },
    ],
  }),
  component: ManualPage,
});

function ManualPage() {
  return (
    <AppLayout>
      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, footer, .manual-print-hidden { display: none !important; }
          main { padding: 0 !important; }
          .manual-page {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
            color: #111827 !important;
          }
          .manual-section { break-inside: avoid; page-break-inside: avoid; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>

      <article className="manual-page mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-soft lg:p-8">
        <div className="manual-print-hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" asChild>
            <Link to="/">กลับหน้าภาพรวม</Link>
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="size-4" />
            พิมพ์ / บันทึกเป็น PDF
          </Button>
        </div>

        <header className="mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-3 text-primary">
            <BookOpen className="size-7" />
            <div className="text-sm font-medium uppercase tracking-wider">คู่มือภาษาไทย</div>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">คู่มือการใช้งานระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            สำหรับประชาชน เจ้าหน้าที่ และผู้ดูแลระบบของเทศบาลนครนครสวรรค์ คู่มือนี้สรุปขั้นตอนใช้งานตามระบบปัจจุบัน อัปเดตล่าสุด 13 พฤษภาคม 2569 และพิมพ์เป็น PDF ได้จากปุ่มด้านบน
          </p>
        </header>

        <section className="manual-section mb-7 grid gap-3 md:grid-cols-3">
          <QuickCard icon={<Gauge className="size-4" />} title="ภาพรวม" text="ดูจำนวนโครงการ งบประมาณ สถานะ ความก้าวหน้า และข้อมูลเผยแพร่ล่าสุด" />
          <QuickCard icon={<FolderKanban className="size-4" />} title="โครงการ" text="ค้นหา กรอง ดูรายละเอียด annotation จากไฟล์ Excel และปรับสถานะเมื่อเข้าสู่ระบบผู้ดูแล" />
          <QuickCard icon={<Wrench className="size-4" />} title="ครุภัณฑ์" text="ดูรายการครุภัณฑ์ ค้นหา งบประมาณรายปี และจัดการข้อมูลเมื่อมีสิทธิ์ผู้ดูแล" />
        </section>

        <ManualSection title="1. สำหรับประชาชนทั่วไป" icon={<Search className="size-5" />}>
          <Step text="เปิดหน้าภาพรวมเพื่อดูจำนวนโครงการ งบประมาณรวม สถานะ ความก้าวหน้าแยกยุทธศาสตร์ และปีงบประมาณที่ระบบเลือกให้อัตโนมัติ" />
          <Step text="ใช้เมนูโครงการเพื่อค้นหาตามชื่อ หน่วยงาน ยุทธศาสตร์ แผนงาน สถานะ ปีงบประมาณ และข้อความหมายเหตุจาก Excel text box" />
          <Step text="กดชื่อโครงการเพื่ออ่านรายละเอียด งบประมาณรายปี แหล่งข้อมูล สถานะเผยแพร่ และหมายเหตุจากไฟล์ต้นทาง" />
          <Step text="เปิดเมนูครุภัณฑ์เพื่อดูรายการจัดซื้อ ค้นหาตามข้อความ และตรวจงบประมาณแยกปี 2566-2570" />
          <Step text="เปิดหน้าเกี่ยวกับระบบเพื่อดูแหล่งข้อมูล ข้อจำกัดข้อมูล PDPA และแนวทางการติดต่อผู้ดูแลข้อมูล" />
        </ManualSection>

        <ManualSection title="2. สำหรับเจ้าหน้าที่ผู้ดูแล" icon={<Lock className="size-5" />}>
          <Step text="กดเข้าสู่ระบบผู้ดูแลจากแถบซ้าย แล้วเข้าสู่ระบบด้วยบัญชีภายในที่ได้รับมอบหมาย" />
          <Step text="หลังเข้าสู่ระบบ จะเห็นเมนูนำเข้าข้อมูล โครงสร้างแผน จัดการผู้ใช้ และประวัติการใช้งานในแถบผู้ดูแลระบบ" />
          <Step text="ใช้หน้าโครงสร้างแผนเพื่อเพิ่ม แก้ไข หรือลบยุทธศาสตร์ แนวทาง และแผนงาน โดยระบบจะกันการลบรายการที่ยังมีข้อมูลลูกอยู่" />
          <Step text="ใช้หน้าจัดการผู้ใช้เพื่อเพิ่มผู้ดูแล ลบผู้ดูแล หรือรีเซ็ตรหัสผ่านเมื่อจำเป็น" />
          <Step text="การเพิ่ม แก้ไข ลบ import export เปลี่ยนสถานะ login และ logout จะถูกบันทึกใน audit log โดยอัตโนมัติ" />
          <Step text="หากเข้าสู่ระบบผิดหลายครั้ง ระบบจะล็อกชั่วคราวประมาณ 1 นาทีเพื่อป้องกัน brute force" />
        </ManualSection>

        <ManualSection title="3. การเร่งรัดและติดตามโครงการ" icon={<ClipboardCheck className="size-5" />}>
          <Step text="ดูแผงเร่งรัดและติดตามในหน้าภาพรวม ระบบจะเลือกปีงบประมาณตามวันที่ปัจจุบันให้เอง" />
          <Step text="โครงการที่มีงบปีปัจจุบันแต่ยังเป็น “ยังไม่กำหนด” หรือ “วางแผน” จะถูกจัดเป็นงานควรเร่งรัด" />
          <Step text="โครงการ “ดำเนินการ” คือกลุ่มที่ควรติดตามความคืบหน้าเป็นระยะ โดยไม่ต้องกรอกข้อมูลเพิ่ม" />
          <Step text="ผู้ดูแลสามารถปรับสถานะรายโครงการจากหน้ารายละเอียด หรือเลือกหลายรายการในหน้าโครงการเพื่อ bulk update ได้" />
        </ManualSection>

        <ManualSection title="4. การส่งออกและการพิมพ์" icon={<Download className="size-5" />}>
          <Step text="ปุ่มส่งออกบนหน้าภาพรวมและหน้าโครงการจะสร้างไฟล์ Excel พร้อมแผ่นข้อมูลกำกับ เช่น วันที่ส่งออก ตัวกรอง และแหล่งข้อมูล" />
          <Step text="ระบบป้องกัน Excel formula injection โดยบันทึกข้อความที่เริ่มด้วยอักขระสูตรให้เป็นข้อความธรรมดาในไฟล์ส่งออก" />
          <Step text="รายงาน PDF รูปแบบราชการจากหน้าภาพรวมจะแสดงเฉพาะเมื่อเข้าสู่ระบบผู้ดูแล" />
          <Step text="หน้าคู่มือนี้สามารถกด “พิมพ์ / บันทึกเป็น PDF” แล้วเลือก Save as PDF ใน browser ได้" />
        </ManualSection>

        <ManualSection title="5. ข้อควรระวัง" icon={<ClipboardCheck className="size-5" />}>
          <Step text="อย่านำ DATABASE_URL, SESSION_PASSWORD หรือไฟล์ .env ไปใส่ในเอกสารสาธารณะหรือ repository public" />
          <Step text="ก่อน import ข้อมูลชุดใหญ่ ควรสำรองฐานข้อมูล ใช้ Neon branch สำหรับ staging หรือสร้าง restore point ก่อนเสมอ" />
          <Step text="ข้อมูลสาธารณะถูกกรองตามสถานะเผยแพร่เมื่อมีคอลัมน์ publish_status แต่ผู้ดูแลจะเห็นข้อมูลครบเพื่อใช้ตรวจทาน" />
          <Step text="หากพบข้อมูลผิด ให้ตรวจแหล่งข้อมูล annotation และ audit log ก่อนแก้ไขหรือ rollback" />
        </ManualSection>
      </article>
    </AppLayout>
  );
}

function QuickCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
        {title}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ManualSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="manual-section mb-7 rounded-xl border border-border p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <ol className="space-y-2">{children}</ol>
    </section>
  );
}

function Step({ text }: { text: string }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-foreground/85">
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
      <span>{text}</span>
    </li>
  );
}
