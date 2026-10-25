// Полутоновый портрет на визитке (components/Badge.astro). Точки берутся из
// того же SVG, что виден сразу (tools/halftone.mjs), и рисуются на canvas:
// под курсором они разбегаются пружинками, а в «линзе» проступает цветное
// фото. Подмена незаметна — точки те же и на тех же местах.
// Управляет визитка (scripts/badge.ts): передаёт положение курсора и зовёт
// tick() в своём кадре, пока что-то движется.

export type Portrait = {
  /** Курсор в координатах портрета, CSS px; null — курсора над ним нет. */
  pointer(x: number, y: number): void;
  leave(): void;
  /** Один кадр. false — все точки дома, можно не звать. */
  tick(): boolean;
  resize(): void;
};

const VIEW_WIDTH = 360;
/** Радиус, в котором точки разбегаются, — в единицах рисунка (≈ px визитки). */
const RADIUS = 70;
const INK = "#111110";

export async function createPortrait(box: HTMLElement): Promise<Portrait | null> {
  const img = box.querySelector<HTMLImageElement>("[data-portrait-dots]");
  const canvas = box.querySelector<HTMLCanvasElement>("[data-portrait-canvas]");
  const context = canvas?.getContext("2d");
  if (!img || !canvas || !context) return null;
  const ctx: CanvasRenderingContext2D = context;

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
  found.forEach((m, i) => {
    hx[i] = Number(m[1]);
    hy[i] = Number(m[2]);
    hr[i] = Number(m[3]);
  });

  let scale = 1;
  let viewHeight = 0;
  let px = 0;
  let py = 0;
  let active = false;
  let lens = 0;
  let moving = true;

  const resize = () => {
    const width = box.clientWidth;
    const height = box.clientHeight;
    // Плотность — как у экрана (до 3x): иначе точки мутнее, чем в SVG,
    // и подмена была бы заметна.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = width / VIEW_WIDTH;
    viewHeight = height / scale;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    draw();
  };

  const draw = () => {
    ctx.clearRect(-RADIUS, -RADIUS, VIEW_WIDTH + RADIUS * 2, viewHeight + RADIUS * 2);
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
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
    resize,
    tick() {
      if (!moving) return false;
      const r2 = RADIUS * RADIUS;
      let energy = 0;
      for (let i = 0; i < n; i++) {
        let fx = -ox[i]! * 0.07;
        let fy = -oy[i]! * 0.07;
        if (active) {
          const dx = hx[i]! + ox[i]! - px;
          const dy = hy[i]! + oy[i]! - py;
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
      // Линза растёт к радиусу чуть меньше круга, из которого ушли точки.
      lens += ((active ? RADIUS * 0.86 : 0) - lens) * 0.18;
      setLens();
      draw();
      moving = active || energy > 0.5 || lens > 0.5;
      if (!moving) {
        ox.fill(0);
        oy.fill(0);
        lens = 0;
        setLens();
        draw();
      }
      return moving;
    },
  };
}
