from __future__ import annotations

import asyncio
import math
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "docs" / "admin-training-video"
OUT = WORK / "generated"
SCREENS = OUT / "screens"
VIDEO = OUT / "final-admin-training-video.mp4"
VOICE = OUT / "voiceover-th.mp3"
VOICE_SYNC = OUT / "voiceover-th-105s.m4a"
WIDTH, HEIGHT, FPS, DURATION = 1280, 720, 24, 105
FONT = Path("C:/Windows/Fonts/LeelawUI.ttf")
BOLD = Path("C:/Windows/Fonts/leelawdb.ttf")


@dataclass(frozen=True)
class TimedText:
    start: float
    end: float
    text: str


VOICEOVER = (
    "งานแผนพัฒนาท้องถิ่นมีข้อมูลจำนวนมาก ทั้งโครงการ งบประมาณ หน่วยงาน และเอกสารประกอบ "
    "การค้นจากไฟล์หลายชุดอาจใช้เวลานาน และตรวจสอบย้อนหลังได้ยาก\n\n"
    "ระบบบริหารแผนพัฒนาท้องถิ่น 5 ปี ช่วยรวมข้อมูลสำคัญไว้ในที่เดียว "
    "เห็นภาพรวมโครงการ งบประมาณ สถานะ และความคืบหน้าตามยุทธศาสตร์ได้ทันที\n\n"
    "เจ้าหน้าที่สามารถค้นหาและกรองข้อมูลได้ตามชื่อโครงการ หน่วยงาน ปีงบประมาณ สถานะ "
    "ยุทธศาสตร์ หรือข้อความหมายเหตุจากไฟล์ Excel เดิม ทำให้หาข้อมูลประกอบงานวิเคราะห์ได้เร็วขึ้น\n\n"
    "เมื่อได้ชุดข้อมูลที่ต้องการแล้ว สามารถส่งออกเป็น Excel หรือเปิดรายงานรูปแบบ PDF "
    "สำหรับใช้งานราชการได้ โดยระบบแนบข้อมูลกำกับ เช่น วันที่ส่งออก แหล่งข้อมูล และตัวกรองที่ใช้\n\n"
    "สำหรับผู้ดูแลระบบ หลังเข้าสู่ระบบแล้วจะสามารถปรับสถานะโครงการ แก้ไขข้อมูล เพิ่มรายการ "
    "นำเข้าข้อมูลจาก Excel และดูประวัติการใช้งานได้ การเปลี่ยนแปลงสำคัญจะถูกบันทึกไว้เพื่อการตรวจสอบย้อนหลัง\n\n"
    "จากงานเอกสารที่กระจัดกระจาย ระบบช่วยให้เจ้าหน้าที่ทำงานเป็นระบบขึ้น ลดเวลาค้นหา "
    "ลดงานซ้ำ และใช้ข้อมูลขับเคลื่อนการติดตามแผนได้มั่นใจมากขึ้น\n\n"
    "ระบบบริหารแผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์ คิดเป็นระบบ เขียนเป็นจริง ขับเคลื่อนเมืองด้วยข้อมูล"
)

CAPTIONS = [
    TimedText(0, 5, "ข้อมูลแผนจำนวนมาก ค้นหาด้วยไฟล์เดิมอาจใช้เวลานาน"),
    TimedText(5, 10, "รวมโครงการ งบประมาณ และเอกสารประกอบไว้ให้ตรวจได้ง่าย"),
    TimedText(10, 18, "Dashboard เห็นภาพรวมแผน 5 ปีในหน้าเดียว"),
    TimedText(18, 24, "คลิกกราฟหรือสถานะ เพื่อกรองข้อมูลต่อได้ทันที"),
    TimedText(24, 34, "ค้นหาโครงการ หน่วยงาน ปีงบประมาณ และสถานะ"),
    TimedText(34, 43, "ค้นข้อความหมายเหตุจาก Excel text box ได้ด้วย"),
    TimedText(43, 52, "ส่งออก Excel จากข้อมูลที่กรองแล้ว"),
    TimedText(52, 61, "เปิดรายงาน PDF สำหรับใช้งานราชการ"),
    TimedText(61, 70, "ผู้ดูแลระบบจัดการข้อมูลได้จากเมนูแอดมิน"),
    TimedText(70, 78, "ปรับสถานะ แก้ไข นำเข้า และติดตามงาน"),
    TimedText(78, 85, "Audit log ช่วยตรวจสอบย้อนหลังทุกการเปลี่ยนแปลงสำคัญ"),
    TimedText(85, 98, "ลดเวลาค้นหา ลดงานซ้ำ ใช้ข้อมูลขับเคลื่อนงานแผน"),
    TimedText(98, 105, "ระบบบริหารแผนพัฒนาท้องถิ่น เทศบาลนครนครสวรรค์"),
]

