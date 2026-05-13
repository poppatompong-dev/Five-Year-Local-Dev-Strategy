import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PublicDataNotice } from "@/components/PublicDataNotice";
import { AgencyLogo } from "@/components/AgencyLogo";
import { Accessibility, Mail, Shield } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "เกี่ยวกับระบบ · แผนพัฒนาท้องถิ่น" },
      { name: "description", content: "ข้อมูลเกี่ยวกับระบบเผยแพร่แผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <AgencyLogo className="size-20" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Public Read-only Portal · Updated 13 May 2026</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">ระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                ระบบนี้จัดทำเพื่อเผยแพร่และบริหารข้อมูลแผนพัฒนาท้องถิ่น พ.ศ. 2566-2570 ของเทศบาลนครนครสวรรค์ให้ตรวจดูได้สะดวก
                ผู้ใช้ทั่วไปสามารถดูภาพรวม โครงการ ครุภัณฑ์ รายละเอียด และข้อมูลที่เผยแพร่แล้ว ส่วนการเพิ่ม แก้ไข ลบ นำเข้า ส่งออกเชิงราชการ และดู audit log จำกัดเฉพาะผู้ดูแลระบบ
              </p>
            </div>
          </div>
        </section>

        <PublicDataNotice />

        <section className="grid gap-4 md:grid-cols-2">
          <InfoBlock
            title="แหล่งที่มาของข้อมูล"
            body="ข้อมูลหลักมาจากเอกสารแผนพัฒนาท้องถิ่นและ workbook ทางราชการที่นำเข้าไว้ในฐานข้อมูล PostgreSQL ระบบเก็บแหล่งที่มา แถวต้นทาง งบประมาณรายปี และหมายเหตุจาก Excel text box เพื่อช่วยตรวจสอบย้อนหลัง"
          />
          <InfoBlock
            title="คำอธิบายแผนพัฒนาท้องถิ่น"
            body="แผนพัฒนาท้องถิ่นเป็นกรอบโครงการและครุภัณฑ์ที่ใช้ประกอบการจัดทำงบประมาณและติดตามการดำเนินงานของเทศบาล โครงสร้างข้อมูลเรียงจากยุทธศาสตร์ แนวทาง แผนงาน โครงการ และงบประมาณรายปี โดยตัวเลขงบประมาณแสดงเป็นเงินบาทเต็มจำนวน"
          />
          <InfoBlock
            title="ข้อจำกัดความรับผิดชอบด้านข้อมูล"
            body="ข้อมูลในระบบเผยแพร่เพื่อความโปร่งใสและการติดตามของประชาชน ข้อมูลที่อยู่ระหว่างตรวจทานอาจไม่ปรากฏในส่วนสาธารณะ หากพบข้อมูลคลาดเคลื่อน ให้ยึดเอกสารราชการที่ประกาศอย่างเป็นทางการเป็นหลักจนกว่าจะมีการปรับปรุงข้อมูลในระบบ"
          />
          <InfoBlock
            title="ช่องทางติดต่อผู้ดูแลข้อมูล"
            body="ติดต่อหน่วยงานเจ้าของข้อมูลหรือผู้ดูแลระบบของเทศบาลนครนครสวรรค์เพื่อแจ้งแก้ไขข้อมูล สอบถามแหล่งข้อมูล หรือขอคำอธิบายเพิ่มเติมเกี่ยวกับแผนงาน"
            icon={<Mail className="size-4" />}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <InfoBlock
            title="Privacy / PDPA Notice"
            body="ระบบส่วนสาธารณะออกแบบเพื่อเผยแพร่ข้อมูลแผนงาน งบประมาณ และครุภัณฑ์ ไม่ได้มีวัตถุประสงค์ในการเผยแพร่ข้อมูลส่วนบุคคลของประชาชน การใช้งานฝั่งผู้ดูแล เช่น login/logout การนำเข้า การแก้ไข และการส่งออก จะถูกบันทึก audit log เพื่อความปลอดภัยและตรวจสอบย้อนหลัง"
            icon={<Shield className="size-4" />}
          />
          <InfoBlock
            title="Accessibility Statement"
            body="ระบบใช้ภาษาไทยที่อ่านง่าย รองรับหน้าจอมือถือ มีตัวกรอง ตาราง กราฟ และหน้าคู่มือที่พิมพ์หรือบันทึกเป็น PDF ได้ เพื่อช่วยให้ประชาชนและเจ้าหน้าที่เข้าถึงข้อมูลได้ต่อเนื่อง"
            icon={<Accessibility className="size-4" />}
          />
        </section>
      </div>
    </AppLayout>
  );
}

function InfoBlock({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
