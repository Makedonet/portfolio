// Полутоновая «печать» портрета для визитки: точки на повёрнутой на 45°
// сетке, площадь точки — по темноте фото под ней. Результат — SVG с
// кружками: им визитка рисуется сразу, а скрипт (scripts/badge.ts) читает
// из него те же точки и разгоняет их курсором.
//   node tools/halftone.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("../src/assets/avatar/", import.meta.url));
/** Ширина рисунка в единицах viewBox — примерно в пикселях визитки. */
const WIDTH = 360;
/** Шаг сетки: чем меньше, тем детальнее и тяжелее файл. */
const STEP = 5.2;
/** Самая светлая часть фигуры всё равно в мелкую точку — иначе светлая
 *  кепка растворилась бы в жёлтом фоне визитки. */
const FLOOR = 0.1;
/** Гамма: выше — светлее средние тона, лицо отделяется от бороды и свитера. */
const GAMMA = 2;
/** «Чёткость» — локальный контраст: глаза, нос и край бороды заметнее. */
const CLARITY = 2;

const { data, info } = await sharp(`${dir}face.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const scale = info.width / WIDTH;
const height = info.height / scale;

// Яркость с «чёткостью»: к ней прибавляется её отличие от сильно размытой копии.
const raw = { raw: { width: info.width, height: info.height, channels: /** @type {1} */ (1) } };
const flat = await sharp(`${dir}face.png`).removeAlpha().greyscale().raw().toBuffer();
const blurred = await sharp(flat, raw).blur(12).raw().toBuffer();
const gray = flat.map((g, i) => Math.max(0, Math.min(255, g + CLARITY * (g - blurred[i]))));

/** Средние яркость и непрозрачность в круге радиусом r (в пикселях фото). */
function sample(cx, cy, r) {
  let lum = 0;
  let alpha = 0;
  let n = 0;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(info.height - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(info.width - 1, Math.ceil(cx + r)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const a = data[(y * info.width + x) * 4 + 3] / 255;
      lum += (gray[y * info.width + x] / 255) * a;
      alpha += a;
      n++;
    }
  }
  return n ? { lum: alpha ? lum / alpha : 1, alpha: alpha / n } : { lum: 1, alpha: 0 };
}

// Уровни: растягиваем яркость фигуры на всю шкалу (2-й и 98-й процентили).
const lums = [];
for (let i = 0; i < gray.length; i += 7) {
  if (data[i * 4 + 3] > 200) lums.push(gray[i] / 255);
}
lums.sort((a, b) => a - b);
const lo = lums[Math.floor(lums.length * 0.02)];
const hi = lums[Math.floor(lums.length * 0.98)];

const dots = [];
const diag = Math.SQRT1_2 * STEP;
const span = Math.ceil((WIDTH + height) / STEP);
for (let i = -span; i <= span; i++) {
  for (let j = -span; j <= span; j++) {
    // Сетка под 45°: соседи по диагонали.
    const x = (i - j) * diag + WIDTH / 2;
    const y = (i + j) * diag + height / 2;
    if (x < 0 || y < 0 || x > WIDTH || y > height) continue;
    const { lum, alpha } = sample(x * scale, y * scale, (STEP / 2) * scale);
    if (alpha < 0.05) continue;
    const level = Math.min(1, Math.max(0, (lum - lo) / (hi - lo)));
    const darkness = alpha * (FLOOR + (1 - FLOOR) * (1 - level) ** GAMMA);
    const r = STEP * 0.6 * Math.sqrt(darkness);
    if (r < 0.4) continue;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height.toFixed(1)}"><g fill="#111110">${dots.join("")}</g></svg>\n`;
await writeFile(`${dir}halftone.svg`, svg);
console.log(`halftone.svg: ${dots.length} точек, ${(svg.length / 1024).toFixed(1)} КБ`);
