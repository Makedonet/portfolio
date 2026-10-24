// Съёмка длинных кадров для «живых окон» (components/LiveWindow.astro).
//
//   npm i --no-save playwright && npx playwright install chromium   # один раз
//   node tools/capture-live.mjs                 # все кадры из tools/live-jobs.json
//   node tools/capture-live.mjs shino-home-desktop moyka-mobile    # только эти
//   node tools/live-post.mjs                    # постеры, полосы шапок, остановки
//
// Задание в live-jobs.json: { id, base (https://…) | root (папка со статикой),
// path, device: "desktop" | "mobile", maxHeight, url }. Компьютер снимается на
// 1440×900, телефон — на 390×844 с DPR 2. Для каждого кадра записываются в
// src/data/live.json высота липкой шапки и остановки «видео» — верхние края
// секций за вычетом шапки. Плавающие кнопки и нижние панели прячутся, счётчики
// (Метрика, Callibri) не грузятся: съёмка не должна портить статистику.
import http from "node:http";
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.error("Нужен Playwright: npm i --no-save playwright && npx playwright install chromium");
  process.exit(1);
}
const jobsPath = "tools/live-jobs.json";
const outDir = "src/assets/live";
const manifestPath = "src/data/live.json";
const only = new Set(process.argv.slice(2));
const jobs = JSON.parse(await readFile(jobsPath, "utf8")).filter((job) => !only.size || only.has(job.id));
await mkdir(outDir, { recursive: true });

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json", ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain",
};
const servers = new Map();
async function serve(root) {
  if (servers.has(root)) return servers.get(root);
  const server = http.createServer(async (req, res) => {
    let file = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  servers.set(root, base);
  return base;
}

// Счётчики и трекеры не грузим: снимок не должен портить статистику заказчика.
const BLOCK = /mc\.yandex|metrika|callibri|google-analytics|googletagmanager|top-fwz1\.mail\.ru|vk\.com\/rtrg/i;

const browser = await playwright.chromium.launch();
for (const job of jobs) {
  const base = job.root ? await serve(job.root) : job.base;
  const mobile = job.device === "mobile";
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
    locale: "ru-RU",
  });
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (BLOCK.test(url)) return route.abort();
    if (job.root && !url.startsWith(base)) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  await page.goto(base + job.path, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  // Прокрутка вниз и обратно: догружаются ленивые картинки и блоки.
  await page.evaluate(async (max) => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < Math.min(document.documentElement.scrollHeight, max + innerHeight); y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, job.maxHeight);
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let header = 0;
    const hidden = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
      const isHeader = r.top <= 1 && r.width >= vw * 0.8 && r.height >= 30 && r.height <= 240;
      if (isHeader) {
        header = Math.max(header, Math.round(r.bottom));
      } else if (cs.position === "fixed" && (r.top > innerHeight * 0.45 || r.height > innerHeight * 0.6)) {
        // Плавающие кнопки, нижние панели, баннеры, открывающиеся меню — в
        // кадре им не место. Фиксированное у верха (бургер) остаётся: оно часть шапки.
        el.style.setProperty("visibility", "hidden", "important");
        hidden.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 40));
      }
    }
    const tops = [...document.querySelectorAll("section, footer, main > div, main > article")]
      .map((el) => Math.round(el.getBoundingClientRect().top + scrollY))
      .filter((t) => t > 0);
    return { header, tops, height: document.documentElement.scrollHeight, vh: innerHeight, hidden };
  });

  const height = Math.min(info.height, job.maxHeight);
  const vh = info.vh;
  // Остановки: край секции под шапкой; ближе 0.55 экрана к предыдущей — пропускаем.
  const stops = [];
  for (const t of [...new Set(info.tops)].sort((a, b) => a - b)) {
    const s = t - info.header;
    if (s <= vh * 0.4 || s > height - vh) continue;
    if (stops.length && s - stops[stops.length - 1] < vh * 0.55) continue;
    stops.push(s);
  }

  const file = join(outDir, `${job.id}.jpg`);
  await page.screenshot({
    path: file,
    type: "jpeg",
    quality: 88,
    fullPage: true,
    clip: { x: 0, y: 0, width: mobile ? 390 : 1440, height },
  });
  // Шапка в прокрученном состоянии: на многих сайтах она при прокрутке меняет
  // фон или ужимается. Её полоса лежит поверх листающегося кадра в окне.
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(vh * 1.5));
  await page.waitForTimeout(700);
  const strip = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let bottom = 0;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      const r = el.getBoundingClientRect();
      if (cs.visibility === "hidden" || cs.display === "none" || r.height === 0) continue;
      if (r.top <= 1 && r.bottom > 0 && r.width >= vw * 0.8 && r.height >= 30 && r.height <= 240) bottom = Math.max(bottom, Math.round(r.bottom));
    }
    return bottom;
  });
  if (strip > 0) {
    await mkdir(join(outDir, "headers"), { recursive: true });
    await page.screenshot({
      path: join(outDir, "headers", `${job.id}.jpg`),
      type: "jpeg",
      quality: 90,
      clip: { x: 0, y: 0, width: mobile ? 390 : 1440, height: strip },
    });
  }

  // rawStops — исходные края секций; live-post.mjs пересчитывает из них stops.
  manifest[job.id] = { url: job.url, device: job.device, width: mobile ? 390 : 1440, height, header: info.header, strip, stops, rawStops: stops };
  console.log(`${job.id}: ${height}px, header ${info.header}, strip ${strip}, stops ${stops.join(",")}${info.hidden.length ? `, скрыто: ${info.hidden.join(" | ")}` : ""}`);
  await ctx.close();
}
await browser.close();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
process.exit(0);
