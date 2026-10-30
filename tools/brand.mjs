// Фавиконки и картинка для соцсетей — из знака (public/favicon.svg) и
// полутонового портрета визитки. Запускать после смены знака или портрета:
//   npm i --no-save playwright && npx playwright install chromium   # один раз
//   node tools/brand.mjs
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const svg = await readFile(`${root}public/favicon.svg`, "utf8");

// apple-touch-icon: iOS скругляет углы сам — плашка без скругления.
const touch = svg.replace('<rect width="48" height="48" rx="12"', '<rect width="48" height="48"');
await sharp(Buffer.from(touch), { density: 1200 }).resize(180, 180).png().toFile(`${root}public/apple-touch-icon.png`);

// ICO с PNG 32×32 внутри: так его понимают все браузеры, и файл маленький.
const png = await sharp(Buffer.from(svg), { density: 600 }).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);
entry.writeUInt8(32, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(6 + 16, 12);
await writeFile(`${root}public/favicon.ico`, Buffer.concat([header, entry, png]));

// Картинка для соцсетей 1200×630: слева заголовок, справа визитка на ленте.
const fonts = `${root}src/assets/fonts`;
const file = (path) => `file://${root}${path}`;
const key = (blade) =>
  `<svg viewBox="0 0 41 24"><rect width="24" height="24" rx="7" fill="#ffd43b"/><path d="M6 18V6.5l6 7 6-7V18" fill="none" stroke="#111110" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 9.5h15a1.8 1.8 0 0 1 1.8 1.8v1.4a1.8 1.8 0 0 1-1.8 1.8h-1.3v3.3a1 1 0 0 1-1 1h-1.9a1 1 0 0 1-1-1v-3.3h-1.6v1.9a1 1 0 0 1-1 1h-1.9a1 1 0 0 1-1-1v-1.9H24z" fill="${blade}"/></svg>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
@font-face{font-family:Sofia;src:url(file://${fonts}/sofia-sans.woff2) format("woff2");font-weight:400 800}
@font-face{font-family:SofiaCond;src:url(file://${fonts}/sofia-sans-extra-condensed.woff2) format("woff2");font-weight:300 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#f3f2ec;color:#111110;font-family:Sofia,sans-serif;overflow:hidden;position:relative}
.left{position:absolute;left:72px;top:60px;width:620px}
.brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:600;letter-spacing:-.01em}
.brand svg{height:40px}
h1{margin-top:32px;font-family:SofiaCond,sans-serif;font-size:132px;line-height:.95;font-weight:800}
.mk{background:linear-gradient(#ffd43b,#ffd43b) 0 88%/100% .42em no-repeat;padding:0 .06em;margin-left:-.06em}
p{margin-top:22px;font-size:28px;line-height:1.35;color:#5c5b55;max-width:540px}
.phone{position:absolute;left:72px;bottom:52px;font-family:SofiaCond,sans-serif;font-size:46px;font-weight:700;word-spacing:.14em}
.strap{position:absolute;left:921px;top:-20px;width:26px;height:118px;background:#111110;transform:rotate(5deg);transform-origin:50% 100%}
.card{position:absolute;left:770px;top:96px;width:340px;height:476px;border-radius:22px;overflow:hidden;background:#ffd43b;transform:rotate(5deg);transform-origin:50% -14px;box-shadow:0 30px 60px -24px rgba(17,17,16,.55)}
.card .dots{position:absolute;inset:0;background-image:radial-gradient(rgba(17,17,16,.2) 1.1px,transparent 1.5px);background-size:9px 9px;-webkit-mask-image:linear-gradient(215deg,#000,transparent 42%)}
.card .slot{position:absolute;top:14px;left:50%;width:54px;height:12px;margin-left:-27px;border-radius:12px;background:#f3f2ec;box-shadow:inset 0 2px 4px rgba(17,17,16,.5)}
.card .logo{position:absolute;top:17px;left:19px;height:23px}
.card .logo svg{height:100%}
.card .portrait{position:absolute;left:0;right:0;bottom:83px;aspect-ratio:360/371}
.card .portrait img{width:100%;height:100%;display:block}
.card .band{position:absolute;left:0;right:0;bottom:0;height:96px;background:#111110;color:#f3f2ec;padding:17px 20px 0}
.card .name{font-family:SofiaCond,sans-serif;font-size:48px;font-weight:800;line-height:.9}
.card .role{margin-top:10px;font-size:13px;color:#a3a29b}
.clip{position:absolute;left:921px;top:70px;width:44px;height:52px;border-radius:9px;background:linear-gradient(90deg,#8d8c86,#f4f3ee 45%,#c9c8c1 60%,#7c7b75);transform:rotate(5deg) translateX(-9px);box-shadow:0 2px 3px rgba(17,17,16,.35)}
</style></head><body>
<div class="left">
  <div class="brand">${key("#111110")} Максим</div>
  <h1>Сайты<br><span class="mk">под&nbsp;ключ</span></h1>
  <p>Дизайн, разработка, заявки, аналитика, хостинг и&nbsp;поддержка</p>
</div>
<div class="phone">+7 981 105-25-33</div>
<div class="strap"></div>
<div class="card">
  <div class="dots"></div><div class="slot"></div>
  <div class="logo">${key("#111110").replace('fill="#ffd43b"', 'fill="#111110"').replace('stroke="#111110"', 'stroke="#ffd43b"')}</div>
  <div class="portrait"><img src="${file("src/assets/avatar/halftone.svg")}"></div>
  <div class="band"><div class="name">Максим</div><div class="role">разработка сайтов под ключ</div></div>
</div>
<div class="clip"></div>
</body></html>`;

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
// Через файл, а не setContent: со страницы about:blank Chromium не отдаёт file://.
const htmlPath = `${root}og.tmp.html`;
await writeFile(htmlPath, html);
await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}public/og.jpg`, type: "jpeg", quality: 88 });
await browser.close();
await rm(htmlPath);
console.log("favicon.ico, apple-touch-icon.png, og.jpg — готово");
