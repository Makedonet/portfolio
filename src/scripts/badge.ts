// Визитка на ленте (components/Badge.astro). Лента — цепочка точек,
// визитка — жёсткий отрезок от крепления до нижнего края; всё считается
// интегрированием Верле с ограничениями длины, как верёвки в играх.
// - Мышью визитку можно схватить и бросить; бросок вбок её раскручивает,
//   и после оборотов она встаёт той стороной, к которой ближе.
// - Клик или кнопка — перевернуть.
// - На телефоне правило одно: вертикальный свайп всегда листает страницу,
//   горизонтальный — играет с визиткой, а дальше палец волен идти куда угодно.
//   По портрету такой свайп стирает точки, как защитный слой лотерейного
//   билета (scripts/portrait.ts); стёрто больше половины — остаток сносит
//   волной, а визитка подсказывает, что контакты на обороте. Касание портрета
//   пускает по точкам волну, касание стёртого — собирает точки обратно.
//   По остальной визитке свайп хватает и бросает её, как мышь; касание —
//   переворачивает. Сама по себе визитка на телефоне не двигается: всё только
//   от пальца, что делать — подсказывает надпись на ней.
// - Прокрутка страницы на компьютере слегка относит визитку в сторону, как
//   ветер; на сенсорных экранах прокрутка её не трогает.
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
const AIR = 0.9955; // доля скорости, что остаётся за шаг
/** Шаг расчёта постоянный, не зависит от кадров: иначе равновесие ленты
 *  плавает вместе с длиной кадра, и визитка мелко дрожит. 60 и 120 Гц — ровно
 *  4 и 2 шага на кадр. */
const STEP = 1 / 240;
/** Сколько шагов лента успокаивается перед показом. */
const SETTLE = 1200;
const ITERATIONS = 8;
// Пружина поворота вокруг вертикальной оси: жёсткость и затухание.
const SPIN_K = 95;
const SPIN_C = 11;
/** Сила «ветра» от прокрутки на полной скорости, px/с². */
const WIND = 280;
/** Какую долю точек стереть пальцем, чтобы остальное снесло само. */
const ERASE_GOAL = 0.5;
/** Подсказки на визитке: сначала что делать, затем как идут дела и что дальше. */
const TIP_START = "Сотрите точки пальцем";
const TIP_MIDDLE = "Ещё немного";
const TIP_DONE = "Контакты на обороте";

