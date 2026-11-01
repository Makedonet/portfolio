// Полутоновый портрет на визитке (components/Badge.astro). Точки берутся из
// того же SVG, что виден сразу (tools/halftone.mjs), и рисуются на canvas.
// Подмена незаметна — точки те же и на тех же местах.
// - Под курсором точки разбегаются пружинками, а в «линзе» проступает цветное
//   фото. Курсор ушёл — всё возвращается.
// - Палец стирает точки насовсем, как защитный слой лотерейного билета: они
//   осыпаются пылью (scripts/dust.ts), на их месте остаётся цветное фото.
// Управляет визитка (scripts/badge.ts): передаёт положение курсора или пальца
// и зовёт tick() в своём кадре, пока что-то движется.
import { createDust } from "./dust";

export type Portrait = {
  /** Курсор в координатах портрета, CSS px; null — курсора над ним нет. */
  pointer(x: number, y: number): void;
  leave(): void;
  /** Палец начал стирать, ведёт и отпустил. */
  scratchStart(x: number, y: number): void;
  scratch(x: number, y: number): void;
  scratchEnd(): void;
  /** Касание: точки вздрагивают волной, фото мелькает под пальцем. */
  poke(x: number, y: number): void;
  /** Доля стёртых точек, от 0 до 1. */
  erased(): number;
  /** Стереть всё, что осталось: волна расходится от этой точки. */
  blast(x: number, y: number): void;
  /** Точки слетаются обратно, портрет снова целый. */
  restore(): void;
  /** Убрать пыль с экрана: визитка ушла из виду, кадров больше не будет. */
  clearDust(): void;
  /** Один кадр. false — все точки дома, можно не звать. */
  tick(dt: number): boolean;
  resize(): void;
};

const VIEW_WIDTH = 360;
/** Радиус, в котором точки разбегаются, — в единицах рисунка (≈ px визитки). */
const RADIUS = 70;
/** Половина ширины полосы, которую стирает палец. */
const ERASE = 40;
/** Скорость волны, которая стирает остаток, — единиц рисунка в секунду. */
const BLAST_SPEED = 760;
/** Как далеко разлетаются точки перед тем, как собраться снова. */
const SCATTER = 150;
const INK = "#111110";

