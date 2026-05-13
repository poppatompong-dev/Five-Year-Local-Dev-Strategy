# Sora Prompts

ใช้ Sora สำหรับภาพเปิด ภาพเชื่อม และภาพปิดเท่านั้น ส่วน UI ระบบจริงให้ใช้ screen recording เพื่อความถูกต้องของเมนูและข้อความภาษาไทย

ค่าที่แนะนำ:

- Model: `sora-2`
- Size: `1280x720`
- Seconds: `4` หรือ `8`
- Audio: ปิดหรือ ambient เบา ๆ แล้วใส่ voiceover ในขั้นตัดต่อ
- Text: หลีกเลี่ยงการให้ Sora สร้างตัวหนังสือไทยในภาพ ให้ใส่ caption ในโปรแกรมตัดต่อแทน

## Shot S1: งานเอกสารจำนวนมาก

```text
Use case: short government workflow explainer video
Primary request: a warm cinematic office desk scene showing many organized but dense government planning documents, spreadsheets, folders, sticky notes, and budget tables
Scene/background: Thai municipal office desk, late afternoon, neat but busy paperwork, no visible private data
Subject: stacks of generic folders, printed tables, calculator, pen, laptop in the background
Action: slow push-in across the documents to suggest time-consuming manual searching
Camera: locked-off 35mm look with a gentle forward dolly, shallow depth of field
Lighting/mood: warm natural office light, realistic, professional, slightly busy but not chaotic
Color palette: warm white, muted green, paper cream, soft gold, dark gray
Style/format: realistic documentary-style b-roll, clean government office, 16:9
Timing/beats: 4 seconds, slow reveal from folders to laptop
Audio: no dialogue, subtle office ambience only
Constraints: no readable personal data, no real people, no logos, no brand names
Avoid: distorted text, fake official seals, dramatic clutter, dark mood
```

## Shot S2: เจ้าหน้าที่ฝ่ายแผนทำงานหน้าคอม

```text
Use case: short admin onboarding video
Primary request: a professional Thai municipal planning officer working calmly at a computer, reviewing structured planning data on screen
Scene/background: bright municipal office, clean desk, neutral background, work-focused atmosphere
Subject: generic office worker seen from behind or side angle, no identifiable face, laptop and monitor with abstract dashboard-like shapes
Action: the officer moves a mouse, checks a table, and nods slightly with confidence
Camera: medium over-the-shoulder shot, gentle handheld stability, no fast movement
Lighting/mood: soft daylight, supportive, modern public service mood
Color palette: white, municipal green, slate gray, soft gold
Style/format: realistic office b-roll, 16:9
Timing/beats: 4 seconds, hand moves mouse, screen glow, slight confident pause
Audio: no dialogue, quiet office ambience
Constraints: screen content should be abstract and unreadable, no passwords, no real logos, no identifiable person
Avoid: futuristic sci-fi UI, exaggerated gestures, readable fake Thai text
```

## Shot S3: จากแฟ้มกระดาษสู่ Dashboard

```text
Use case: transition shot for digital transformation in a municipal planning system
Primary request: paper planning folders visually transition into a clean digital dashboard made of simple charts, tables, and status cards
Scene/background: neutral office background, soft light, documents on desk transforming into abstract digital panels
Subject: generic documents and abstract dashboard panels, no real UI text
Action: smooth morph-like transition from paper folders to floating dashboard cards
Camera: slow lateral move, elegant and restrained
Lighting/mood: optimistic, organized, professional
Color palette: municipal green, white, soft gold, light gray, charcoal
Style/format: realistic b-roll with subtle digital overlay, not sci-fi, 16:9
Timing/beats: 4 seconds, paper at start, dashboard-like structure by the end
Audio: soft transition swell, no dialogue
Constraints: no readable text, no real logos, no private data
Avoid: flashy holograms, cluttered UI, neon cyber look, distorted characters
```

## Shot S4: ปิดท้าย งานแผนเป็นระบบขึ้น

```text
Use case: closing shot for a short public-sector admin training video
Primary request: a calm municipal office desk with a laptop showing abstract clean data panels, folders neatly stacked, and a sense of completed work
Scene/background: tidy Thai municipal planning office, morning light, professional and approachable
Subject: laptop with abstract dashboard shapes, neatly arranged folders, pen, small plant
Action: slow pull-back revealing an organized workspace ready for the next task
Camera: 35mm, stable slow pull-back, centered composition
Lighting/mood: calm, confident, optimistic, public service
Color palette: white, green, soft gold, warm wood, neutral gray
Style/format: realistic documentary b-roll, 16:9
Timing/beats: 4 seconds, quiet resolution and clarity
Audio: no dialogue, subtle warm ending tone
Constraints: no readable text, no passwords, no real people, no logos
Avoid: exaggerated success imagery, confetti, fake official seals, dark background
```

## ตัวอย่างคำสั่ง CLI ถ้าจะ generate จริง

> ต้องมี `OPENAI_API_KEY` และสิทธิ์ใช้งาน Sora API ในเครื่องก่อน

```powershell
python C:\Users\Patompong.l\.codex\skills\sora\scripts\sora.py create --model sora-2 --size 1280x720 --seconds 4 --prompt-file docs\admin-training-video\sora-shot-s1.txt
```

เพื่อความเป็นระเบียบ แนะนำให้คัด prompt แต่ละ shot ไปเป็นไฟล์ `.txt` แยกก่อนเรียก Sora CLI
