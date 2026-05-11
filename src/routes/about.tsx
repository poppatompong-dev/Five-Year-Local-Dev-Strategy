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
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Public Read-only Portal</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">ระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                ระบบนี้จัดทำเพื่อเผยแพร่ข้อมูลแผนพัฒนาท้องถิ่น พ.ศ. 2566-2570 ของเทศบาลนครนครสวรรค์ให้ประชาชนตรวจดูได้สะดวก
                โดยผู้ใช้ทั่วไปสามารถดูข้อมูล อ่านรายละเอียด และดาวน์โหลดข้อมูลที่เผยแพร่แล้วได้เท่านั้น
              </p>
            </div>
          </div>
        </section>

        <PublicDataNotice />

        <section className="grid gap-4 md:grid-cols-2">
          <InfoBlock
            title="แหล่งที่มาของข้อมูล"
            body="ข้อมูลหลักมาจากเอกสารแผนพัฒนาท้องถิ่นและข้อมูลประกอบที่เจ้าหน้าที่นำเข้า ตรวจทาน และเผยแพร่ในระบบ ข้อมูลบางส่วนอาจมีหมายเหตุจากไฟล์ต้นทางเพื่อช่วยตรวจสอบความถูกต้องย้อนหลัง"
          />
          <InfoBlock
            title="คำอธิบายแผนพัฒนาท้องถิ่น"
            body="แผนพัฒนาท้องถิ่นเป็นกรอบโครงการและครุภัณฑ์ที่ใช้ประกอบการจัดทำงบประมาณและติดตามการดำเนินงานของเทศบาล ข้อมูลตัวเลขงบประมาณแสดงเป็นเงินบาทเต็มจำนวน"
          />
          <InfoBlock
            title="ข้อจำกัดความรับผิดชอบด้านข้อมูล"
            body="ข้อมูลในระบบเผยแพร่เพื่อความโปร่งใสและการติดตามของประชาชน หากพบข้อมูลคลาดเคลื่อน ให้ยึดเอกสารราชการที่ประกาศอย่างเป็นทางการเป็นหลักจนกว่าจะมีการปรับปรุงข้อมูลในระบบ"
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
            body="ระบบส่วนสาธารณะออกแบบเพื่อเผยแพร่ข้อมูลแผนงานและงบประมาณ ไม่ได้มีวัตถุประสงค์ในการเผยแพร่ข้อมูลส่วนบุคคลของประชาชน การใช้งานฝั่งผู้ดูแลจะถูกบันทึก audit log เพื่อความปลอดภัยและตรวจสอบย้อนหลัง"
            icon={<Shield className="size-4" />}
          />
          <InfoBlock
            title="Accessibility Statement"
            body="ระบบพยายามใช้ภาษาไทยที่อ่านง่าย รองรับการใช้งานบนมือถือ ใช้สีและขนาดตัวอักษรที่ช่วยให้อ่านข้อมูลตารางได้ชัดเจน และจะปรับปรุงการเข้าถึงอย่างต่อเนื่องจากข้อเสนอแนะของผู้ใช้"
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
