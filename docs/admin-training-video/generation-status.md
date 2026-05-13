# สถานะการสร้างสื่อแนะนำระบบ

อัปเดตล่าสุด: 2026-05-13

## Gamma Presentation (เสร็จแล้ว ✓)

- **Link:** https://gamma.app/docs/14lr074ar7bw3y6
- Theme: Sage (เขียว-เบจ, โทนราชการ)
- ภาษา: ไทย | 7 slides
- ใช้ Gamma credits: 63 | เหลือ: 167

Presentation นี้คือ output หลักสำหรับแนะนำระบบให้เจ้าหน้าที่ แชร์ link หรือฉายจากเบราว์เซอร์ได้ทันที

## Final MP4 Video (สร้างแล้ว)

- **File:** `docs/admin-training-video/generated/final-admin-training-video.mp4`
- Format: MP4, 1280x720, 1:45 นาที
- ภาพประกอบ: screen capture จากระบบจริง + local animated b-roll fallback
- เสียงบรรยาย: Thai TTS จาก `voiceover-script.md`
- Subtitle/caption: ฝังในวิดีโอจากเนื้อหาใน `captions.md` และ `admin-training-video.srt`

## Sora B-roll (ติดข้อจำกัด billing)

พยายามสร้างด้วย `generate-sora.ps1` แล้ว แต่ Sora API ตอบ `billing_hard_limit_reached`
จึงใช้ local animated b-roll fallback แทนเพื่อให้ได้วิดีโอพร้อมใช้งานในรอบนี้
