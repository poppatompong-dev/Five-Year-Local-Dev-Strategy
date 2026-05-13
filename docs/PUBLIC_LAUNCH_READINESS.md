# Public Launch Readiness

ตรวจสอบล่าสุด: 2026-05-13

เอกสารนี้เป็นคู่มือสำหรับเตรียมเผยแพร่ระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี เทศบาลนครนครสวรรค์ในรูปแบบ Public Read-only Portal โดยยังคง workflow เจ้าหน้าที่ให้เรียบง่ายที่สุด

## หลักการสำคัญ

- ประชาชนดูข้อมูลได้เฉพาะหน้าสาธารณะ: Dashboard, โครงการ, รายละเอียดโครงการ, ครุภัณฑ์, เกี่ยวกับระบบ, คู่มือ และข้อมูลที่เผยแพร่แล้ว
- เจ้าหน้าที่ใช้บัญชีเดิมได้: `pop` และ `pok` แต่เอกสารสาธารณะห้ามเผยแพร่รหัสผ่าน
- การป้องกันบัญชีผู้ดูแลใช้ compensating controls: rate limit, temporary lock, audit log, IP allowlist/WAF, backup, rollback และ network restriction
- ข้อมูลลับต้องอยู่ฝั่ง server เท่านั้น: `DATABASE_URL`, `SESSION_PASSWORD`, Neon credentials และ production secrets ห้ามขึ้นต้นด้วย `VITE_`

## สถานะที่พร้อมแล้ว

- Server mutations สำคัญเรียก `requireAdmin()` ฝั่ง server ได้แก่ create/update/delete/import/export audit/status/user/hierarchy
- Session cookie เป็น `httpOnly`, `sameSite=lax`, และ `secure` ใน production
- Login มี rate limit 5 ครั้งใน 1 นาทีต่อ username และต่อ client IP พร้อม lock ชั่วคราว
- Failed login, successful login และ logout ถูกบันทึกใน `audit_events`
- หน้า login แสดง diagnostic แบบปลอดภัยสำหรับ production setup ได้แก่ `DATABASE_URL`, `SESSION_PASSWORD`, ตาราง `admin_users`, และบัญชี admin ที่ยังไม่ได้ seed โดยไม่เปิดเผย secret หรือ stack trace
- หน้า admin direct URL เช่น `/admin/users`, `/admin/audit`, `/admin/hierarchy` ซ่อน UI และไม่ยิง query เมื่อยังไม่ login
- Public metadata แสดงแหล่งข้อมูล วันที่ปรับปรุงล่าสุด สถานะข้อมูล และหมายเหตุการตรวจสอบ
- Public routes `/about` และ `/manual` พร้อมใช้งานสำหรับคำอธิบายระบบ ข้อจำกัดข้อมูล PDPA/accessibility และคู่มือที่พิมพ์หรือบันทึกเป็น PDF ได้
- Public data filter ใช้ `publish_status` เมื่อมีคอลัมน์นี้ โดย public เห็น `reviewed` และ `published`; admin เห็นข้อมูลครบเพื่อใช้ตรวจทาน
- หน้า `/admin/hierarchy` พร้อมจัดการยุทธศาสตร์ แนวทาง และแผนงาน พร้อมกันลบรายการที่ยังมีข้อมูลลูก
- หน้า `/admin/users` รองรับเพิ่ม ลบ และรีเซ็ตรหัสผ่านผู้ดูแลแล้ว
- Project/annotation search รองรับการค้นหาแบบ normalized สำหรับภาษาไทย เลขไทย/อารบิก ช่องว่าง เครื่องหมายคั่น และข้อความจาก Excel text box ที่ถูก OOXML split เช่น `ครั้งที่ 2/2568`
- Export Excel มี metadata sheet และ sanitize ค่า string ที่ขึ้นต้นด้วย `=`, `+`, `-`, `@` เพื่อลดความเสี่ยง Excel formula injection
- Raw Excel ใน `src/*.xlsx` ถูก ignore และไม่ควร commit ขึ้น public repository

## Environment Variables

ตั้งค่าบน Vercel Production:

```text
DATABASE_URL=<Neon pooled connection string>
SESSION_PASSWORD=<random 32+ chars>
ADMIN_LOGIN_ENABLED=true
ADMIN_IP_ALLOWLIST=<optional comma-separated public IP list>
```

หมายเหตุ:

- หากต้องการปิด admin login ชั่วคราวใน production ให้ตั้ง `ADMIN_LOGIN_ENABLED=false`
- หากใช้ WAF หรือ Vercel Firewall แล้ว ควรจำกัด `/login` และ server function login endpoint ให้ใช้ได้จากเครือข่ายเจ้าหน้าที่เท่านั้น
- หากใช้ `ADMIN_IP_ALLOWLIST` ต้องใส่ IP ที่ reverse proxy ส่งมาจาก `x-forwarded-for`

## Publish Workflow

แนวทาง workflow สำหรับเจ้าหน้าที่:

```text
Draft -> Reviewed -> Published
```

ข้อกำหนด:

- Public user เห็นข้อมูลที่ `publish_status = 'reviewed'` หรือ `publish_status = 'published'` ตาม implementation ปัจจุบัน
- Admin เห็น Draft/Reviewed/Published ได้เพื่อเตรียมข้อมูล
- ทุกการเปลี่ยนสถานะ publish ต้องบันทึก audit log
- Migration เพิ่ม field ที่จำเป็นแล้ว: `publish_status`, `published_at`, `published_by`, `validation_status`, `reconciliation_status`, `data_version`, `plan_revision`, `source_file_name`, `imported_at`, `imported_by`
- หากยังไม่มีแถวที่เป็น reviewed/published ระบบ public read จะ fallback เป็นข้อมูลทั้งหมดเพื่อไม่ให้ portal ว่างระหว่าง setup ต้องตัดสินใจอีกครั้งก่อน strict public launch

