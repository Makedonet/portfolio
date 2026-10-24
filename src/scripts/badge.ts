// Визитка на ленте (components/Badge.astro). Лента — цепочка точек,
// визитка — жёсткий отрезок от крепления до нижнего края; всё считается
// интегрированием Верле с ограничениями длины, как верёвки в играх.
// - Мышью визитку можно схватить и бросить; бросок вбок её раскручивает,
//   и после оборотов она встаёт той стороной, к которой ближе.
// - Клик или кнопка — перевернуть. Касание на телефоне — тоже; свайп вбок
//   крутит визитку, вертикальный — как обычно листает страницу.
// - Прокрутка страницы раскачивает визитку по инерции.
// - Под курсором визитка наклоняется, по ней бежит блик, на портрете
//   разбегаются точки (scripts/portrait.ts).
// Когда всё замерло или визитка ушла с экрана, расчёт останавливается.
// При «уменьшить движение» физики нет: кнопка переворачивает мгновенно.
import { gsap } from "gsap";
import { load } from "./deferred";
import { createPortrait, type Portrait } from "./portrait";
import { play } from "./sound";

type Point = { x: number; y: number; px: number; py: number; w: number };
type Sample = { x: number; y: number; t: number };

const LINKS = 9;
const GRAVITY = 2400; // px/с²
const AIR = 0.994; // доля скорости, что остаётся за подшаг
const SUBSTEPS = 3;
const ITERATIONS = 8;
// Пружина поворота вокруг вертикальной оси: жёсткость и затухание.
const SPIN_K = 95;
const SPIN_C = 11;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function initBadge(root: HTMLElement, motion: boolean): () => void {
  const card = root.querySelector<HTMLElement>("[data-badge-card]")!;
  const swing = root.querySelector<HTMLElement>("[data-badge-swing]")!;
  const spinEl = root.querySelector<HTMLElement>("[data-badge-spin]")!;
  const button = root.querySelector<HTMLButtonElement>("[data-badge-flip]")!;
  const front = root.querySelector<HTMLElement>('[data-badge-face="front"]')!;
  const back = root.querySelector<HTMLElement>('[data-badge-face="back"]')!;
  const portraitBox = root.querySelector<HTMLElement>("[data-portrait]")!;
  const cleanups: Array<() => void> = [];
  const listen = (target: EventTarget, type: string, fn: (event: never) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  // Цветной портрет и фото с оборота — после загрузки страницы, заранее:
  // к первому наведению или перевороту они уже будут готовы.
  root.querySelectorAll<HTMLImageElement>("[data-badge-deferred]").forEach((img) => void load(img));

  /** Видимая сторона: другая выключена из фокуса и для скринридера. */
  let face = 0;
  const showFace = (next: number) => {
    if (next === face) return;
    face = next;
    front.inert = face === 1;
    back.inert = face === 0;
    button.setAttribute("aria-pressed", String(face === 1));
  };

  if (!motion) {
    listen(button, "click", () => {
      showFace(1 - face);
      spinEl.style.transform = face ? "rotateY(180deg)" : "";
    });
    return () => {
      cleanups.forEach((fn) => fn());
      spinEl.style.transform = "";
      showFace(0);
    };
  }

  // Геометрия: размеры визитки, крепление над её верхним краем (0.9em) и
  // начало ленты — из прямой ленты в разметке ("M0 <начало>V<крепление>").
  let W = 0;
  let H = 0;
  let A = 0;
  let stageW = 0;
  let left0 = 0;
  let top0 = 0;
  let strap: SVGPathElement | null = null;
  let linkLength = 0;
  let cardLength = 0;
  let reach = 0;
  let anchor: Point = { x: 0, y: 0, px: 0, py: 0, w: 0 };
  let pts: Point[] = [];
  let bottom: Point = { x: 0, y: 0, px: 0, py: 0, w: 0 };
  const clip = () => pts[LINKS]!;

  const reset = () => {
    const paths = [...root.querySelectorAll<SVGPathElement>("[data-strap]")];
    paths.forEach((p) => {
      p.dataset.d ??= p.getAttribute("d") ?? "";
      p.setAttribute("d", p.dataset.d);
    });
    strap = paths.find((p) => p.getClientRects().length > 0) ?? null;
    const start = Number(strap?.dataset.d?.match(/^M0 (-?[\d.]+)/)?.[1] ?? 0);
    W = card.offsetWidth;
    H = card.offsetHeight;
    A = parseFloat(getComputedStyle(card).fontSize) * 0.9;
    stageW = root.clientWidth;
    left0 = card.offsetLeft;
    top0 = card.offsetTop;
    const x = left0 + W / 2;
    const attach = top0 - A;
    linkLength = (attach - start) / LINKS;
    cardLength = H + A;
    reach = (attach - start) * 1.45;
    pts = Array.from({ length: LINKS + 1 }, (_, i) => {
      const y = start + linkLength * i;
      return { x, y, px: x, py: y, w: i === 0 ? 0 : i === LINKS ? 0.2 : 1 };
    });
    anchor = pts[0]!;
    bottom = { x, y: attach + cardLength, px: x, py: attach + cardLength, w: 0.2 };
  };

  /** Угол визитки: 0 — висит отвесно, плюс — по часовой. */
  const angle = () => Math.atan2(-(bottom.x - clip().x), bottom.y - clip().y);

  // Схваченная точка — в координатах визитки от крепления; цель — курсор.
  let held: { lx: number; ly: number; tx: number; ty: number } | null = null;
  const holdTo = () => {
    if (!held) return;
    const c = clip();
    const a = angle();
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const dx = held.tx - (c.x + held.lx * cos - held.ly * sin);
    const dy = held.ty - (c.y + held.lx * sin + held.ly * cos);
    c.x += dx;
    c.y += dy;
    bottom.x += dx;
    bottom.y += dy;
  };

  /** Длина звена: лента может провиснуть, но не растянуться; визитка жёсткая. */
  const keep = (a: Point, b: Point, length: number, slack: boolean) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-4;
    if (slack && d <= length) return;
    const w = a.w + b.w;
    if (!w) return;
    const k = (d - length) / d / w;
    a.x += dx * k * a.w;
    a.y += dy * k * a.w;
    b.x -= dx * k * b.w;
    b.y -= dy * k * b.w;
  };

  const step = (dt: number) => {
    const g = GRAVITY * dt * dt;
    for (const p of [...pts, bottom]) {
      if (!p.w) continue;
      const vx = (p.x - p.px) * AIR;
      const vy = (p.y - p.py) * AIR;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + g;
    }
    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 0; i < LINKS; i++) keep(pts[i]!, pts[i + 1]!, linkLength, true);
      keep(clip(), bottom, cardLength, false);
      holdTo();
    }
  };

  // Поворот вокруг вертикальной оси: пружина к target (кратно 180°) или
  // свободное вращение после броска.
  let phi = 0;
  let omega = 0;
  let target = 0;
  let freeSpin = false;
  const spin = (dt: number) => {
    if (freeSpin) {
      omega *= Math.pow(0.3, dt);
      if (Math.abs(omega) < 240) {
        freeSpin = false;
        target = (omega >= 0 ? Math.ceil : Math.floor)(phi / 180) * 180;
        showFace(mod(Math.round(target / 180), 2));
      }
    } else {
      omega += ((target - phi) * SPIN_K - omega * SPIN_C) * dt;
    }
    phi += omega * dt;
  };

  const flip = (direction: number) => {
    freeSpin = false;
    target = Math.round(target / 180) * 180 + 180 * direction;
    showFace(mod(Math.round(target / 180), 2));
    if (face === 1) portrait?.leave();
    wake();
  };

  // Наклон к курсору и блик.
  let hover = false;
  let tiltX = 0;
  let tiltY = 0;
  let goalX = 0;
  let goalY = 0;
  let glareX = 50;
  let glareY = -20;

  const render = () => {
    const c = clip();
    const a = angle();
    card.style.transform = `translate3d(${(c.x - W / 2 - left0).toFixed(2)}px, ${(c.y + A - top0).toFixed(2)}px, 0) rotate(${a.toFixed(4)}rad)`;
    spinEl.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${(phi + tiltY).toFixed(2)}deg)`;
    card.style.setProperty("--gx", `${glareX.toFixed(1)}%`);
    card.style.setProperty("--gy", `${glareY.toFixed(1)}%`);
    card.style.setProperty("--sx", `${(140 - glareX * 1.6).toFixed(1)}%`);
    card.style.setProperty("--holo", `${(glareX * 3.6 + phi).toFixed(0)}deg`);
    if (strap) {
      const o = stageW / 2;
      const f = (n: number) => n.toFixed(1);
      let d = `M${f(anchor.x - o)} ${f(anchor.y)}`;
      for (let i = 1; i < LINKS; i++) {
        const p = pts[i]!;
        const q = pts[i + 1]!;
        d += `Q${f(p.x - o)} ${f(p.y)} ${f((p.x + q.x) / 2 - o)} ${f((p.y + q.y) / 2)}`;
      }
      d += `L${f(clip().x - o)} ${f(clip().y)}`;
      strap.setAttribute("d", d);
    }
  };

  // Кадр: физика подшагами, затем отрисовка. Когда всё замерло — сон.
  let portrait: Portrait | null = null;
  let awake = false;
  let visible = false;
  let quiet = 0;
  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 50) / 1000;
    for (let s = 0; s < SUBSTEPS; s++) step(dt / SUBSTEPS);
    spin(dt);
    const ease = 1 - Math.exp(-dt * 9);
    tiltX += (goalX - tiltX) * ease;
    tiltY += (goalY - tiltY) * ease;
    const dots = portrait?.tick() ?? false;
    render();
    let energy = 0;
    for (const p of [...pts, bottom]) energy += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
    const still =
      !held && !press && !hover && !freeSpin && !dots && energy < 0.02 && Math.abs(target - phi) < 0.05 && Math.abs(omega) < 0.05 && Math.abs(tiltX) + Math.abs(tiltY) < 0.02;
    quiet = still ? quiet + 1 : 0;
    if (quiet > 20) sleep();
  };
  const wake = () => {
    quiet = 0;
    if (awake || !visible) return;
    awake = true;
    gsap.ticker.add(tick);
  };
  const sleep = () => {
    awake = false;
    gsap.ticker.remove(tick);
  };

  /** Точка экрана → координаты сцены и визитки (без учёта наклона). */
  const locate = (clientX: number, clientY: number) => {
    const box = root.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    const c = clip();
    const a = angle();
    const rx = x - c.x;
    const ry = y - c.y;
    const lx = rx * Math.cos(a) + ry * Math.sin(a);
    const ly = -rx * Math.sin(a) + ry * Math.cos(a);
    return { x, y, lx, ly, u: (lx + W / 2) / W, v: (ly + A) / H };
  };

  // Нажатие: без сдвига — переворот, со сдвигом — бросок (мышь) или
  // раскрутка (палец, только вбок).
  let press: { id: number; x: number; y: number; moved: boolean; mouse: boolean; phi0: number } | null = null;
  let samples: Sample[] = [];
  const velocity = () => {
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last && last.t - s.t < 90) ?? last;
    if (!last || !first || last.t === first.t) return { x: 0, y: 0 };
    const dt = (last.t - first.t) / 1000;
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
  };

  listen(card, "pointerdown", (event: PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("a, button")) return;
    // Вход ещё качается — отдаём визитку физике.
    swing.getAnimations().forEach((animation) => animation.finish());
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, mouse: event.pointerType === "mouse", phi0: phi };
    samples = [{ x: event.clientX, y: event.clientY, t: event.timeStamp }];
    if (press.mouse) event.preventDefault();
    wake();
  });

  listen(card, "pointermove", (event: PointerEvent) => {
    if (press && event.pointerId === press.id) {
      const dx = event.clientX - press.x;
      if (!press.moved && Math.hypot(dx, event.clientY - press.y) > 6) {
        press.moved = true;
        card.setPointerCapture(event.pointerId);
        if (press.mouse) {
          const at = locate(press.x, press.y);
          held = { lx: at.lx, ly: at.ly, tx: at.x, ty: at.y };
          card.classList.add("is-held");
          hover = false;
          goalX = 0;
          goalY = 0;
          portrait?.leave();
        } else {
          freeSpin = false;
        }
      }
      if (press.moved) {
        samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
        if (samples.length > 12) samples.shift();
        if (held) {
          // Поводок: дальше ленты с запасом не утащить.
          const at = locate(event.clientX, event.clientY);
          const ox = at.x - anchor.x;
          const oy = at.y - anchor.y;
          const d = Math.hypot(ox, oy);
          const limit = reach + Math.hypot(held.lx, held.ly);
          const k = d > limit ? limit / d : 1;
          held.tx = anchor.x + ox * k;
          held.ty = anchor.y + oy * k;
        } else {
          phi = press.phi0 + dx * 0.6;
          target = phi;
          omega = 0;
        }
        wake();
      }
      return;
    }
    if (event.pointerType !== "mouse" || held) return;
    const at = locate(event.clientX, event.clientY);
    hover = true;
    goalY = gsap.utils.clamp(-1, 1, at.u * 2 - 1) * 9;
    goalX = -gsap.utils.clamp(-1, 1, at.v * 2 - 1) * 7;
    glareX = at.u * 100;
    glareY = at.v * 100;
    if (face === 0 && portrait) portrait.pointer(at.lx + W / 2 - portraitBox.offsetLeft, at.ly + A - portraitBox.offsetTop);
    wake();
  });

  const release = (event: PointerEvent, cancelled: boolean) => {
    if (!press || event.pointerId !== press.id) return;
    const { moved, mouse } = press;
    press = null;
    if (!moved) {
      if (!cancelled) {
        const at = locate(event.clientX, event.clientY);
        flip(at.u < 0.5 ? -1 : 1);
        play("flip");
      }
      return;
    }
    const v = velocity();
    if (mouse) {
      held = null;
      card.classList.remove("is-held");
      // Скорость броска — с запасом поменьше: иначе визитка улетает под шапку.
      for (const p of [...pts, bottom]) {
        p.px = p.x - (p.x - p.px) * 0.6;
        p.py = p.y - (p.y - p.py) * 0.6;
      }
      if (Math.abs(v.x) > 400) {
        freeSpin = true;
        omega = gsap.utils.clamp(-1300, 1300, omega + v.x * 0.3);
        play("whoosh");
      }
    } else {
      omega = gsap.utils.clamp(-1800, 1800, v.x * 0.6);
      freeSpin = Math.abs(omega) > 240;
      if (!freeSpin) {
        target = Math.round(phi / 180) * 180;
        showFace(mod(Math.round(target / 180), 2));
      }
    }
    wake();
  };
  listen(card, "pointerup", (event: PointerEvent) => release(event, false));
  listen(card, "pointercancel", (event: PointerEvent) => release(event, true));

  listen(card, "pointerleave", (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || press) return;
    hover = false;
    goalX = 0;
    goalY = 0;
    glareX = 50;
    glareY = -20;
    portrait?.leave();
    wake();
  });

  listen(button, "click", () => flip(1));

  // Прокрутка страницы раскачивает визитку: вниз — вправо, вверх — влево
  // и чуть подбрасывает.
  let lastScroll = scrollY;
  listen(
    window,
    "scroll",
    () => {
      const delta = gsap.utils.clamp(-60, 60, scrollY - lastScroll);
      lastScroll = scrollY;
      if (!visible || held) return;
      bottom.x += delta * 0.045;
      if (delta < 0) for (const p of [...pts, bottom]) if (p.w) p.y += delta * 0.02;
      wake();
    },
    { passive: true },
  );

  const seen = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) wake();
    else sleep();
  });
  seen.observe(root);

  let resizeTimer = 0;
  listen(window, "resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      reset();
      render();
      portrait?.resize();
    }, 150);
  });

  reset();
  render();
  void createPortrait(portraitBox).then((p) => {
    portrait = p;
  });

  return () => {
    cleanups.forEach((fn) => fn());
    seen.disconnect();
    sleep();
    clearTimeout(resizeTimer);
    card.style.transform = "";
    spinEl.style.transform = "";
    root.querySelectorAll<SVGPathElement>("[data-strap]").forEach((p) => p.dataset.d && p.setAttribute("d", p.dataset.d));
    portraitBox.classList.remove("portrait-live");
    showFace(0);
  };
}
