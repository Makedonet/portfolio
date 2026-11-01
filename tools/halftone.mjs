// Полутоновая «печать» портрета для визитки: точки на повёрнутой на 45°
// сетке, площадь точки — по темноте фото под ней. Сетка сама по себе режет
// край фигуры лесенкой, поэтому точки не заходят за силуэт, а сам он обведён
// цепочкой мелких точек вдоль сглаженной линии. Результат — SVG с кружками:
// им визитка рисуется сразу, а скрипт (scripts/badge.ts) читает из него те же
// точки и разгоняет их курсором.
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
/** Размытие края фото перед обводкой, в пикселях фото: убирает зазубрины выреза. */
const EDGE_BLUR = 2.5;
/** Сглаживание линии контура: столько пикселей фото в каждую сторону. */
const EDGE_SMOOTH = 7;
/** Шаг точек на контуре: на тёмном они сливаются в ровную линию. */
const EDGE_SPACING = 1.7;
/** Размер точки на контуре относительно обычной точки той же темноты. */
const EDGE_SIZE = 0.7;

const { data, info } = await sharp(`${dir}face.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const scale = info.width / WIDTH;
const height = info.height / scale;

// Яркость с «чёткостью»: к ней прибавляется её отличие от сильно размытой копии.
const raw = { raw: { width: info.width, height: info.height, channels: /** @type {1} */ (1) } };
const flat = await sharp(`${dir}face.png`).removeAlpha().greyscale().raw().toBuffer();
const blurred = await sharp(flat, raw).blur(12).extractChannel(0).raw().toBuffer();
const gray = flat.map((g, i) => Math.max(0, Math.min(255, g + CLARITY * (g - blurred[i]))));

// Силуэт: что внутри, насколько далеко от края (в пикселях фото). Край кадра
// контуром не считается: снизу фигура просто обрезана.
const { width: w, height: h } = info;
const alpha = Buffer.alloc(w * h);
for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
const soft = await sharp(alpha, raw).blur(EDGE_BLUR).extractChannel(0).raw().toBuffer();
const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && soft[y * w + x] >= 128;
const depth = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) depth[i] = soft[i] >= 128 ? 1e6 : 0;
const relax = (x, y, dx, dy, cost) => {
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
  depth[y * w + x] = Math.min(depth[y * w + x], depth[ny * w + nx] + cost);
};
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    relax(x, y, -1, 0, 1);
    relax(x, y, 0, -1, 1);
    relax(x, y, -1, -1, Math.SQRT2);
    relax(x, y, 1, -1, Math.SQRT2);
  }
}
for (let y = h - 1; y >= 0; y--) {
  for (let x = w - 1; x >= 0; x--) {
    relax(x, y, 1, 0, 1);
    relax(x, y, 0, 1, 1);
    relax(x, y, 1, 1, Math.SQRT2);
    relax(x, y, -1, 1, Math.SQRT2);
  }
}

// Линии контура: граничные пиксели силуэта, сцепленные с соседними.
const edge = new Uint8Array(w * h);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !inside(nx, ny);
    });
    if (open) edge[y * w + x] = 1;
  }
}
const NEAR = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const walk = (x, y, line) => {
  for (;;) {
    edge[y * w + x] = 0;
    line.push([x, y]);
    const next = NEAR.find(([dx, dy]) => edge[(y + dy) * w + x + dx] && x + dx >= 0 && x + dx < w);
    if (!next) return line;
    x += next[0];
    y += next[1];
  }
};
const lines = [];
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (!edge[y * w + x]) continue;
    // Цепочка идёт от начальной точки в обе стороны.
    const ahead = walk(x, y, []);
    const [first] = NEAR.filter(([dx, dy]) => edge[(y + dy) * w + x + dx]);
    const behind = first ? walk(x + first[0], y + first[1], []) : [];
    const line = [...behind.reverse(), ...ahead];
    if (line.length > EDGE_SMOOTH * 4) lines.push(line);
  }
}

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

/** Сколько точка этой темноты занимает: площадь точки — по темноте. */
const darknessAt = (x, y) => {
  const { lum } = sample(x * scale, y * scale, (STEP / 2) * scale);
  const level = Math.min(1, Math.max(0, (lum - lo) / (hi - lo)));
  return FLOOR + (1 - FLOOR) * (1 - level) ** GAMMA;
};
const circle = (x, y, r) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`;

const dots = [];
const diag = Math.SQRT1_2 * STEP;
const span = Math.ceil((WIDTH + height) / STEP);
for (let i = -span; i <= span; i++) {
  for (let j = -span; j <= span; j++) {
    // Сетка под 45°: соседи по диагонали.
    const x = (i - j) * diag + WIDTH / 2;
    const y = (i + j) * diag + height / 2;
    if (x < 0 || y < 0 || x > WIDTH || y > height) continue;
    // Точка касается края, но за него не заходит.
    const room = depth[Math.min(h - 1, Math.round(y * scale)) * w + Math.min(w - 1, Math.round(x * scale))] / scale;
    const r = Math.min(STEP * 0.6 * Math.sqrt(darknessAt(x, y)), room);
    if (r < 0.4) continue;
    dots.push(circle(x, y, r));
  }
}

// Обводка: сглаженная линия, по ней — точки с равным шагом. Точка стоит внутри
// силуэта и внешним краем лежит на линии, размер — по темноте фото рядом.
for (const line of lines) {
  const smooth = line.map((_, i) => {
    const from = Math.max(0, i - EDGE_SMOOTH);
    const to = Math.min(line.length - 1, i + EDGE_SMOOTH);
    let sx = 0;
    let sy = 0;
    for (let k = from; k <= to; k++) {
      sx += line[k][0];
      sy += line[k][1];
    }
    return [sx / (to - from + 1) / scale, sy / (to - from + 1) / scale];
  });
  let walked = EDGE_SPACING;
  for (let i = 1; i < smooth.length; i++) {
    const [ax, ay] = smooth[i - 1];
    const [bx, by] = smooth[i];
    const length = Math.hypot(bx - ax, by - ay);
    walked += length;
    if (walked < EDGE_SPACING || !length) continue;
    walked = 0;
    // Нормаль внутрь силуэта: проверяем, с какой стороны линии фигура.
    let nx = -(by - ay) / length;
    let ny = (bx - ax) / length;
    if (!inside(Math.round((bx + nx * 2) * scale), Math.round((by + ny * 2) * scale))) {
      nx = -nx;
      ny = -ny;
    }
    const probeX = bx + nx * STEP * 0.6;
    const probeY = by + ny * STEP * 0.6;
    const r = Math.max(0.4, STEP * 0.6 * Math.sqrt(darknessAt(probeX, probeY)) * EDGE_SIZE);
    const x = bx + nx * r;
    const y = by + ny * r;
    if (x < 0 || y < 0 || x > WIDTH || y > height) continue;
    dots.push(circle(x, y, r));
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height.toFixed(1)}"><g fill="#111110">${dots.join("")}</g></svg>\n`;
await writeFile(`${dir}halftone.svg`, svg);
console.log(`halftone.svg: ${dots.length} точек, ${(svg.length / 1024).toFixed(1)} КБ`);
