import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.ADMIN_VIDEO_BASE_URL || "http://127.0.0.1:8080";
const username = process.env.ADMIN_VIDEO_USERNAME || "pop";
const password = process.env.ADMIN_VIDEO_PASSWORD || "pop";
const outDir = path.resolve("docs/admin-training-video/generated/screens");

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1800);
}

async function shot(page, name) {
  await fs.mkdir(outDir, { recursive: true });
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await settle(page);
}

async function maybeClickFirstProject(page) {
  const links = page.locator('a[href^="/projects/"]');
  if (await links.count()) {
    await links.first().click();
    await settle(page);
  }
}

async function login(page) {
  await goto(page, "/login");
  await shot(page, "login-before");

  const inputs = page.locator("input");
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(username);
    await inputs.nth(1).fill(password);
    await page.locator('button[type="submit"], button').last().click();
    await page.waitForTimeout(2500);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  locale: "th-TH",
});
const page = await context.newPage();

try {
  await goto(page, "/");
  await shot(page, "dashboard");
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(700);
  await shot(page, "dashboard-lower");

  await goto(page, "/projects");
  await shot(page, "projects");
  const search = page.locator('input[type="search"], input[placeholder*="ค้น"], input').first();
  if (await search.count()) {
    await search.fill("สวน");
    await page.waitForTimeout(1200);
    await shot(page, "projects-search");
  }
  await maybeClickFirstProject(page);
  await shot(page, "project-detail");

  await login(page);
  await goto(page, "/projects");
  await shot(page, "admin-projects");
  await goto(page, "/import");
  await shot(page, "admin-import");
  await goto(page, "/admin/audit");
  await shot(page, "admin-audit");
} finally {
  await browser.close();
}
