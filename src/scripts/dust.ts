// Пыль от стирания портрета (scripts/portrait.ts): стёртые точки слетают с
// визитки и осыпаются по экрану, как крошка с лотерейного билета. Холст поверх
// страницы создаётся с первой пылинкой и убирается с последней, нажатий не
// перехватывает. Кадры считает визитка, пока что-то движется.

/** Больше за раз не нужно: глаз не различит, а телефону тяжелее. */
const CAP = 1400;
const GRAVITY = 1500; // px/с²
const AIR = 0.25; // доля скорости, что остаётся за секунду
const INK = "#111110";

export type Dust = {
  /** Пылинка в координатах экрана. fall — от 0 до 1: как быстро она падает. */
  add(x: number, y: number, vx: number, vy: number, r: number, fall: number): void;
  /** Один кадр. false — пыли больше нет. */
  tick(dt: number): boolean;
  clear(): void;
};

export function createDust(): Dust {
  const x = new Float32Array(CAP);
  const y = new Float32Array(CAP);
  const vx = new Float32Array(CAP);
  const vy = new Float32Array(CAP);
  const radius = new Float32Array(CAP);
  const fall = new Float32Array(CAP);
  let count = 0;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let height = 0;

  const mount = () => {
    const width = window.innerWidth;
    height = window.innerHeight;
    // Точки мелкие и в движении: больше 2x здесь незаметно, а холст на весь экран.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas = document.createElement("canvas");
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:${height}px;z-index:20;pointer-events:none`;
    ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    document.body.append(canvas);
  };

  const clear = () => {
    count = 0;
    canvas?.remove();
    canvas = null;
    ctx = null;
  };

  return {
    add(px, py, pvx, pvy, r, f) {
      if (count >= CAP) return;
      if (!canvas) mount();
      x[count] = px;
      y[count] = py;
      vx[count] = pvx;
      vy[count] = pvy;
      radius[count] = r;
      fall[count] = f;
      count++;
    },
    tick(dt) {
      if (!count || !ctx || !canvas) return false;
      const air = Math.pow(AIR, dt);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = INK;
      ctx.beginPath();
      for (let i = count - 1; i >= 0; i--) {
        const nvx = vx[i]! * air;
        const nvy = vy[i]! * air + GRAVITY * fall[i]! * dt;
        const nx = x[i]! + nvx * dt;
        const ny = y[i]! + nvy * dt;
        if (ny > height + 8) {
          // Упавшую — на место последней: порядок пылинок неважен.
          count--;
          x[i] = x[count]!;
          y[i] = y[count]!;
          vx[i] = vx[count]!;
          vy[i] = vy[count]!;
          radius[i] = radius[count]!;
          fall[i] = fall[count]!;
          continue;
        }
        vx[i] = nvx;
        vy[i] = nvy;
        x[i] = nx;
        y[i] = ny;
        const r = radius[i]!;
        ctx.moveTo(nx + r, ny);
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
      }
      ctx.fill();
      if (!count) clear();
      return count > 0;
    },
    clear,
  };
}
