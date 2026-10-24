// Подсказка у курсора: что здесь можно сделать — «колёсико — листать»,
// «тяните» и т. п. Текст — из ближайшего data-cursor (пустой — без
// подсказки). Свой курсор не рисуем: системный остаётся, подсказка едет
// рядом. Только для мыши и без «уменьшить движение».
import { gsap } from "gsap";

export function initCursor(): () => void {
  const label = document.createElement("div");
  label.className = "cursor-label";
  label.setAttribute("aria-hidden", "true");
  document.body.append(label);
  const x = gsap.quickTo(label, "x", { duration: 0.35, ease: "power3.out" });
  const y = gsap.quickTo(label, "y", { duration: 0.35, ease: "power3.out" });
  let text = "";
  let shown = false;

  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cursor]") : null;
    // Пока кнопка зажата (тянут визитку или наклейку), подсказка не нужна.
    const next = event.buttons ? "" : (target?.dataset.cursor ?? "");
    if (!shown) gsap.set(label, { x: event.clientX, y: event.clientY });
    x(event.clientX);
    y(event.clientY);
    if (next !== text) {
      text = next;
      if (next) label.textContent = next;
    }
    if (Boolean(next) !== shown) {
      shown = Boolean(next);
      label.classList.toggle("is-shown", shown);
    }
  };
  const hide = () => {
    shown = false;
    text = "";
    label.classList.remove("is-shown");
  };

  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", hide);
  return () => {
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", hide);
    label.remove();
  };
}
