# Sora Generation Status

อัปเดตล่าสุด: 2026-05-13

## สถานะปัจจุบัน

### Gamma Presentation (เสร็จแล้ว ✓)

- สร้าง Gamma presentation 7 slides ภาษาไทยสำเร็จแล้ว
- **Link:** https://gamma.app/docs/14lr074ar7bw3y6
- Theme: Sage (เขียว-เบจ, โทนราชการ)
- ใช้ Gamma credits: 63 | เหลือ: 167

### Sora B-roll (รอ billing fix)

- เตรียม prompt แยกสำหรับ Sora ครบ 4 shot แล้ว
- ติดตั้ง OpenAI Python SDK ในเครื่องแล้ว
- ตรวจพบ `OPENAI_API_KEY` ใน User environment แล้ว
- ทดลองเรียก Sora API แล้ว แต่ยังสร้างวิดีโอไม่ได้เพราะ API ตอบกลับว่า `billing_hard_limit_reached`

## สิ่งที่ต้องทำก่อน generate Sora ซ้ำ

1. เข้า OpenAI Platform billing
2. เพิ่มเครดิตหรือปรับ billing hard limit ของ project/organization
3. กลับมารันคำสั่ง:

```powershell
.\docs\admin-training-video\generate-sora.ps1
```

## Output ที่คาดหวังหลัง generate Sora สำเร็จ

ไฟล์จะถูกเก็บใน:

```text
docs/admin-training-video/generated/
```

รายการไฟล์:

- `sora-shot-s1-documents.mp4`
- `sora-shot-s2-officer.mp4`
- `sora-shot-s3-transition.mp4`
- `sora-shot-s4-closing.mp4`
- metadata `.json` ของแต่ละ shot

## หมายเหตุความปลอดภัย

- ไม่เก็บ API key ลงไฟล์
- Script อ่าน key จาก environment เท่านั้น
- ห้ามส่ง key ผ่านแชตหรือ commit key ลง repository