export async function createPortrait(box: HTMLElement): Promise<Portrait | null> {
  const img = box.querySelector<HTMLImageElement>("[data-portrait-dots]");
  const canvas = box.querySelector<HTMLCanvasElement>("[data-portrait-canvas]");
  const revealCanvas = box.querySelector<HTMLCanvasElement>("[data-portrait-reveal]");
  const color = box.querySelector<HTMLImageElement>("[data-portrait-color]");
  const context = canvas?.getContext("2d");
  const revealContext = revealCanvas?.getContext("2d");
  if (!img || !canvas || !context || !revealCanvas || !revealContext || !color) return null;
  const ctx: CanvasRenderingContext2D = context;
  const reveal: CanvasRenderingContext2D = revealContext;

  // SVG уже в кэше браузера: это тот же файл, что в <img>.
  const text = await fetch(img.currentSrc || img.src).then((r) => (r.ok ? r.text() : ""), () => "");
  const found = [...text.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)];
  if (!found.length) return null;

  const n = found.length;
  const hx = new Float32Array(n);
  const hy = new Float32Array(n);
  const hr = new Float32Array(n);
  const ox = new Float32Array(n);
  const oy = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const alive = new Uint8Array(n).fill(1);
  found.forEach((m, i) => {
    hx[i] = Number(m[1]);
    hy[i] = Number(m[2]);
    hr[i] = Number(m[3]);
  });

  const dust = createDust();
  // Где стёрто — белым по прозрачному, в половину разрешения рисунка: края
  // при растяжении смягчаются сами. Фото на проявляющем холсте вырезается по ней.
  const mask = document.createElement("canvas");
  const maskCtx = mask.getContext("2d");

  let scale = 1;
  let viewHeight = 0;
  let px = 0;
  let py = 0;
  let active = false;
  let lens = 0;
  let moving = true;
  // Отрезок, который палец прошёл с прошлого кадра.
  let scratching = false;
  let sx = 0;
  let sy = 0;
  let left = n;
  let peek = 0;
  // Волна: центр и пройденный радиус; отрицательный — волны нет.
  let blastX = 0;
  let blastY = 0;
  let blastR = -1;
  // Цветной слой гаснет, пока точки собираются обратно.
  let fade = 0;
  let marked = false;

  const paintReveal = () => {
    const { width, height } = revealCanvas;
    reveal.globalCompositeOperation = "source-over";
    reveal.clearRect(0, 0, width, height);
    if (!marked || !color.complete || !color.naturalWidth) return;
    reveal.drawImage(mask, 0, 0, width, height);
    reveal.globalCompositeOperation = "source-in";
    reveal.drawImage(color, 0, 0, width, height);
  };

  const resize = () => {
    // Точные размеры, а не округлённые clientWidth: иначе холст слегка растянут
    // и при подмене сдвигается относительно SVG.
    const style = getComputedStyle(box);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    // Плотность — как у экрана (до 3x): иначе точки мутнее, чем в SVG,
    // и подмена была бы заметна.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = width / VIEW_WIDTH;
    viewHeight = height / scale;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    // Фото под точками не такое мелкое: ему хватает 2x.
    const photoDpr = Math.min(dpr, 2);
    revealCanvas.width = Math.round(width * photoDpr);
    revealCanvas.height = Math.round(height * photoDpr);
    if (!marked) {
      mask.width = VIEW_WIDTH / 2;
      mask.height = Math.ceil(viewHeight / 2);
      maskCtx?.setTransform(0.5, 0, 0, 0.5, 0, 0);
    }
    paintReveal();
    draw();
  };

  const draw = () => {
    ctx.clearRect(-SCATTER, -SCATTER, VIEW_WIDTH + SCATTER * 2, viewHeight + SCATTER * 2);
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      const x = hx[i]! + ox[i]!;
      const y = hy[i]! + oy[i]!;
      const r = hr[i]!;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  };

  const setLens = () => {
    box.style.setProperty("--lx", `${(px * scale).toFixed(1)}px`);
    box.style.setProperty("--ly", `${(py * scale).toFixed(1)}px`);
    box.style.setProperty("--lr", `${(lens * scale).toFixed(1)}px`);
  };

  /** Точка стёрта: на холсте её больше нет, с этого кадра она — пылинка. */
  const shed = (i: number, x: number, y: number, rect: DOMRect, dirX: number, dirY: number, force: number) => {
    alive[i] = 0;
    left--;
    const unitX = rect.width / VIEW_WIDTH;
    const unitY = rect.height / viewHeight;
    const speed = force * (0.35 + Math.random() * 0.65);
    const spread = (Math.random() - 0.5) * force * 0.5;
    dust.add(
      rect.left + x * unitX,
      rect.top + y * unitY,
      dirX * speed + spread,
      dirY * speed - 60 - Math.random() * 180,
      Math.max(hr[i]! * unitX, 0.6),
      0.45 + Math.random() * 0.55,
    );
  };

  resize();
  box.classList.add("portrait-live");

  return {
    pointer(x, y) {
      px = x / scale;
      py = y / scale;
      active = true;
      moving = true;
    },
    leave() {
      active = false;
      moving = true;
    },
    scratchStart(x, y) {
      px = sx = x / scale;
      py = sy = y / scale;
      active = true;
      scratching = true;
      moving = true;
    },
    scratch(x, y) {
      px = x / scale;
      py = y / scale;
      moving = true;
    },
    scratchEnd() {
      scratching = false;
      active = false;
      moving = true;
    },
    poke(x, y) {
      px = x / scale;
      py = y / scale;
      peek = 0.18;
      moving = true;
      const reach = 130;
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const dx = hx[i]! + ox[i]! - px;
        const dy = hy[i]! + oy[i]! - py;
        const d = Math.hypot(dx, dy);
        if (d >= reach || d < 0.01) continue;
        const push = (1 - d / reach) ** 2 * 24;
        vx[i] = vx[i]! + (dx / d) * push;
        vy[i] = vy[i]! + (dy / d) * push;
      }
    },
    erased: () => 1 - left / n,
    blast(x, y) {
      blastX = x / scale;
      blastY = y / scale;
      blastR = 0;
      scratching = false;
      active = false;
      moving = true;
    },
    restore() {
      alive.fill(1);
      left = n;
      blastR = -1;
      peek = 0;
      fade = 1;
      moving = true;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = SCATTER * (0.3 + Math.random() * 0.7);
        ox[i] = Math.cos(a) * d;
        oy[i] = Math.sin(a) * d;
        vx[i] = 0;
        vy[i] = 0;
      }
    },
    clearDust: dust.clear,
    resize,
    tick(dt) {
      if (!moving) return false;
      const r2 = RADIUS * RADIUS;
      const erase2 = ERASE * ERASE;
      const segX = px - sx;
      const segY = py - sy;
      const segLength2 = segX * segX + segY * segY;
      const segLength = Math.sqrt(segLength2);
      if (blastR >= 0) blastR += BLAST_SPEED * dt;
      // Положение на экране нужно, только если сейчас что-то стирается.
      const rect = scratching || blastR >= 0 ? box.getBoundingClientRect() : null;
      let energy = 0;
      for (let i = 0; i < n; i++) {
        if (!alive[i]) continue;
        const x = hx[i]! + ox[i]!;
        const y = hy[i]! + oy[i]!;
        if (scratching && rect) {
          // Расстояние до отрезка, а не до пальца: быстрый взмах за кадр
          // проходит больше ширины полосы, и точки не должны проскакивать.
          const t = segLength2 > 0 ? Math.min(1, Math.max(0, ((x - sx) * segX + (y - sy) * segY) / segLength2)) : 0;
          const ex = x - (sx + segX * t);
          const ey = y - (sy + segY * t);
          const e2 = ex * ex + ey * ey;
          if (e2 < erase2) {
            const e = Math.sqrt(e2) || 1;
            // Пыль летит в сторону взмаха и немного от пальца.
            const dirX = segLength ? (segX / segLength) * 0.7 + (ex / e) * 0.3 : ex / e;
            const dirY = segLength ? (segY / segLength) * 0.7 + (ey / e) * 0.3 : ey / e;
            shed(i, x, y, rect, dirX, dirY, 140 + segLength * 9);
            continue;
          }
        }
        if (blastR >= 0 && rect) {
          const bx = x - blastX;
          const by = y - blastY;
          const b = Math.hypot(bx, by);
          if (b < blastR) {
            shed(i, x, y, rect, bx / (b || 1), by / (b || 1), 620);
            continue;
          }
        }
        let fx = -ox[i]! * 0.07;
        let fy = -oy[i]! * 0.07;
        if (active) {
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (1 - d / RADIUS) ** 2 * 3.4;
            fx += (dx / d) * push;
            fy += (dy / d) * push;
          }
        }
        const nvx = (vx[i]! + fx) * 0.8;
        const nvy = (vy[i]! + fy) * 0.8;
        vx[i] = nvx;
        vy[i] = nvy;
        ox[i] = ox[i]! + nvx;
        oy[i] = oy[i]! + nvy;
        energy += Math.abs(nvx) + Math.abs(nvy) + Math.abs(ox[i]!) + Math.abs(oy[i]!);
      }

      // Стёртое — на маску, и по ней заново вырезается фото.
      let repaint = false;
      if (maskCtx && scratching) {
        maskCtx.strokeStyle = "#fff";
        maskCtx.lineCap = "round";
        maskCtx.lineWidth = ERASE * 2;
        maskCtx.beginPath();
        maskCtx.moveTo(sx, sy);
        // Отрезок нулевой длины с круглыми концами браузеры могут не нарисовать.
        maskCtx.lineTo(px + 0.01, py);
        maskCtx.stroke();
        marked = true;
        repaint = true;
      }
      if (maskCtx && blastR >= 0) {
        maskCtx.fillStyle = "#fff";
        maskCtx.beginPath();
        maskCtx.arc(blastX, blastY, blastR, 0, Math.PI * 2);
        maskCtx.fill();
        marked = true;
        repaint = true;
        // Волна дошла до дальнего угла — стирать больше нечего.
        if (blastR > Math.hypot(VIEW_WIDTH, viewHeight)) blastR = -1;
      }
      if (fade > 0) {
        fade = Math.max(0, fade - dt / 0.45);
        revealCanvas.style.opacity = fade.toFixed(3);
        if (fade === 0) {
          maskCtx?.clearRect(0, 0, VIEW_WIDTH, viewHeight);
          marked = false;
          repaint = true;
          revealCanvas.style.opacity = "";
        }
      }
      if (repaint) paintReveal();
      sx = px;
      sy = py;

      peek = Math.max(0, peek - dt);
      // Линза растёт к радиусу чуть меньше круга, из которого ушли точки.
      lens += ((active ? RADIUS * 0.86 : peek > 0 ? RADIUS * 0.7 : 0) - lens) * 0.18;
      setLens();
      draw();
      const dusty = dust.tick(dt);
      moving = active || energy > 0.5 || lens > 0.5 || peek > 0 || blastR >= 0 || fade > 0 || dusty;
      if (!moving) {
        for (let i = 0; i < n; i++) {
          if (alive[i]) {
            ox[i] = 0;
            oy[i] = 0;
          }
        }
        lens = 0;
        setLens();
        draw();
      }
      return moving;
    },
  };
}
