// Движение страницы на GSAP: появление при прокрутке, счётчики, линия этапов,
// наклон и «магнит» при наведении, «живые окна».
// Первый экран анимирован на CSS (global.css): он должен ожить сразу при
// первой отрисовке, не дожидаясь скрипта. Всё остальное — здесь.
// Разметка размечает, что анимировать, data-атрибутами:
//   data-split — заголовок проявляется по словам;
//   data-fade — блок всплывает; data-stagger — дети всплывают по очереди;
//   data-count — число досчитывает до своего значения (data-count-from — откуда);
//   data-draw — линия галочки прорисовывается;
//   data-tilt + data-depth — наклон и глубина слоёв под курсором;
//   .btn и data-magnetic — кнопка тянется за курсором;
//   data-process — линия этапов и шаги;
//   data-progress — полоса прочитанного в шапке;
//   data-marquee — ленты крест-накрест, разгоняются от прокрутки;
//   data-manifesto — абзац проявляется по словам вслед за прокруткой;
//   data-services — лента услуг едет вбок, пока секция закреплена;
//   data-footer-name — имя в подвале, буквы набирают вес у курсора.
// Визитка первого экрана, наклейки и подсказка у курсора — в своих модулях
// (badge, stickers, cursor). Запускает всё boot.ts — после загрузки страницы.
// «Уменьшить движение» — ничего из этого: страница видна как есть.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initLiveWindows } from "./live";
import { initBadge } from "./badge";
import { initStickers } from "./stickers";
import { initCursor } from "./cursor";

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

/** Заголовки — каждый своей задачей: разбивка на строки и слова требует
 *  раскладки, а все разом на телефоне заняли бы поток на десятую секунды. */
function headings(onScreen: Set<Element>): Array<() => void> {
  return all("[data-split]")
    .filter((el) => !onScreen.has(el))
    .map((el) => () => {
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

/** Кейсы — тоже по одному на задачу. */
function cases(onScreen: Set<Element>): Array<() => void> {
  return all("[data-case]").map((card) => () => {
    const visual = card.querySelector<HTMLElement>("[data-case-visual]");
    const phone = card.querySelector<HTMLElement>("[data-case-phone]");
    if (visual && !onScreen.has(visual)) {
      // Окно «встаёт» из наклона назад вслед за прокруткой: сначала лежит,
      // как экран ноутбука, который открывают, к середине экрана — прямо.
      gsap.fromTo(
        visual,
        { rotationX: 32, yPercent: 10, scale: 0.9, transformPerspective: 1600, transformOrigin: "50% 100%" },
        {
          rotationX: 0,
          yPercent: 0,
          scale: 1,
          ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top bottom", end: "top 30%", scrub: 0.8 },
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
        scrollTrigger: { trigger: card, start: "top 70%", once: true },
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

function progress() {
  const bar = document.querySelector<HTMLElement>("[data-progress]");
  if (!bar) return;
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
}

/** Ленты: скорость и направление — от прокрутки, крен — от скорости. */
function marquee(): () => void {
  const root = document.querySelector<HTMLElement>("[data-marquee]");
  if (!root) return () => {};
  const tracks = all("[data-marquee-track]", root).map((el) => ({ el, dir: Number(el.dataset.direction || 1), x: 0, width: 1 }));
  const measure = () => tracks.forEach((t) => (t.width = (t.el.firstElementChild as HTMLElement).offsetWidth || 1));
  measure();
  let boost = 0;
  let heading = 1;
  let active = false;
  ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => (active = self.isActive),
    onUpdate: (self) => {
      boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 220, 14));
      heading = self.direction;
    },
    onRefresh: measure,
  });
  const tick = (_time: number, deltaMs: number) => {
    if (!active) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    boost *= Math.pow(0.08, dt);
    const skew = gsap.utils.clamp(-9, 9, boost * heading * 0.8);
    tracks.forEach((t) => {
      t.x -= t.dir * heading * (55 + boost * 70) * dt;
      t.x %= t.width;
      if (t.x > 0) t.x -= t.width;
      t.el.style.transform = `translate3d(${t.x.toFixed(1)}px, 0, 0) skewX(${(skew * t.dir).toFixed(2)}deg)`;
    });
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    tracks.forEach((t) => (t.el.style.transform = ""));
  };
}

/** Абзац подхода: слова заливаются по очереди из контура, маркер
 *  дорисовывается. Контур — того же цвета, что текст: непрочитанное слово
 *  остаётся контрастным и читаемым. */
function manifesto() {
  const el = document.querySelector<HTMLElement>("[data-manifesto]");
  if (!el) return;
  SplitText.create(el, {
    type: "words",
    wordsClass: "manifesto-word",
    // Для скринридера рядом есть обычный текст, разбивка спрятана целиком.
    aria: "none",
    autoSplit: true,
    onSplit: (self) =>
      gsap.fromTo(
        self.words,
        { color: "rgb(17 17 16 / 0)" },
        {
          color: "rgb(17 17 16 / 1)",
          ease: "none",
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: 0.5 },
        },
      ),
  });
  all("[data-manifesto-mark]", el).forEach((mark) => {
    gsap.fromTo(
      mark,
      { backgroundSize: "0% 0.42em" },
      {
        backgroundSize: "100% 0.42em",
        ease: "none",
        scrollTrigger: { trigger: mark, start: "top 72%", end: "top 52%", scrub: 0.5 },
      },
    );
  });
}

/** Услуги: на широком экране секция закреплена, лента карточек едет вбок. */
function services() {
  const root = document.querySelector<HTMLElement>("[data-services]");
  const track = root?.querySelector<HTMLElement>("[data-services-track]");
  const bar = root?.querySelector<HTMLElement>("[data-services-progress]");
  if (!root || !track) return;
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1024px)", () => {
    const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    tl.to(track, { x: () => -distance(), ease: "none" }, 0);
    if (bar) tl.to(bar, { scaleX: 1, ease: "none" }, 0);
  });
}

/** Контакты: тёмный блок раскрывается из скруглённой карточки во всю ширину. */
function contactReveal() {
  const el = document.querySelector<HTMLElement>("#contact");
  if (!el) return;
  gsap.fromTo(
    el,
    { clipPath: "inset(7% 4% 0% 4% round 2.5rem)" },
    {
      clipPath: "inset(0% 0% 0% 0% round 0rem)",
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "top 25%", scrub: true },
    },
  );
}

