// Движение страницы на GSAP: появление при прокрутке, счётчики, линия этапов,
// параллакс, наклон и «магнит» при наведении, «живые окна».
// Первый экран анимирован на CSS (global.css): он должен ожить сразу при
// первой отрисовке, не дожидаясь скрипта. Всё остальное — здесь.
// Разметка размечает, что анимировать, data-атрибутами:
//   data-split — заголовок проявляется по словам;
//   data-fade — блок всплывает; data-stagger — дети всплывают по очереди;
//   data-count — число досчитывает до своего значения (data-count-from — откуда);
//   data-draw — линия галочки прорисовывается;
//   data-parallax — сдвиг при прокрутке, % своей высоты;
//   data-tilt + data-depth — наклон и глубина слоёв под курсором;
//   .btn и data-magnetic — кнопка тянется за курсором;
//   data-process — линия этапов и шаги.
// «Уменьшить движение» — ничего из этого: страница видна как есть.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initLiveWindows } from "./live";

gsap.registerPlugin(ScrollTrigger, SplitText);

const all = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  [...root.querySelectorAll<T & Element>(selector)] as T[];

/** Отдать поток браузеру между частями настройки: одна длинная задача
 *  на телефоне — это задержка отклика на первое касание. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Что на экране в момент запуска — такие блоки не прячем, чтобы не мигнули.
 * Все размеры читаются одним проходом до первой записи стилей: чтение после
 * записи заставляло браузер пересчитывать раскладку на каждом элементе.
 */
function measureOnScreen(): Set<Element> {
  const seen = new Set<Element>();
  const candidates = all("[data-split], [data-fade], [data-stagger] > *, [data-count], [data-draw], [data-case-visual], [data-case-phone]");
  const rects = candidates.map((el) => el.getBoundingClientRect());
  candidates.forEach((el, i) => {
    const r = rects[i]!;
    if (r.bottom > 0 && r.top < innerHeight) seen.add(el);
  });
  return seen;
}

function headings(onScreen: Set<Element>) {
  all("[data-split]")
    .filter((el) => !onScreen.has(el))
    .forEach((el) => {
      SplitText.create(el, {
        type: "lines,words",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 115,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.035,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }),
      });
    });
}

function fades(onScreen: Set<Element>) {
  // Только opacity, не autoAlpha: visibility: hidden убрала бы ссылки и
  // кнопки ещё не проявленных блоков из порядка Tab.
  const singles = all("[data-fade]").filter((el) => !onScreen.has(el));
  gsap.set(singles, { opacity: 0, y: 36 });
  ScrollTrigger.batch(singles, {
    start: "top 90%",
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true }),
  });

  const items = all("[data-stagger] > *").filter((el) => !onScreen.has(el));
  gsap.set(items, { opacity: 0, y: 24 });
  ScrollTrigger.batch(items, {
    start: "top 92%",
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: true }),
  });

  // Фокус с клавиатуры на ещё не проявленном блоке — проявить сразу, чтобы
  // кольцо фокуса не оказалось на прозрачном элементе.
  const hidden = new Set<Element>([...singles, ...items]);
  const reveal = (event: FocusEvent) => {
    let el = event.target instanceof Element ? event.target : null;
    while (el && !hidden.has(el)) el = el.parentElement;
    if (!el) return;
    hidden.delete(el);
    gsap.to(el, { opacity: 1, y: 0, duration: 0.25, overwrite: true });
  };
  document.addEventListener("focusin", reveal);
  return () => document.removeEventListener("focusin", reveal);
}

function counters(onScreen: Set<Element>) {
  all("[data-count]")
    .filter((el) => !onScreen.has(el))
    .forEach((el) => {
      const to = Number(el.dataset.count);
      const from = Number(el.dataset.countFrom ?? 0);
      const value = { n: from };
      el.textContent = String(from);
      gsap.to(value, {
        n: to,
        duration: Math.abs(to - from) > 100 ? 1.6 : 1.2,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = String(Math.round(value.n));
        },
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    });
}

function checkmarks(onScreen: Set<Element>) {
  const paths = all("[data-draw]")
    .filter((el) => !onScreen.has(el))
    .flatMap((el) => all<SVGPathElement>("path", el));
  const lengths = paths.map((path) => path.getTotalLength());
  paths.forEach((path, i) => {
    gsap.set(path, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 0.6,
      ease: "power2.out",
      delay: 0.15,
      scrollTrigger: { trigger: path.closest("li") ?? path, start: "top 92%", once: true },
    });
  });
}