SUBS = [
    TimedText(0, 10, "งานแผนมีข้อมูลจำนวนมาก การค้นจากไฟล์หลายชุดอาจใช้เวลานานและตรวจสอบย้อนหลังได้ยาก"),
    TimedText(10, 24, "ระบบนี้รวมข้อมูลโครงการ งบประมาณ สถานะ และความคืบหน้าตามยุทธศาสตร์ไว้ในที่เดียว"),
    TimedText(24, 43, "เจ้าหน้าที่ค้นหาและกรองข้อมูลได้ตามชื่อโครงการ หน่วยงาน ปีงบประมาณ สถานะ หรือหมายเหตุจากไฟล์ Excel เดิม"),
    TimedText(43, 61, "เมื่อได้ชุดข้อมูลที่ต้องการ สามารถส่งออกเป็น Excel หรือเปิดรายงาน PDF สำหรับใช้งานราชการได้"),
    TimedText(61, 82, "ผู้ดูแลระบบสามารถปรับสถานะ แก้ไขข้อมูล นำเข้าข้อมูล และดูประวัติการใช้งานเพื่อการตรวจสอบย้อนหลัง"),
    TimedText(82, 105, "ระบบช่วยลดเวลาค้นหา ลดงานซ้ำ และใช้ข้อมูลขับเคลื่อนการติดตามแผนได้มั่นใจมากขึ้น"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD if bold else FONT), size=size)


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split(" ")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text_box(img: Image.Image, text: str, y: int, size: int, max_width: int, fill=(18, 28, 31, 220), text_fill=(255, 255, 255)) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    fnt = font(size, True)
    lines = wrap(d, text, fnt, max_width)
    line_h = size + 12
    box_h = len(lines) * line_h + 28
    box_w = max(d.textbbox((0, 0), line, font=fnt)[2] for line in lines) + 48
    x = (WIDTH - box_w) // 2
    d.rounded_rectangle((x, y, x + box_w, y + box_h), radius=18, fill=fill)
    for i, line in enumerate(lines):
        tw = d.textbbox((0, 0), line, font=fnt)[2]
        d.text((WIDTH // 2 - tw // 2, y + 14 + i * line_h), line, font=fnt, fill=text_fill)
    img.alpha_composite(overlay)


def active_text(items: list[TimedText], t: float) -> str | None:
    for item in items:
        if item.start <= t < item.end:
            return item.text
    return None


def gradient(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), c1)
    px = img.load()
    for y in range(HEIGHT):
        r = y / HEIGHT
        col = tuple(int(c1[i] * (1 - r) + c2[i] * r) for i in range(3))
        for x in range(WIDTH):
            px[x, y] = col
    return img.convert("RGBA")


def screen_image(name: str) -> Image.Image:
    path = SCREENS / f"{name}.png"
    if path.exists():
        return Image.open(path).convert("RGBA")
    img = gradient((236, 242, 238), (210, 224, 216))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((110, 90, 1170, 610), radius=16, fill=(255, 255, 255), outline=(134, 158, 145), width=2)
    d.text((150, 130), "ภาพหน้าระบบ", font=font(48, True), fill=(31, 73, 56))
    d.text((150, 205), name, font=font(32), fill=(83, 92, 86))
    return img


SCREENS_CACHE = {
    name: screen_image(name)
    for name in [
        "dashboard",
        "dashboard-lower",
        "projects",
        "projects-search",
        "project-detail",
        "login-before",
        "admin-projects",
        "admin-import",
        "admin-audit",
    ]
}


def draw_documents(t: float) -> Image.Image:
    img = gradient((245, 242, 232), (210, 224, 214))
    d = ImageDraw.Draw(img)
    drift = int(18 * math.sin(t * 0.8))
    for i, (x, y, color) in enumerate([(170, 150, (250, 250, 245)), (270, 115, (232, 241, 232)), (390, 180, (255, 252, 241)), (520, 130, (236, 239, 233))]):
        d.rounded_rectangle((x + drift // 3, y + i * 18, x + 390 + drift // 3, y + 270 + i * 18), radius=8, fill=color, outline=(162, 172, 157), width=2)
        for row in range(7):
            yy = y + 45 + row * 28 + i * 18
            d.line((x + 35, yy, x + 340, yy), fill=(158, 169, 160), width=2)
        d.rectangle((x + 35, y + 30 + i * 18, x + 160, y + 55 + i * 18), fill=(73, 125, 95))
    d.rounded_rectangle((780, 210, 1110, 440), radius=18, fill=(42, 48, 46))
    d.rounded_rectangle((805, 235, 1085, 405), radius=10, fill=(232, 239, 234))
    for i, h in enumerate([80, 120, 65, 150]):
        d.rounded_rectangle((840 + i * 48, 370 - h, 870 + i * 48, 370), radius=5, fill=(54, 127, 94))
    d.text((125, 555), "ค้นหา ออกรายงาน จัดการข้อมูลแผน ในระบบเดียว", font=font(46, True), fill=(30, 66, 50))
    return img


def draw_officer(t: float) -> Image.Image:
    img = gradient((238, 244, 239), (214, 228, 219))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((100, 455, 1180, 650), radius=18, fill=(178, 147, 102))
    d.rounded_rectangle((240, 140, 790, 500), radius=22, fill=(36, 45, 43))
    d.rounded_rectangle((270, 170, 760, 465), radius=12, fill=(239, 244, 241))
    for i in range(4):
        d.rounded_rectangle((315, 220 + i * 52, 710, 248 + i * 52), radius=8, fill=(224, 234, 227))
    d.ellipse((850, 180, 960, 290), fill=(166, 127, 99))
    d.rounded_rectangle((795, 292, 1015, 535), radius=80, fill=(67, 103, 84))
    d.line((960, 430, 1080 + int(16 * math.sin(t * 4)), 500), fill=(166, 127, 99), width=24)
    d.rounded_rectangle((1040, 480, 1130, 535), radius=18, fill=(45, 51, 50))
    d.text((140, 64), "ผู้ดูแลระบบทำงานจากข้อมูลชุดเดียวกัน", font=font(46, True), fill=(31, 73, 56))
    return img


def draw_transition(t: float) -> Image.Image:
    img = gradient((244, 245, 239), (222, 235, 228))
    d = ImageDraw.Draw(img)
    p = min(max((t - 82) / 16, 0), 1)
    for i in range(4):
        x = int(130 + i * 90 - p * 60)
        d.rounded_rectangle((x, 420 - i * 16, x + 260, 590 - i * 16), radius=10, fill=(245, 242, 232), outline=(160, 172, 160), width=2)
    for i in range(5):
        x = int(520 + i * 115 + p * 80)
        y = 145 + (i % 2) * 115
        d.rounded_rectangle((x, y, x + 230, y + 94), radius=16, fill=(255, 255, 255), outline=(95, 142, 113), width=3)
        d.rectangle((x + 25, y + 58, x + 185, y + 69), fill=(68, 128, 95))
        d.rectangle((x + 25, y + 28, x + 115, y + 40), fill=(207, 168, 91))
    d.text((120, 86), "จากเอกสารกระจัดกระจาย สู่ dashboard ที่ตรวจสอบได้", font=font(42, True), fill=(31, 73, 56))
    return img


def draw_end(t: float) -> Image.Image:
    img = gradient((236, 244, 239), (255, 249, 235))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((175, 150, 1105, 550), radius=26, fill=(255, 255, 255), outline=(104, 143, 117), width=3)
    d.text((235, 235), "ระบบบริหารแผนพัฒนาท้องถิ่น", font=font(60, True), fill=(29, 72, 54))
    d.text((235, 320), "เทศบาลนครนครสวรรค์", font=font(44, True), fill=(59, 89, 74))
    d.text((235, 405), "คิดเป็นระบบ เขียนเป็นจริง ขับเคลื่อนเมืองด้วยข้อมูล", font=font(34), fill=(84, 94, 88))
    return img


def draw_screen_segment(t: float, start: float, end: float, names: list[str]) -> Image.Image:
    span = end - start
    local = (t - start) / span
    idx = min(int(local * len(names)), len(names) - 1)
    base = SCREENS_CACHE[names[idx]]
    progress = (local * len(names)) % 1
    scale = 1.0 + 0.035 * math.sin(progress * math.pi)
    crop_w, crop_h = int(WIDTH / scale), int(HEIGHT / scale)
    x = int((WIDTH - crop_w) * (0.25 + 0.5 * progress))
    y = int((HEIGHT - crop_h) * (0.15 + 0.25 * progress))
    frame = base.crop((x, y, x + crop_w, y + crop_h)).resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(shade).rectangle((0, 0, WIDTH, HEIGHT), fill=(0, 0, 0, 20))
    frame.alpha_composite(shade)
    return frame


def render_frame(t: float) -> Image.Image:
    if t < 10:
        img = draw_documents(t)
    elif t < 24:
        img = draw_screen_segment(t, 10, 24, ["dashboard", "dashboard-lower"])
    elif t < 43:
        img = draw_screen_segment(t, 24, 43, ["projects", "projects-search", "project-detail"])
    elif t < 61:
        img = draw_screen_segment(t, 43, 61, ["projects-search", "dashboard-lower"])
    elif t < 68:
        img = draw_officer(t)
    elif t < 82:
        img = draw_screen_segment(t, 68, 82, ["login-before", "admin-projects", "admin-import", "admin-audit"])
    elif t < 98:
        img = draw_transition(t)
    else:
        img = draw_end(t)

    img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=105))
    caption = active_text(CAPTIONS, t)
    if caption:
        draw_text_box(img, caption, 38, 32, 1080, fill=(28, 62, 47, 225))
    sub = active_text(SUBS, t)
    if sub:
        draw_text_box(img, sub, 610, 23, 1120, fill=(12, 18, 18, 210))
    return img.convert("RGB")


async def make_voice() -> bool:
    if VOICE.exists() and VOICE.stat().st_size > 1024:
        return True
    try:
        communicate = edge_tts.Communicate(VOICEOVER, "th-TH-PremwadeeNeural", rate="-8%")
        await communicate.save(str(VOICE))
        return VOICE.exists() and VOICE.stat().st_size > 1024
    except Exception as exc:
        print(f"Voice generation failed: {exc}")
        return False


def media_duration(path: Path) -> float:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match:
        return 0
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def synced_voice() -> Path | None:
    if not VOICE.exists() or VOICE.stat().st_size < 1024:
        return None
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    duration = media_duration(VOICE)
    if duration <= 0:
        return VOICE
    tempo = max(0.5, min(2.0, duration / DURATION))
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(VOICE),
            "-filter:a",
            f"atempo={tempo:.6f}",
            "-t",
            str(DURATION),
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            str(VOICE_SYNC),
        ],
        check=True,
    )
    return VOICE_SYNC if VOICE_SYNC.exists() else VOICE


def make_video(has_voice: bool) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg,
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
    ]
    voice_path = synced_voice() if has_voice else None
    if voice_path:
        cmd += ["-i", str(voice_path)]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    cmd += [
        "-t",
        str(DURATION),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        str(VIDEO),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    total = DURATION * FPS
    for i in range(total):
        proc.stdin.write(render_frame(i / FPS).tobytes())
        if i and i % (FPS * 10) == 0:
            print(f"Rendered {i // FPS}s / {DURATION}s")
    proc.stdin.close()
    code = proc.wait()
    if code:
        raise SystemExit(code)


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    has_voice = await make_voice()
    make_video(has_voice)
    print(VIDEO)


if __name__ == "__main__":
    asyncio.run(main())
