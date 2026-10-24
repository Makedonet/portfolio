// «Живые окна» (components/LiveWindow.astro): длинный кадр сайта листается
// GSAP-таймлайном с паузами на секциях, как запись экрана.
// - Кадры грузятся, когда окно подходит к экрану; до того виден постер.
// - Таймлайн идёт, только пока окно на экране.
// - Наведение мышью — перемотка: высота указателя в окне = позиция «видео».
// - Кнопка паузы в строке адреса останавливает все окна своей группы
//   ([data-live-group]): автодвижение дольше пяти секунд должно
//   останавливаться (WCAG 2.2.2).
// Вызывается только без «уменьшить движение»: иначе окна остаются постерами.
import { gsap } from "gsap";

type Scene = {
  el: HTMLElement;
  page: HTMLImageElement;
  header: HTMLImageElement | null;
  url: string;
  stops: number[];
  max: number;
  screens: number;
};

type Group = { paused: boolean; buttons: HTMLButtonElement[]; syncs: Array<() => void> };

/** Подставляет srcset из data-атрибутов и ждёт, пока картинка декодируется. */
function load(img: HTMLImageElement): Promise<void> {
  const picture = img.parentElement instanceof HTMLPictureElement ? img.parentElement : null;
  picture?.querySelectorAll<HTMLSourceElement>("source[data-srcset]").forEach((source) => {
    source.srcset = source.dataset.srcset!;
    source.removeAttribute("data-srcset");
  });
  if (img.dataset.srcset) img.srcset = img.dataset.srcset;
  if (img.dataset.src) img.src = img.dataset.src;
  img.removeAttribute("data-srcset");
  img.removeAttribute("data-src");
  return new Promise((resolve) => {
    const done = () => img.decode().then(resolve, resolve);
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    }
  });
}

function readScenes(win: HTMLElement): Scene[] {
  return [...win.querySelectorAll<HTMLElement>("[data-live-scene]")].map((el) => ({
    el,
    page: el.querySelector<HTMLImageElement>("[data-live-page]")!,
    header: el.querySelector<HTMLImageElement>("[data-live-header]"),
    url: el.dataset.url ?? "",
    stops: JSON.parse(el.dataset.stops ?? "[]") as number[],
    max: Number(el.dataset.max ?? 0),
    screens: Number(el.dataset.screens ?? 1),
  }));
}

/** Таймлайн одного окна: страницы друг за другом, в конце — снова первая. */
function buildTimeline(scenes: Scene[], onUpdate: (scene: number, progress: number) => void): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1, paused: true });
  const starts: number[] = [];

  scenes.forEach((scene, i) => {
    if (i > 0) {
      // Следующая страница лежит в разметке выше предыдущей — проявляется поверх.
      const prev = scenes[i - 1]!;
      tl.to(scene.el, { autoAlpha: 1, duration: 0.6, ease: "power2.out" });
      tl.set(prev.el, { autoAlpha: 0 });
      tl.set(prev.page, { yPercent: 0 });
      if (prev.header) tl.set(prev.header, { autoAlpha: 0 });
    }
    starts.push(tl.duration());
    tl.to({}, { duration: i === 0 ? 1.4 : 1 });

    let at = 0;
    scene.stops.forEach((stop, k) => {
      const target = Math.min(stop, scene.max);
      // Длительность — по расстоянию в экранах: до соседней секции быстрее.
      const screensAway = (Math.abs(target - at) / 100) * scene.screens;
      tl.to(scene.page, {
        yPercent: -target,
        duration: gsap.utils.clamp(0.75, 2.1, 0.45 + screensAway * 0.55),
        ease: "power2.inOut",
      });
      // Шапка в прокрученном виде появляется с первым движением.
      if (k === 0 && scene.header) tl.to(scene.header, { autoAlpha: 1, duration: 0.2 }, "<0.15");
      tl.to({}, { duration: 1.15 });
      at = target;
    });
  });

  const first = scenes[0]!;
  const last = scenes[scenes.length - 1]!;
  if (scenes.length === 1) {
    tl.to(first.page, { yPercent: 0, duration: 1.3, ease: "power3.inOut" });
    if (first.header) tl.to(first.header, { autoAlpha: 0, duration: 0.2 }, ">-0.25");
    tl.to({}, { duration: 0.4 });
  } else {
    // Возврат на первую страницу: она уже наверху, последняя гаснет над ней.
    starts.push(tl.duration());
    tl.set(first.page, { yPercent: 0 });
    if (first.header) tl.set(first.header, { autoAlpha: 0 });
    tl.set(first.el, { autoAlpha: 1 });
    tl.to(last.el, { autoAlpha: 0, duration: 0.6, ease: "power2.out" });
    tl.set(last.page, { yPercent: 0 });
    if (last.header) tl.set(last.header, { autoAlpha: 0 });
  }

  // Адрес — по положению «видео», а не колбэками: при перемотке назад он
  // тоже должен совпадать с показанной страницей.
  tl.eventCallback("onUpdate", () => {
    const time = tl.time();
    let index = 0;
    starts.forEach((start, i) => {
      if (time >= start) index = i % scenes.length;
    });
    onUpdate(index, tl.progress());
  });
  return tl;
}

