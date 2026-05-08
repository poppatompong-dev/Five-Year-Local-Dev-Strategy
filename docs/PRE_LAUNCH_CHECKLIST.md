# Pre-Launch Checklist — สิ่งที่ต้องจัดการก่อนเผยแพร่ให้เจ้าหน้าที่ใช้งาน

> ตรวจสอบล่าสุด: 2026-05-08  
> สถานะระบบ: Feature-complete, deployed บน Vercel แล้ว

---

## 🔴 ต้องทำก่อน Deploy (Critical)

### 1. เปลี่ยน Admin Credentials บน Production

ค่าเริ่มต้นจาก seed script (`pop`/`pop`, `pok`/`pok`) ต้องถูกแทนที่ด้วย credentials จริงก่อนเปิดใช้งาน

**ตัวเลือก A — ใช้ seed script:**
1. ตั้ง environment variable บน Vercel:
   ```
   ADMIN_USERS=username1:password1,username2:password2
   ```
2. รันบนเครื่อง local (เชื่อม DB production):
   ```bash
   npm run seed-admins
   ```

**ตัวเลือก B — ใช้หน้า Admin UI:**
1. Login ด้วย user เดิม
2. เข้า `/admin/users` → สร้าง user ใหม่
3. ลบ `pop` และ `pok` ออก

---

### 2. ยืนยัน Environment Variables บน Vercel

เข้า Vercel → Project Settings → Environment Variables → ตรวจสอบว่ามีทั้ง 2 ตัวในทุก scope (Production, Preview, Development):

| Variable | รูปแบบ | หมายเหตุ |
|----------|--------|----------|
| `DATABASE_URL` | `postgresql://...@...-pooler...neon.tech/neondb?sslmode=require` | Neon pooler endpoint เท่านั้น |
| `SESSION_PASSWORD` | hex string ยาว 32+ ตัวอักษร | Generate ด้วยคำสั่งด้านล่าง |

**Generate SESSION_PASSWORD ใหม่:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **หมายเหตุ:** ถ้าเปลี่ยน `SESSION_PASSWORD` หลังจากมีคนใช้งานแล้ว session เก่าจะ invalidate ทันที — ทุกคนต้อง login ใหม่

---

### 3. เปิด Neon Automated Backups (Point-in-Time Recovery)

ตอนนี้ไม่มี backup ใดๆ — ถ้าข้อมูลหายหรือถูกลบโดยไม่ตั้งใจจะกู้คืนไม่ได้

**ขั้นตอน (ไม่ต้องแก้โค้ด):**
1. เข้า [Neon Console](https://console.neon.tech)
2. เลือก Project → Branches
3. เปิดใช้ **Point-in-Time Recovery**
4. ตั้งค่า retention period (แนะนำ 7 วันขึ้นไป)

---

## 🟡 ควรทำก่อนเปิดใช้ (สำคัญแต่ไม่บล็อก)

### 4. ลบหรือ Gitignore ไฟล์ข้อมูลใน `scripts/`

ไฟล์ต่อไปนี้อาจมีข้อมูลจริงและไม่ควรอยู่ใน public repo:

```
scripts/forensic-output.json
scripts/forensic-report.txt
scripts/staging-projects.json
scripts/textbox-data.json
scripts/textbox-report.txt
```

**วิธีแก้ — เพิ่มเข้า .gitignore และลบออกจาก git history:**
```bash
# เพิ่มใน .gitignore
echo "scripts/forensic-*.json" >> .gitignore
echo "scripts/forensic-*.txt" >> .gitignore
echo "scripts/staging-*.json" >> .gitignore
echo "scripts/textbox-*.json" >> .gitignore
echo "scripts/textbox-*.txt" >> .gitignore

# ลบออกจาก git tracking (แต่ยังเก็บไฟล์ไว้ในเครื่อง)
git rm --cached scripts/forensic-output.json scripts/forensic-report.txt
git rm --cached scripts/staging-projects.json
git rm --cached scripts/textbox-data.json scripts/textbox-report.txt
git commit -m "chore: remove sensitive data files from tracking"
```

---

### 5. เพิ่ม Rate Limiting บน Login Endpoint

ตอนนี้ login ไม่มีการป้องกัน brute-force — ใส่รหัสผิดได้ไม่จำกัดครั้ง

**ตัวเลือก A — Vercel WAF (ง่ายที่สุด, ไม่ต้องแก้โค้ด):**
1. เข้า Vercel → Project Settings → Security
2. เปิด **Attack Challenge Mode**

**ตัวเลือก B — In-process rate limiter (แก้โค้ด):**
- ไฟล์: `src/lib/auth.ts`
- เพิ่ม in-memory Map นับ failed attempts per IP
- Block หลัง 5 ครั้งภายใน 1 นาที

---

### 6. ทดสอบ Workflow หลักบน Production URL

ทดสอบที่ `https://five-year-local-dev-strategy.vercel.app` ด้วยตัวเองก่อนเปิดให้เจ้าหน้าที่:

- [ ] Login / Logout ทำงานถูกต้อง
- [ ] สร้าง / แก้ไข / ลบ โครงการ (ในฐานะ admin)
- [ ] Import ไฟล์ Excel ด้วย template มาตรฐาน
- [ ] Export รายงานเป็น PDF และ Excel
- [ ] หน้า `/admin/audit` แสดง log กิจกรรม
- [ ] เปิดดูในโหมด Incognito (public user) — ต้องเห็นแค่ read-only, ไม่มีปุ่ม CRUD

---

## 🟢 ทำได้ทีหลัง (ไม่บล็อก launch)

### 7. UI จัดการ Strategy / Tactic / Plan
ตอนนี้ถ้าจะเพิ่มหรือแก้ไข ยุทธศาสตร์ / แนวทาง / แผนงาน ต้องรัน CLI script  
แนะนำเพิ่มหน้า `/admin/hierarchy` สำหรับ CRUD ผ่าน UI ในเวอร์ชันถัดไป

### 8. แสดงสถานะ `not_set` ในกราฟ Dashboard
โครงการที่ยังไม่กำหนดสถานะไม่แสดงในกราฟ Stacked Bar ของแต่ละยุทธศาสตร์  
ไฟล์ที่เกี่ยวข้อง: `src/routes/index.tsx`

### 9. เพิ่ม UI เปลี่ยนรหัสผ่าน
ตอนนี้ admin ไม่สามารถเปลี่ยนรหัสผ่านตัวเองได้ผ่าน UI — ต้องใช้หน้า `/admin/users` ลบแล้วสร้างใหม่

---

## สรุป Checklist

```
[ ] 1. เปลี่ยน admin credentials บน production
[ ] 2. ยืนยัน DATABASE_URL และ SESSION_PASSWORD บน Vercel
[ ] 3. เปิด Neon Point-in-Time Recovery
[ ] 4. ลบ/gitignore ไฟล์ข้อมูลใน scripts/
[ ] 5. เปิด Vercel WAF หรือเพิ่ม rate limiting บน login
[ ] 6. ทดสอบ workflow หลักบน production URL
```
