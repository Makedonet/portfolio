// Наклейки вокруг визитки (components/Badge.astro): их можно отклеить,
// перетащить и бросить — летят по инерции и отскакивают от краёв первого
// экрана. Только мышь и палец; это игрушка, а не содержимое: наклейки
// скрыты от скринридера, и ничего, кроме них самих, не двигают.
import { gsap } from "gsap";
import { play } from "./sound";

type State = { x: number; y: number; vx: number; vy: number; flying: boolean };

export function initStickers(bounds: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];

  bounds.querySelectorAll<HTMLElement>("[data-sticker]").forEach((el) => {
    const s: State = { x: 0, y: 0, vx: 0, vy: 0, flying: false };
    let drag: { id: number; sx: number; sy: number; x0: number; y0: number; t: number } | null = null;
    // Ограничения сдвига: наклейка целиком внутри первого экрана.
    let limit = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const measure = () => {
      const outer = bounds.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const left = box.left - s.x;
      const top = box.top - s.y;
      limit = {
        minX: outer.left - left,
        maxX: outer.right - (left + box.width),
        minY: outer.top - top,
        maxY: outer.bottom - (top + box.height),
      };
    };
    const place = () => gsap.set(el, { x: s.x, y: s.y, rotation: gsap.utils.clamp(-14, 14, s.vx * 0.012) });

    const fly = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      const friction = Math.pow(0.04, dt);
      s.vx *= friction;
      s.vy *= friction;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Отскок от краёв с потерей скорости.
      if (s.x < limit.minX || s.x > limit.maxX) {
        s.x = gsap.utils.clamp(limit.minX, limit.maxX, s.x);
        s.vx *= -0.55;
      }
      if (s.y < limit.minY || s.y > limit.maxY) {
        s.y = gsap.utils.clamp(limit.minY, limit.maxY, s.y);
        s.vy *= -0.55;
      }
      place();
      if (Math.hypot(s.vx, s.vy) < 12) stop();
    };
    const stop = () => {
      if (!s.flying) return;
      s.flying = false;
      gsap.ticker.remove(fly);
      gsap.to(el, { rotation: 0, duration: 0.5, ease: "back.out(2)" });
      el.classList.remove("is-dragging");
      play("pop");
    };

    let last = { x: 0, y: 0, t: 0 };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      stop();
      measure();
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
      drag = { id: event.pointerId, sx: event.clientX, sy: event.clientY, x0: s.x, y0: s.y, t: event.timeStamp };
      last = { x: event.clientX, y: event.clientY, t: event.timeStamp };
      s.vx = 0;
      s.vy = 0;
      gsap.to(el, { scale: 1.08, duration: 0.25, ease: "power3.out" });
      play("tick");
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      s.x = gsap.utils.clamp(limit.minX, limit.maxX, drag.x0 + event.clientX - drag.sx);
      s.y = gsap.utils.clamp(limit.minY, limit.maxY, drag.y0 + event.clientY - drag.sy);
      const dt = Math.max(1, event.timeStamp - last.t) / 1000;
      // Скорость — сглаженная: последний рывок мыши не должен решать всё.
      s.vx = s.vx * 0.6 + ((event.clientX - last.x) / dt) * 0.4;
      s.vy = s.vy * 0.6 + ((event.clientY - last.y) / dt) * 0.4;
      last = { x: event.clientX, y: event.clientY, t: event.timeStamp };
      place();
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      gsap.to(el, { scale: 1, duration: 0.35, ease: "back.out(2)" });
      // Отпустили, не двигая последние 80 мс, — бросать нечего.
      if (event.timeStamp - last.t > 80) {
        s.vx = 0;
        s.vy = 0;
      }
      s.flying = true;
      gsap.ticker.add(fly);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    cleanups.push(() => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      gsap.ticker.remove(fly);
      gsap.set(el, { clearProps: "x,y,rotation,scale" });
      el.classList.remove("is-dragging");
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