/** Звук и вибрация до первого касания браузером запрещены и шумят в консоли. */
const activated = () => navigator.userActivation?.hasBeenActive ?? false;
const buzz = (pattern: number | number[]) => {
  if (activated()) navigator.vibrate?.(pattern);
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function initBadge(root: HTMLElement, motion: boolean, fine: boolean): () => void {
  const card = root.querySelector<HTMLElement>("[data-badge-card]")!;
  const swing = root.querySelector<HTMLElement>("[data-badge-swing]")!;
  const button = root.querySelector<HTMLButtonElement>("[data-badge-flip]")!;
  const front = root.querySelector<HTMLElement>('[data-badge-face="front"]')!;
  const back = root.querySelector<HTMLElement>('[data-badge-face="back"]')!;
  const portraitBox = root.querySelector<HTMLElement>("[data-portrait]")!;
  const band = root.querySelector<HTMLElement>("[data-badge-band]")!;
  const tip = root.querySelector<HTMLElement>("[data-badge-tip]")!;
  const colorImage = root.querySelector<HTMLImageElement>("[data-portrait-color]")!;
  const cleanups: Array<() => void> = [];
  const listen = (target: EventTarget, type: string, fn: (event: never) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  // Фото с оборота и цветной портрет — после загрузки страницы, заранее:
  // к перевороту или первому наведению они уже будут готовы. Без мыши цветной
  // портрет нужен, только когда визитка показалась на экране (startTouch ниже).
  root.querySelectorAll<HTMLImageElement>("[data-badge-deferred]").forEach((img) => {
    if (fine || img.dataset.badgeDeferred !== "hover") void load(img);
  });

  /** Видимая сторона: другая выключена из фокуса и для скринридера. */
  let face = 0;
  const showFace = (next: number) => {
    if (next === face) return;
    face = next;
    front.inert = face === 1;
    back.inert = face === 0;
    button.setAttribute("aria-pressed", String(face === 1));
  };

  /** Сторона к зрителю — по углу поворота; другая прячется, пока визитка стоит
   *  ребром. Поворот получает сама видимая сторона, а не их общий родитель:
   *  preserve-3d с backface-visibility браузеры рисуют по-разному, и в WebKit и
   *  Firefox оборот бывал виден зеркально, поверх лицевой стороны или со сдвигом. */
  let turned = false;
  const showSide = (degrees: number) => {
    const next = Math.cos((degrees * Math.PI) / 180) < 0;
    if (next === turned) return;
    turned = next;
    front.style.visibility = turned ? "hidden" : "";
    back.style.visibility = turned ? "visible" : "";
  };

  if (!motion) {
    listen(button, "click", () => {
      showFace(1 - face);
      back.style.transform = face ? "none" : "";
      showSide(face ? 180 : 0);
    });
    return () => {
      cleanups.forEach((fn) => fn());
      back.style.transform = "";
      showFace(0);
      showSide(0);
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
    // Прямая лента — ещё не покой: под весом визитки она чуть проседает. Сразу
    // в равновесие, иначе при первом кадре визитка подпрыгнула бы сама.
    wind = 0;
    for (let k = 0; k < SETTLE; k++) step(STEP);
    for (const p of [...pts, bottom]) {
      p.px = p.x;
      p.py = p.y;
    }
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
    const blow = held ? 0 : gsap.utils.clamp(-1, 1, wind / 2500) * WIND * dt * dt;
    for (const p of [...pts, bottom]) {
      if (!p.w) continue;
      const vx = (p.x - p.px) * AIR;
      const vy = (p.y - p.py) * AIR;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + (p === bottom ? blow : 0);
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
    // Подсказка сделала своё: контакты открыли.
    button.classList.remove("is-calling");
    if (revealed) setTip(null);
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
    const turn = phi + tiltY;
    showSide(turn);
    const pose = `perspective(1400px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${turn.toFixed(2)}deg)`;
    if (turned) back.style.transform = `${pose} rotateY(180deg)`;
    else front.style.transform = pose;
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
  // «Ветер» от прокрутки: пока страница едет, визитку относит в сторону
  // (вниз — вправо), остановилась — визитка мягко возвращается. Скорость
  // сглажена за ~0,15 с: шаг прокрутки между кадрами скачет (кадры и
  // прокрутка идут не в ногу), и сырой шаг тряс бы визитку. Только для мыши:
  // на телефоне прокрутка — это палец, и визитке незачем дёргаться.
  let lastScroll = scrollY;
  let wind = 0;
  const breeze = (dt: number) => {
    const speed = (scrollY - lastScroll) / Math.max(dt, 1 / 240);
    lastScroll = scrollY;
    if (!fine) return;
    wind += (speed - wind) * (1 - Math.exp(-dt / 0.15));
    if (Math.abs(wind) < 2) wind = 0;
  };

  let lag = 0;
  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 50) / 1000;
    breeze(dt);
    lag += dt;
    for (; lag >= STEP; lag -= STEP) step(STEP);
    spin(dt);
    const ease = 1 - Math.exp(-dt * 9);
    tiltX += (goalX - tiltX) * ease;
    tiltY += (goalY - tiltY) * ease;
    const dots = portrait?.tick(dt) ?? false;
    if (scratching && portrait) {
      const erased = portrait.erased();
      if (erased >= ERASE_GOAL) finishScratch();
      else if (erased > 0.2) setTip(TIP_MIDDLE);
    }
    render();
    let energy = 0;
    for (const p of [...pts, bottom]) energy += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
    const still =
      !held &&
      !press &&
      !hover &&
      !freeSpin &&
      !dots &&
      wind === 0 &&
      energy < 0.02 &&
      Math.abs(target - phi) < 0.05 &&
      Math.abs(omega) < 0.05 &&
      Math.abs(tiltX) + Math.abs(tiltY) < 0.02;
    quiet = still ? quiet + 1 : 0;
    if (quiet > 20) sleep();
  };
  const wake = () => {
    quiet = 0;
    if (awake || !visible) return;
    awake = true;
    // Пока спали, страница могла уехать далеко: скорость — с этого кадра.
    lastScroll = scrollY;
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

  /** Координаты визитки → координаты портрета. */
  const onPortrait = (at: { lx: number; ly: number }) => ({ x: at.lx + W / 2 - portraitBox.offsetLeft, y: at.ly + A - portraitBox.offsetTop });

  const lean = (at: { u: number; v: number }) => {
    goalY = gsap.utils.clamp(-1, 1, at.u * 2 - 1) * 9;
    goalX = -gsap.utils.clamp(-1, 1, at.v * 2 - 1) * 7;
    glareX = at.u * 100;
    glareY = at.v * 100;
  };
  const relax = () => {
    hover = false;
    goalX = 0;
    goalY = 0;
    glareX = 50;
    glareY = -20;
  };

  const setTip = (text: string | null) => {
    if (text && tip.textContent !== text) tip.textContent = text;
    tip.classList.toggle("is-on", Boolean(text));
  };

  // Стирание пальцем.
  let scratching = false;
  let revealed = false;
  let lastScratch = { x: 0, y: 0 };
  let lastSound = 0;
  let lastBuzz = 0;
  const startScratch = (at: ReturnType<typeof locate>) => {
    scratching = true;
    hover = true;
    lean(at);
    lastScratch = onPortrait(at);
    portrait?.scratchStart(lastScratch.x, lastScratch.y);
  };
  const endScratch = () => {
    scratching = false;
    relax();
    portrait?.scratchEnd();
  };
  const scratchFeedback = (time: number) => {
    if (time - lastSound > 80 && activated()) {
      lastSound = time;
      play("scratch");
    }
    if (time - lastBuzz > 120) {
      lastBuzz = time;
      buzz(6);
    }
  };
  /** Стёрто достаточно: остаток сносит волной от пальца, визитку встряхивает. */
  const finishScratch = () => {
    scratching = false;
    revealed = true;
    relax();
    portrait?.blast(lastScratch.x, lastScratch.y);
    setTip(TIP_DONE);
    button.classList.add("is-calling");
    // Толчок мягкий: кнопка переворота должна остаться на экране.
    bottom.px -= lastScratch.x < portraitBox.clientWidth / 2 ? -1.5 : 1.5;
    tiltY = lastScratch.x < portraitBox.clientWidth / 2 ? 12 : -12;
    if (activated()) play("reveal");
    buzz([10, 40, 18]);
  };
  /** Касание портрета: целый — волна по точкам, стёртый — точки слетаются назад. */
  const tapPortrait = (at: ReturnType<typeof locate>) => {
    if (revealed) {
      revealed = false;
      portrait?.restore();
      button.classList.remove("is-calling");
      setTip(TIP_START);
      play("whoosh");
    } else {
      const point = onPortrait(at);
      portrait?.poke(point.x, point.y);
      play("tick");
    }
  };

  // Нажатие: без сдвига — переворот (касание портрета — волна), со сдвигом —
  // стирание (палец по портрету) или бросок.
  let press: { id: number; x: number; y: number; moved: boolean; mouse: boolean; zone: boolean } | null = null;
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
    const mouse = event.pointerType === "mouse";
    // Палец на портрете: ниже портрета — чёрная полоса с именем, за неё хватают.
    const at = locate(event.clientX, event.clientY);
    const zone = !mouse && face === 0 && Boolean(portrait) && at.ly + A < band.offsetTop;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, mouse, zone };
    samples = [{ x: event.clientX, y: event.clientY, t: event.timeStamp }];
    if (press.mouse) event.preventDefault();
    wake();
  });

  listen(card, "pointermove", (event: PointerEvent) => {
    if (press && event.pointerId === press.id) {
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      // Вертикальный свайп заберёт браузер (touch-action: pan-y) и пришлёт
      // pointercancel: это прокрутка страницы, её не трогаем.
      if (!press.moved && !press.mouse && Math.abs(dy) > Math.abs(dx)) return;
      if (!press.moved && Math.hypot(dx, dy) > 6) {
        press.moved = true;
        card.setPointerCapture(event.pointerId);
        const at = locate(press.x, press.y);
        if (press.zone && !revealed) {
          startScratch(at);
        } else {
          held = { lx: at.lx, ly: at.ly, tx: at.x, ty: at.y };
          card.classList.add("is-held");
          hover = false;
          goalX = 0;
          goalY = 0;
          portrait?.leave();
        }
      }
      if (press.moved) {
        samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
        if (samples.length > 12) samples.shift();
        if (scratching) {
          const at = locate(event.clientX, event.clientY);
          lastScratch = onPortrait(at);
          lean(at);
          portrait?.scratch(lastScratch.x, lastScratch.y);
          scratchFeedback(event.timeStamp);
        } else if (held) {
          // Поводок: дальше ленты с запасом не утащить.
          const at = locate(event.clientX, event.clientY);
          const ox = at.x - anchor.x;
          const oy = at.y - anchor.y;
          const d = Math.hypot(ox, oy);
          const limit = reach + Math.hypot(held.lx, held.ly);
          const k = d > limit ? limit / d : 1;
          held.tx = anchor.x + ox * k;
          held.ty = anchor.y + oy * k;
        }
        wake();
      }
      return;
    }
    if (event.pointerType !== "mouse" || held) return;
    const at = locate(event.clientX, event.clientY);
    hover = true;
    lean(at);
    if (face === 0 && portrait) {
      const point = onPortrait(at);
      portrait.pointer(point.x, point.y);
    }
    wake();
  });

  const release = (event: PointerEvent, cancelled: boolean) => {
    if (!press || event.pointerId !== press.id) return;
    const { moved, zone } = press;
    press = null;
    if (!moved) {
      if (!cancelled) {
        const at = locate(event.clientX, event.clientY);
        if (zone) {
          tapPortrait(at);
        } else {
          flip(at.u < 0.5 ? -1 : 1);
          play("flip");
        }
      }
      wake();
      return;
    }
    if (scratching) endScratch();
    if (held) {
      const v = velocity();
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
    }
    wake();
  };
  listen(card, "pointerup", (event: PointerEvent) => release(event, false));
  listen(card, "pointercancel", (event: PointerEvent) => release(event, true));

  listen(card, "pointerleave", (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || press) return;
    relax();
    portrait?.leave();
    wake();
  });

  listen(button, "click", () => flip(1));

  // Прокрутка страницы раскачивает визитку по инерции — от ускорения, а не
  // от каждого пикселя: ровная прокрутка её не трогает, толчок при старте и
  // остановке — качает. Иначе плавная прокрутка к разделу по пункту меню
  // раскачивала визитку почти до горизонтали. Слушатель только будит расчёт,
  // скорость считается в кадре (inertia ниже). Без мыши прокрутка визитку не
  // трогает: будить незачем.
  listen(
    window,
    "scroll",
    () => {
      if (fine && visible && !held) wake();
    },
    { passive: true },
  );

  // Без мыши всё для портрета качается, только когда визитка показалась: на
  // телефоне она ниже первого экрана, и первой отрисовке это не нужно.
  let touchStarted = false;
  const startTouch = () => {
    if (touchStarted || fine) return;
    touchStarted = true;
    void Promise.all([createPortrait(portraitBox), load(colorImage)]).then(([p]) => {
      portrait = p;
      if (!p) return;
      setTip(TIP_START);
    });
  };

  const seen = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) {
      startTouch();
      wake();
    } else {
      portrait?.clearDust();
      sleep();
    }
  });
  seen.observe(root);

  // Пересобрать сцену — только когда сменилась ширина или визитка съехала вслед
  // за высотой окна (--hero-shift, широкий экран). На телефоне при прокрутке
  // прячется и выезжает адресная строка: высота окна меняется, и сброс визитки
  // в покой выглядел бы рывком.
  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  listen(window, "resize", () => {
    if (window.innerWidth === lastWidth && card.offsetTop === top0) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      reset();
      render();
      portrait?.resize();
    }, 150);
  });

  reset();
  render();
  // С мышью портрет готовится сразу: курсор может оказаться на нём в любой миг.
  if (fine) {
    void createPortrait(portraitBox).then((p) => {
      portrait = p;
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
    seen.disconnect();
    portrait?.clearDust();
    sleep();
    clearTimeout(resizeTimer);
    setTip(null);
    button.classList.remove("is-calling");
    card.style.transform = "";
    front.style.transform = "";
    back.style.transform = "";
    root.querySelectorAll<SVGPathElement>("[data-strap]").forEach((p) => p.dataset.d && p.setAttribute("d", p.dataset.d));
    portraitBox.classList.remove("portrait-live");
    showFace(0);
    showSide(0);
  };
}