/** Имя в подвале: буквы поднимаются при появлении, у курсора — толстеют. */
function footerName(fine: boolean): () => void {
  const root = document.querySelector<HTMLElement>("[data-footer-name]");
  if (!root) return () => {};
  const letters = all(".footer-letter", root);
  // Ширина каждой буквы — по самому жирному начертанию: от веса буквы
  // соседи не должны ездить.
  const fix = () => {
    letters.forEach((l) => {
      l.style.width = "";
      l.style.setProperty("--w", "900");
    });
    const widths = letters.map((l) => l.getBoundingClientRect().width);
    letters.forEach((l, i) => {
      l.style.width = `${widths[i]}px`;
      l.style.removeProperty("--w");
    });
  };
  fix();
  // Ширины по запасному шрифту не годятся — перемерить, когда приедет Onest.
  void document.fonts.ready.then(fix);
  gsap.from(letters, {
    yPercent: 105,
    duration: 1.2,
    ease: "expo.out",
    stagger: 0.06,
    scrollTrigger: { trigger: root, start: "top 92%", once: true },
  });
  const onResize = () => fix();
  window.addEventListener("resize", onResize);
  if (!fine) return () => window.removeEventListener("resize", onResize);

  const setters = letters.map((l) => gsap.quickTo(l, "--w", { duration: 0.6, ease: "power3.out" }));
  const footer = root.closest("footer") ?? root;
  const move = (event: PointerEvent) => {
    letters.forEach((l, i) => {
      const r = l.getBoundingClientRect();
      const d = Math.hypot(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2));
      setters[i]!(Math.round(900 - gsap.utils.clamp(0, 1, d / 520) * 600));
    });
  };
  const leave = () => setters.forEach((set) => set(300));
  footer.addEventListener("pointermove", move);
  footer.addEventListener("pointerleave", leave);
  return () => {
    window.removeEventListener("resize", onResize);
    footer.removeEventListener("pointermove", move);
    footer.removeEventListener("pointerleave", leave);
  };
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

  // Наклон: окна кейсов поворачиваются к курсору, телефон рядом с окном
  // (data-depth) отходит по глубине.
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

export function init() {
  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      fine: "(hover: hover) and (pointer: fine)",
    },
    (ctx) => {
      const { motion, fine } = ctx.conditions as { motion: boolean; fine: boolean };
      const badge = document.querySelector<HTMLElement>("[data-badge]");
      // Перевернуть визитку можно и без анимаций — это содержимое, не украшение.
      if (!motion) {
        const stopBadge = badge ? initBadge(badge, false) : () => {};
        return () => stopBadge();
      }
      // Класс включает то, что имеет смысл только при движении (кнопки паузы окон).
      document.documentElement.classList.add("motion-on");

      let stopLive = () => {};
      let stopHover = () => {};
      let stopFades = () => {};
      let stopBadge = () => {};
      let stopStickers = () => {};
      let stopCursor = () => {};
      let stopMarquee = () => {};
      let stopFooter = () => {};
      let cancelled = false;

      // Настройка мелкими задачами с передышками: каждая короче 50 мс даже на
      // медленном телефоне, и первое касание не ждёт. ctx.add — чтобы и то,
      // что создано позже, откатилось вместе с контекстом.
      void (async () => {
        const onScreen = measureOnScreen();
        const tasks: Array<() => void> = [
          // Визитка — первым делом: она на первом экране и ждёт рук.
          () => {
            if (badge) {
              stopBadge = initBadge(badge, true);
              stopStickers = initStickers(badge.closest("section") ?? badge);
            }
            if (fine) stopCursor = initCursor();
          },
          // Закреплённая лента услуг добавляет странице высоты — она раньше
          // всех триггеров ниже неё, тогда они сразу считаются с её учётом.
          services,
          () => {
            header();
            progress();
          },
          () => {
            stopFades = fades(onScreen);
          },
          () => counters(onScreen),
          () => checkmarks(onScreen),
          ...headings(onScreen),
          manifesto,
          ...cases(onScreen),
          processLine,
          contactReveal,
          () => {
            stopLive = initLiveWindows(fine);
            if (fine) stopHover = hover();
          },
          () => {
            stopMarquee = marquee();
          },
          () => {
            stopFooter = footerName(fine);
          },
        ];
        for (const task of tasks) {
          if (cancelled) return;
          ctx.add(task);
          await yieldToMain();
        }
      })();

      return () => {
        cancelled = true;
        stopFades();
        stopLive();
        stopHover();
        stopBadge();
        stopStickers();
        stopCursor();
        stopMarquee();
        stopFooter();
        document.documentElement.classList.remove("motion-on");
      };
    },
  );
}
