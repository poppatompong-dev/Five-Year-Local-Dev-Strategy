# Pre-Launch Checklist

ตรวจสอบล่าสุด: 2026-05-13

เอกสารนี้ใช้คู่กับ `docs/PUBLIC_LAUNCH_READINESS.md` สำหรับเตรียมเปิดระบบสู่สาธารณะในรูปแบบ Public Read-only Portal

## Critical

### 1. คงบัญชีผู้ดูแลเดิม แต่ต้องใช้มาตรการชดเชย

ระบบยังคงบัญชีภายในเดิมไว้ตามข้อกำหนดของเจ้าของระบบ:

- username: `pop`
- username: `pok`

ห้ามเผยแพร่รหัสผ่านในเอกสารสาธารณะหรือหน้า public ใด ๆ และห้ามบังคับเปลี่ยนรหัสผ่านเป็นเงื่อนไข launch

มาตรการที่ต้องเปิดใช้แทน:

- Login rate limit และ temporary lock
- Audit log สำหรับ login/logout/failed login
- Vercel Firewall, WAF หรือ IP restriction สำหรับหน้า login/admin
- `ADMIN_LOGIN_ENABLED=false` ได้เมื่อจำเป็นต้องปิด admin login ชั่วคราว
- `ADMIN_IP_ALLOWLIST` ได้หากต้องจำกัด IP ฝั่ง server

### 2. ยืนยัน Environment Variables บน Vercel

ต้องมีเฉพาะฝั่ง server:

```text
DATABASE_URL=<Neon pooled connection string>
SESSION_PASSWORD=<random 32+ chars>
ADMIN_LOGIN_ENABLED=true
ADMIN_IP_ALLOWLIST=<optional comma-separated IPs>
```

ห้ามใช้ `VITE_DATABASE_URL`, `VITE_SESSION_PASSWORD` หรือ env ที่ทำให้ secret ถูก bundle ไป client

### 3. เปิด Neon Backup / Point-in-Time Restore

- เปิด backup/PITR ตาม plan ของ Neon
- ก่อน import ใหญ่ ให้ใช้ staging branch หรือ restore point
- ตรวจ restore procedure อย่างน้อยหนึ่งครั้งก่อนเปิด public

### 4. ไม่ commit ไฟล์ข้อมูลดิบ

ตรวจว่าไฟล์เหล่านี้ไม่ถูก track:

- `.env`, `.env.*`
- raw Excel ใน `src/*.xlsx`, `src/*.xls`
- `scripts/forensic-*`
- `scripts/staging-*`
- `scripts/textbox-*`
- `scripts/raw-import-*`
- `scripts/import-output-*`

คำสั่งตรวจ:

```bash
git ls-files | findstr /i ".env .xlsx forensic staging textbox raw-import import-output"
```

### 5. ตรวจ Public Read-only

- [ ] ไม่ login แล้วเปิด `/`, `/projects`, `/projects/:id`, `/equipment`, `/about`, `/manual` ได้
- [ ] ไม่ login แล้วเปิด `/import`, `/admin/users`, `/admin/audit`, `/admin/hierarchy` ไม่เห็น control จัดการ
- [ ] Public user ไม่เห็นปุ่มเพิ่ม แก้ไข ลบ import user management หรือรายงานราชการสำหรับ admin
- [ ] Public export มีเฉพาะข้อมูลเผยแพร่และ metadata แหล่งข้อมูล
- [ ] หากเปิดใช้ `publish_status` ให้ยืนยันว่า public เห็นเฉพาะ `reviewed`/`published` หรือยืนยันอย่างเป็นทางการว่าจะใช้ fallback ข้อมูลทั้งหมดระหว่าง setup
- [ ] Direct mutation โดยไม่ login ต้องไม่สำเร็จ
- [ ] ค้นหา annotation ด้วยตัวอย่าง `ครั้งที่ 2/2568` ต้องพบโครงการที่มี text box แม้ raw text ถูกแยกช่องว่างหรือใช้รูปแบบ `ครั้งที่ 2 / 2568`
- [ ] ค้นหา annotation ด้วยเลขไทย เช่น `ครั้งที่ ๒/๒๕๖๘` ต้อง match กับข้อมูลเลขอารบิกในฐานข้อมูล

### 6. ตรวจ Admin Workflow

- [ ] `pop` login ได้
- [ ] `pok` login ได้
- [ ] หาก login บน Vercel ไม่สำเร็จ หน้า login ต้องแสดงสาเหตุ setup ที่อ่านได้ เช่น ขาด `DATABASE_URL`, ขาด/สั้นกว่า 32 ตัวอักษรสำหรับ `SESSION_PASSWORD`, ยังไม่ได้ migrate `admin_users`, หรือยังไม่ได้ seed admin users
- [ ] เพิ่ม/แก้ไข/ลบโครงการได้หลัง login
- [ ] import ทำงานเฉพาะ admin
- [ ] โครงสร้างแผน `/admin/hierarchy` เพิ่ม/แก้ไข/ลบยุทธศาสตร์ แนวทาง และแผนงานได้ และลบรายการที่มีข้อมูลลูกไม่ได้
- [ ] จัดการผู้ใช้ `/admin/users` เพิ่ม ลบ และรีเซ็ตรหัสผ่านได้
- [ ] audit log แสดง create/update/delete/import/export/status/login/logout
- [ ] login ผิด 5 ครั้งใน 1 นาทีถูก lock ชั่วคราวและมี failed login audit

### 7. ตรวจ Build และ Secret Scan

```bash
npm run build
rg "DATABASE_URL|SESSION_PASSWORD|postgresql://|npg_" dist/client
```

ผลลัพธ์ที่ถูกต้องคือ build ผ่านและไม่พบ secret ใน client bundle

## Production Launch Checklist

- [ ] ตั้งค่า Vercel env vars ครบ
- [ ] รัน migration กับ Neon production
- [ ] ยืนยัน `publish_status` และ governance columns พร้อมใช้งาน
- [ ] เปิด Neon backup/PITR
- [ ] เปิด WAF/IP restriction สำหรับ admin login
- [ ] ตรวจ public routes แบบ incognito
- [ ] ตรวจ admin workflow ด้วยบัญชีเดิม
- [ ] ตรวจ export ว่าไม่มีข้อมูล internal/admin/audit ปะปน
- [ ] ตรวจ `.env` และ raw import files ไม่ถูก track
- [ ] บันทึก rollback plan และผู้รับผิดชอบก่อนเปิด public