export function initLiveWindows(fine: boolean): () => void {
  const cleanups: Array<() => void> = [];
  const groups = new Map<Element, Group>();

  const groupOf = (win: HTMLElement): Group => {
    const key = win.closest("[data-live-group]") ?? win;
    let group = groups.get(key);
    if (!group) {
      group = { paused: false, buttons: [...key.querySelectorAll<HTMLButtonElement>("[data-live-toggle]")], syncs: [] };
      groups.set(key, group);
    }
    return group;
  };

  document.querySelectorAll<HTMLElement>("[data-live]").forEach((win) => {
    const group = groupOf(win);
    const scenes = readScenes(win);
    const urlEl = win.querySelector<HTMLElement>("[data-live-url]");
    const progressEl = win.querySelector<HTMLElement>("[data-live-progress]");
    const screen = win.querySelector<HTMLElement>("[data-live-screen]")!;
    const delay = Number(win.dataset.delay ?? 0);

    let tl: gsap.core.Timeline | null = null;
    let visible = false;
    let hovering = false;
    let started = false;
    let shownScene = 0;

    const sync = () => {
      if (!tl) return;
      const play = visible && !hovering && !group.paused;
      if (play && !started) {
        // Первый запуск — со сдвигом, чтобы соседние окна не шли в ногу.
        started = true;
        gsap.delayedCall(delay, () => {
          if (visible && !hovering && !group.paused) tl?.play();
        });
      } else if (play) tl.play();
      else tl.pause();
    };
    group.syncs.push(sync);

    const activate = async () => {
      // Первая страница — сразу, остальные и полосы шапок — следом.
      await load(scenes[0]!.page);
      gsap.to(scenes[0]!.page, { opacity: 1, duration: 0.4 });
      await Promise.all([
        ...scenes.slice(1).map((s) => load(s.page).then(() => gsap.set(s.page, { opacity: 1 }))),
        ...scenes.map((s) => (s.header ? load(s.header) : Promise.resolve())),
      ]);
      scenes.forEach((s) => s.header && gsap.set(s.header, { autoAlpha: 0 }));
      tl = buildTimeline(scenes, (index, progress) => {
        if (index !== shownScene) {
          shownScene = index;
          if (urlEl) urlEl.textContent = scenes[index]!.url;
        }
        if (progressEl) progressEl.style.transform = `scaleX(${progress.toFixed(4)})`;
      });
      sync();
    };

    // Кадры грузятся заранее, за 400px до экрана, а играет окно, только
    // пока видно. IntersectionObserver, а не ScrollTrigger: окно, скрытое
    // через display: none (заднее окно первого экрана на телефоне), не
    // пересекается с экраном вовсе — и его кадр не качается зря.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        void activate();
      },
      { rootMargin: "400px 0px" },
    );
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]!.isIntersecting;
      sync();
    });
    near.observe(win);
    seen.observe(win);

    if (fine) {
      // Перемотка указателем: пауза, позиция «видео» — по высоте курсора.
      const scrub = (event: PointerEvent) => {
        if (!tl) return;
        const rect = screen.getBoundingClientRect();
        const p = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height);
        gsap.to(tl, { progress: p, duration: 0.6, ease: "power3.out", overwrite: true });
      };
      const enter = () => {
        hovering = true;
        sync();
      };
      const leave = () => {
        hovering = false;
        if (tl) gsap.killTweensOf(tl);
        sync();
      };
      screen.addEventListener("pointerenter", enter);
      screen.addEventListener("pointermove", scrub);
      screen.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        screen.removeEventListener("pointerenter", enter);
        screen.removeEventListener("pointermove", scrub);
        screen.removeEventListener("pointerleave", leave);
      });
    }

    cleanups.push(() => {
      near.disconnect();
      seen.disconnect();
      tl?.kill();
    });
  });

  groups.forEach((group) => {
    group.buttons.forEach((button) => {
      const onClick = () => {
        group.paused = !group.paused;
        group.buttons.forEach((b) => {
          const label = group.paused ? b.dataset.labelPlay : b.dataset.labelPause;
          if (label) b.setAttribute("aria-label", label);
          b.querySelector(".live-toggle-pause")?.classList.toggle("hidden", group.paused);
          b.querySelector(".live-toggle-play")?.classList.toggle("hidden", !group.paused);
        });
        group.syncs.forEach((sync) => sync());
      };
      button.addEventListener("click", onClick);
      cleanups.push(() => button.removeEventListener("click", onClick));
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
