// Индекс работ (components/WorksIndex.astro): за курсором плывёт превью
// сайта той строки, над которой мышь, — над курсором, чтобы не закрывать саму
// строку. Позиция — пружиной (quickTo), наклон — от скорости курсора, смена
// работы — сдвигом ленты картинок внутри превью.
// Картинки грузятся при первом наведении. Клик по строке ведёт к кейсу, и
// окно кейса коротко подсвечивается — видно, куда пришли.
// Только для мыши и без «уменьшить движение»; переход к кейсу с подсветкой —
// всегда, где есть движение.
import { gsap } from "gsap";
import { load } from "./deferred";

export function initWorksIndex(root: HTMLElement, fine: boolean): () => void {
  const cleanups: Array<() => void> = [];
  const rows = [...root.querySelectorAll<HTMLAnchorElement>("[data-index-row]")];

  // Подсветка кейса после перехода: ждём, пока плавная прокрутка доедет.
  rows.forEach((row) => {
    const onClick = () => {
      const target = document.querySelector(row.hash)?.closest<HTMLElement>("[data-case]");
      if (!target) return;
      target.classList.remove("is-arrived");
      let timer = 0;
      const arrive = () => {
        clearTimeout(timer);
        removeEventListener("scrollend", arrive);
        target.classList.add("is-arrived");
        window.setTimeout(() => target.classList.remove("is-arrived"), 1700);
      };
      addEventListener("scrollend", arrive, { once: true });
      timer = window.setTimeout(arrive, 1400);
    };
    row.addEventListener("click", onClick);
    cleanups.push(() => row.removeEventListener("click", onClick));
  });

  const preview = root.querySelector<HTMLElement>("[data-index-preview]");
  const track = root.querySelector<HTMLElement>("[data-index-track]");
  if (!fine || !preview || !track) return () => cleanups.forEach((fn) => fn());

  root.classList.add("index-live");
  const images = [...track.querySelectorAll<HTMLImageElement>("[data-index-image]")];
  let loaded = false;
  let active = -1;
  let shown = false;
  let lastX = 0;
  let lastT = 0;
  let ceiling = 0;

  gsap.set(preview, { scale: 0.6, opacity: 0, rotation: 0 });
  const xTo = gsap.quickTo(preview, "x", { duration: 0.55, ease: "power3.out" });
  const yTo = gsap.quickTo(preview, "y", { duration: 0.55, ease: "power3.out" });
  const rTo = gsap.quickTo(preview, "rotation", { duration: 0.6, ease: "power3.out" });

  const place = (event: PointerEvent, instant = false) => {
    // Над курсором и по центру от него, в пределах экрана. Сверху не хватает
    // места (мешает шапка) — под курсором.
    const width = preview.offsetWidth;
    const height = preview.offsetHeight;
    const x = gsap.utils.clamp(12, innerWidth - width - 12, event.clientX - width / 2);
    const above = event.clientY - 28 - height;
    const y = above > ceiling ? above : event.clientY + 28;
    if (instant) gsap.set(preview, { x, y, transformOrigin: above > ceiling ? "50% 100%" : "50% 0%" });
    else {
      xTo(x);
      yTo(y);
    }
    // Наклон от скорости курсора: быстрее ведёшь — сильнее кренится.
    const dt = Math.max(16, event.timeStamp - lastT);
    const speed = (event.clientX - lastX) / dt;
    rTo(gsap.utils.clamp(-7, 7, speed * 5));
    lastX = event.clientX;
    lastT = event.timeStamp;
  };

  const show = (index: number, event: PointerEvent) => {
    if (!loaded) {
      loaded = true;
      images.forEach((img) => void load(img));
    }
    if (index !== active) {
      gsap.to(track, { yPercent: -100 * index, duration: active < 0 ? 0 : 0.7, ease: "expo.out", overwrite: true });
      active = index;
    }
    if (!shown) {
      shown = true;
      ceiling = (document.querySelector("[data-header]")?.getBoundingClientRect().bottom ?? 0) + 12;
      place(event, true);
      gsap.to(preview, { scale: 1, opacity: 1, duration: 0.45, ease: "expo.out", overwrite: "auto" });
    }
  };

  const hide = () => {
    if (!shown) return;
    shown = false;
    rTo(0);
    gsap.to(preview, { scale: 0.6, opacity: 0, duration: 0.35, ease: "power3.in", overwrite: "auto" });
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const row = (event.target as Element).closest<HTMLElement>("[data-index-row]");
    if (!row) return hide();
    show(Number(row.dataset.indexRow), event);
    place(event);
  };
  const onLeave = () => hide();

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  // Прокрутка уводит строку из-под курсора — превью прячем, пока мышь не двинется.
  addEventListener("scroll", onLeave, { passive: true });
  cleanups.push(() => {
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
    removeEventListener("scroll", onLeave);
    root.classList.remove("index-live");
    gsap.set(preview, { clearProps: "all" });
  });
  return () => cleanups.forEach((fn) => fn());
}