## Data Governance Metadata

ข้อมูลที่ควรมีต่อ record:

- `source_file_name`
- `import_batch_id`
- `imported_at`
- `imported_by`
- `validation_status`
- `reconciliation_status`
- `publish_status`
- `published_at`
- `published_by`
- `data_version`
- `plan_revision`

หน้าสาธารณะควรแสดงอย่างน้อย:

- วันที่ปรับปรุงข้อมูลล่าสุด
- แหล่งข้อมูล
- สถานะข้อมูล
- หมายเหตุการตรวจสอบข้อมูล

## Pre-launch Checklist

- [ ] รัน `npm run build` ผ่าน
- [ ] รัน `npm run migrate` กับ Neon production แล้วตรวจว่าคอลัมน์ governance เพิ่มครบ
- [ ] ยืนยันว่า `.env` ไม่ถูก track ด้วย `git ls-files | findstr /i ".env"`
- [ ] ยืนยันว่าไม่มี raw Excel หรือไฟล์ forensic/staging/textbox output ถูก track
- [ ] ตรวจ `dist/client` หลัง build ว่าไม่มี `DATABASE_URL`, `SESSION_PASSWORD`, `postgresql://`, `npg_`
- [ ] ทดสอบ public routes โดยไม่ login: `/`, `/projects`, `/projects/:id`, `/equipment`, `/about`, `/manual`
- [ ] ทดสอบ admin routes โดยไม่ login: `/import`, `/admin/users`, `/admin/audit`, `/admin/hierarchy` ต้องไม่เห็น control จัดการ
- [ ] ทดสอบยิง mutation โดยไม่ login ต้องได้ 401/ไม่สำเร็จ
- [ ] ทดสอบ login ผิด 5 ครั้งใน 1 นาที ต้องถูก lock ชั่วคราวและเกิด audit log
- [ ] ทดสอบบัญชีผู้ดูแลที่ production seed ไว้ login ได้ตามเดิม
- [ ] ทดสอบ `/admin/hierarchy` เพิ่ม/แก้ไข/ลบยุทธศาสตร์ แนวทาง และแผนงาน พร้อม child-record delete guard
- [ ] ทดสอบ `/admin/users` เพิ่ม ลบ และรีเซ็ตรหัสผ่านผู้ดูแล
- [ ] ทดสอบ Vercel login setup diagnostics โดยยืนยันว่าหาก env/table/user setup ผิด จะได้ข้อความไทยที่บอกสาเหตุโดยไม่เปิดเผย secret
- [ ] ทดสอบ annotation search ด้วย `ครั้งที่ 2/2568` และเลขไทย `ครั้งที่ ๒/๒๕๖๘`
- [ ] ทดสอบ export public ว่าไม่มีข้อมูล admin/audit/internal note
- [ ] ตั้งค่า Vercel Firewall/WAF หรือ network allowlist สำหรับ admin login
- [ ] ตั้ง backup schedule และทดสอบ restore Neon ก่อนเปิด public

## Neon Backup / Restore

- เปิด Point-in-Time Restore หรือ scheduled backup ตาม plan ของ Neon
- ก่อน import ใหญ่ ให้สร้าง restore point หรือ branch แยกสำหรับ staging
- หลัง import ให้ตรวจ reconciliation summary ก่อน publish
- หาก import ผิด:
  1. หยุด publish ข้อมูลชุดนั้น
  2. ตรวจ `import_batches` และ `audit_events`
  3. rollback ด้วย batch id หรือ restore Neon branch
  4. บันทึกเหตุการณ์และผลการแก้ไขใน audit/operation log

## Deployment บน Vercel + Neon

1. สร้าง Neon database และใช้ pooled connection string
2. ตั้ง env vars บน Vercel Production, Preview, Development ให้แยกกัน
3. รัน migration กับ production database
4. Deploy ผ่าน Vercel
5. ตรวจ `/` และ server functions ว่าเชื่อม DB ได้
6. ตั้ง firewall/IP restriction สำหรับ admin login
7. ทดสอบ public read-only และ admin workflow ตาม checklist

## Residual Risks

- บัญชี admin ที่มีรหัสง่ายยังมีความเสี่ยงสูง ต้องชดเชยด้วย WAF/IP restriction และ monitoring
- Rate limit แบบ in-memory ช่วยลด brute force ต่อ instance แต่ production serverless อาจ scale หลาย instance จึงควรมี WAF/rate limit ชั้นหน้า
- Publish workflow ยังต้องมี UI สำหรับเปลี่ยน Draft/Reviewed/Published ให้ครบในเวอร์ชันถัดไป
- ควรย้ายไฟล์ Excel ต้นทางและ forensic artifacts ไปอยู่ที่ private storage ไม่ใช่ public repo

## TODO เวอร์ชันถัดไป

- เพิ่ม UI สำหรับ Draft/Reviewed/Published พร้อม audit log
- ตัดสินใจเรื่อง strict public publish mode ว่าจะปิด fallback เมื่อไม่มี reviewed/published หรือไม่
- เพิ่ม import staging preview, validation report และ confirmation ก่อน commit
- เพิ่ม public CSV/PDF export เฉพาะข้อมูล Published พร้อม filter metadata
- เพิ่ม health endpoint ที่คืนสถานะ DB แบบไม่เปิดเผย secrets
- เพิ่ม server-side structured logging สำหรับ error สำคัญ
- เพิ่ม automated tests สำหรับ unauthenticated mutation, admin guard, login rate limit และ export sanitization