function cases(onScreen: Set<Element>) {
  all("[data-case]").forEach((card) => {
    const visual = card.querySelector<HTMLElement>("[data-case-visual]");
    const phone = card.querySelector<HTMLElement>("[data-case-phone]");
    if (visual && !onScreen.has(visual)) {
      // Окно раскрывается из рамки поменьше, телефон въезжает снизу.
      gsap.fromTo(
        visual,
        { clipPath: "inset(10% 8% 14% 8% round 18px)", scale: 0.94 },
        {
          clipPath: "inset(0% 0% 0% 0% round 12px)",
          scale: 1,
          duration: 1.2,
          ease: "expo.out",
          clearProps: "clipPath",
          scrollTrigger: { trigger: card, start: "top 78%", once: true },
        },
      );
    }
    if (!phone) return;
    if (!onScreen.has(phone)) {
      gsap.from(phone, {
        y: 140,
        rotate: 6,
        autoAlpha: 0,
        duration: 1.2,
        ease: "expo.out",
        delay: 0.2,
        scrollTrigger: { trigger: card, start: "top 78%", once: true },
      });
    }
    // Телефон чуть обгоняет окно при прокрутке — глубина. yPercent, а не y:
    // y у этого слоя занят наклоном под курсором (data-depth).
    gsap.to(phone.parentElement, {
      yPercent: -14,
      ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

function parallax() {
  all("[data-parallax]").forEach((el) => {
    gsap.to(el, {
      yPercent: Number(el.dataset.parallax),
      ease: "none",
      scrollTrigger: { trigger: el.closest("section") ?? el, start: "top top", end: "bottom top", scrub: true },
    });
  });
}

function processLine() {
  const root = document.querySelector<HTMLElement>("[data-process]");
  const line = root?.querySelector<HTMLElement>("[data-process-line]");
  if (!root || !line) return;
  const steps = all("[data-step]", root);
  const mm = gsap.matchMedia();
  // На широком экране линия идёт слева направо, на узком — сверху вниз. Шаг
  // загорается, когда линия дошла до его кружка.
  mm.add({ wide: "(min-width: 1024px)" }, (ctx) => {
    const wide = Boolean(ctx.conditions?.wide);
    // Положение кружков вдоль линии. Размеры линии — из offset*, а не из
    // getBoundingClientRect: линия сжата анимацией, и её рамка в начале нулевая.
    const at = () => {
      const box = root.getBoundingClientRect();
      const start = wide ? box.left + line.offsetLeft : box.top + line.offsetTop;
      const length = (wide ? line.offsetWidth : line.offsetHeight) || 1;
      return steps.map((step) => {
        const dot = (step.querySelector("[data-step-dot]") ?? step).getBoundingClientRect();
        return ((wide ? dot.left + dot.width / 2 : dot.top + dot.height / 2) - start) / length;
      });
    };
    let positions = at();
    gsap.fromTo(
      line,
      wide ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 },
      {
        scaleX: 1,
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top 75%",
          end: wide ? "bottom 55%" : "bottom 65%",
          scrub: 0.6,
          onRefresh: () => {
            positions = at();
          },
          onUpdate: (self) => {
            steps.forEach((step, i) => step.classList.toggle("is-active", self.progress >= (positions[i] ?? 0) - 0.01));
          },
        },
      },
    );
  });
}

function header() {
  const el = document.querySelector<HTMLElement>("[data-header]");
  if (!el) return;
  ScrollTrigger.create({
    start: 12,
    end: "max",
    toggleClass: { targets: el, className: "is-scrolled" },
  });
}

function hover(): () => void {
  const cleanups: Array<() => void> = [];

  // Кнопки тянутся за курсором и пружиной возвращаются на место.
  all(".btn, [data-magnetic]").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)", overwrite: true });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });

  // Наклон: коллаж первого экрана и окна кейсов поворачиваются к курсору,
  // слои с data-depth расходятся по глубине.
  all("[data-tilt]").forEach((el) => {
    const strength = Number(el.dataset.tilt || 6);
    const target = el.querySelector<HTMLElement>("[data-tilt-target]") ?? el;
    gsap.set(target, { transformPerspective: 1200, transformStyle: "preserve-3d" });
    const rx = gsap.quickTo(target, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(target, "rotationY", { duration: 0.6, ease: "power3.out" });
    const layers = all("[data-depth]", el).map((layer) => ({
      depth: Number(layer.dataset.depth),
      x: gsap.quickTo(layer, "x", { duration: 0.8, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.8, ease: "power3.out" }),
    }));
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * strength);
      rx(-py * strength * 0.7);
      layers.forEach((l) => {
        l.x(px * l.depth);
        l.y(py * l.depth);
      });
    };
    const leave = () => {
      rx(0);
      ry(0);
      layers.forEach((l) => {
        l.x(0);
        l.y(0);
      });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

function init() {
  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      fine: "(hover: hover) and (pointer: fine)",
    },
    (ctx) => {
      const { motion, fine } = ctx.conditions as { motion: boolean; fine: boolean };
      if (!motion) return;
      // Класс включает то, что имеет смысл только при движении (кнопки паузы окон).
      document.documentElement.classList.add("motion-on");

      let stopLive = () => {};
      let stopHover = () => {};
      let stopFades = () => {};
      let cancelled = false;

      // Настройка частями, с передышками между ними. ctx.add — чтобы и то,
      // что создано позже, откатилось вместе с контекстом.
      void (async () => {
        const onScreen = measureOnScreen();
        ctx.add(() => {
          header();
          stopFades = fades(onScreen);
          counters(onScreen);
          checkmarks(onScreen);
        });
        await yieldToMain();
        if (cancelled) return;
        ctx.add(() => headings(onScreen));
        await yieldToMain();
        if (cancelled) return;
        ctx.add(() => {
          cases(onScreen);
          parallax();
          processLine();
        });
        await yieldToMain();
        if (cancelled) return;
        ctx.add(() => {
          stopLive = initLiveWindows(fine);
          if (fine) stopHover = hover();
        });
      })();

      return () => {
        cancelled = true;
        stopFades();
        stopLive();
        stopHover();
        document.documentElement.classList.remove("motion-on");
      };
    },
  );
}

// Запуск после загрузки и в свободное время: первый экран уже ожил на CSS,
// скрипту некуда спешить, а его разбор не должен мешать первой отрисовке.
const start = () => ("requestIdleCallback" in window ? requestIdleCallback(init, { timeout: 1200 }) : setTimeout(init, 200));
if (document.readyState === "complete") start();
else addEventListener("load", start, { once: true });
