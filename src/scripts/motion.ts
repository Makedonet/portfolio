// Движение страницы на GSAP: появление при прокрутке, счётчики, линия этапов,
// наклон и «магнит» при наведении, «живые окна», индекс работ.
// Первый экран анимирован на CSS (global.css): он должен ожить сразу при
// первой отрисовке, не дожидаясь скрипта. Всё остальное — здесь.
// Разметка размечает, что анимировать, data-атрибутами:
//   data-split — заголовок проявляется по словам;
//   data-fade — блок всплывает; data-stagger — дети всплывают по очереди;
//   data-count — число прокручивается до своего значения, как барабаны счётчика;
//   .ring-value и .metric-bars — кольца оценок и полосы «было/стало» в кейсах;
//   data-draw — линия галочки прорисовывается;
//   data-tilt + data-depth — наклон и глубина слоёв под курсором;
//   .btn и data-magnetic — кнопка тянется за курсором, текст .btn перекатывается;
//   data-process — линия этапов и шаги;
//   data-progress — полоса прочитанного в шапке;
//   data-marquee — ленты крест-накрест, разгоняются от прокрутки;
//   data-manifesto — абзац проявляется по словам вслед за прокруткой;
//   data-services — лента услуг едет вбок, пока секция закреплена;
//   .service — карточка услуги наклоняется к курсору, по ней бежит блик;
//   data-contact-glow — пятно света за курсором в контактах;
//   data-footer-name — имя в подвале, буквы набирают вес у курсора.
// Визитка первого экрана, наклейки, подсказка у курсора и индекс работ —
// в своих модулях (badge, stickers, cursor, works-index). Запускает всё
// boot.ts — после загрузки страницы.
// «Уменьшить движение» — ничего из этого: страница видна как есть.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initLiveWindows } from "./live";
import { initBadge } from "./badge";
import { initStickers } from "./stickers";
import { initCursor } from "./cursor";
import { initWorksIndex } from "./works-index";

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
  const candidates = all(
    "[data-split], [data-fade], [data-stagger] > *, [data-count], [data-draw], [data-case-visual], [data-case-phone], .ring-value, .metric-bars",
  );
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

/**
 * Вызывает fn, когда элементы входят в экран — верх элемента поднимается выше
 * линии start (в процентах высоты экрана сверху). Для каждого элемента один
 * раз; вошедшие в одном кадре приходят одной пачкой — их удобно пускать по
 * очереди. IntersectionObserver, а не ScrollTrigger на каждый элемент:
 * триггер при создании читает раскладку, и сотня триггеров появления на
 * медленном телефоне занимала поток одной задачей на 130 мс.
 */
function whenVisible(elements: Element[], fn: (batch: HTMLElement[]) => void, start = 92): () => void {
  if (!elements.length) return () => {};
  const observer = new IntersectionObserver(
    (entries) => {
      const batch = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
      batch.forEach((el) => observer.unobserve(el));
      if (batch.length) fn(batch);
    },
    { rootMargin: `0px 0px -${100 - start}% 0px` },
  );
  elements.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

function fades(onScreen: Set<Element>): () => void {
  // Только opacity, не autoAlpha: visibility: hidden убрала бы ссылки и
  // кнопки ещё не проявленных блоков из порядка Tab.
  // Начальное положение — прямо в style, не через gsap.set: set перед записью
  // читает текущее значение, и чтение после записи пересчитывало стили всей
  // страницы на каждом из сотни блоков.
  const singles = all("[data-fade]").filter((el) => !onScreen.has(el));
  const items = all("[data-stagger] > *").filter((el) => !onScreen.has(el));
  const hide = (els: HTMLElement[], y: number) =>
    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = `translate(0px, ${y}px)`;
    });
  hide(singles, 36);
  hide(items, 24);
  // overwrite: "auto", а не true: true снял бы и чужие твины тех же
  // элементов — наклон карточек услуг (quickTo) после появления замер бы.
  const stops = [
    whenVisible(singles, (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: "auto" }), 90),
    whenVisible(items, (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: "auto" })),
  ];

  // Фокус с клавиатуры на ещё не проявленном блоке — проявить сразу, чтобы
  // кольцо фокуса не оказалось на прозрачном элементе.
  const hidden = new Set<Element>([...singles, ...items]);
  const reveal = (event: FocusEvent) => {
    let el = event.target instanceof Element ? event.target : null;
    while (el && !hidden.has(el)) el = el.parentElement;
    if (!el) return;
    hidden.delete(el);
    gsap.to(el, { opacity: 1, y: 0, duration: 0.25, overwrite: "auto" });
  };
  document.addEventListener("focusin", reveal);
  return () => {
    stops.forEach((stop) => stop());
    document.removeEventListener("focusin", reveal);
    gsap.set([...singles, ...items], { clearProps: "opacity,transform" });
  };
}

/** Числа прокручиваются до своего значения, как барабаны счётчика: у каждой
 *  цифры своя лента 0–9, младшие разряды делают лишние обороты и встают
 *  последними. Невидимая цифра в разряде держит ширину и базовую линию,
 *  лента лежит поверх неё. Число — внутри aria-hidden, рядом есть текст
 *  для скринридера (MetricValue.astro). Отмена возвращает обычный текст. */
function odometers(onScreen: Set<Element>): () => void {
  const numbers = all("[data-count]").filter((el) => !onScreen.has(el));
  numbers.forEach((el) => {
    const digits = [...(el.dataset.count ?? "")];
    el.innerHTML = digits
      .map((digit, i) => {
        const loops = Math.min(2, i + (i === digits.length - 1 ? 1 : 0));
        const cells = Array.from({ length: loops * 10 + Number(digit) + 1 }, (_, n) => `<span>${n % 10}</span>`).join("");
        return `<span class="odo-d"><span class="odo-ghost">${digit}</span><span class="odo-s">${cells}</span></span>`;
      })
      .join("");
  });
  const stop = whenVisible(numbers, (batch) =>
    batch.forEach((el) =>
      all(".odo-s", el).forEach((strip, i) => {
        const n = strip.childElementCount;
        gsap.to(strip, { yPercent: (-100 * (n - 1)) / n, duration: 1.4 + i * 0.15, ease: "expo.out", delay: 0.1 });
      }),
    ),
  );
  return () => {
    stop();
    numbers.forEach((el) => (el.textContent = el.dataset.count ?? ""));
  };
}

/** Кольца оценок дорисовываются до своей доли. В «было/стало» обе полосы
 *  вырастают, затем «стало» сжимается до новой длины, а число рядом с ней
 *  убывает вместе с полосой. */
function gauges(onScreen: Set<Element>): () => void {
  const rings = all<SVGCircleElement>(".ring-value").filter((ring) => !onScreen.has(ring));
  gsap.set(rings, { strokeDashoffset: (_i: number, ring: SVGCircleElement) => Number(ring.dataset.ringLength) });

  const timelines = new Map<Element, gsap.core.Timeline>();
  all(".metric-bars")
    .filter((bars) => !onScreen.has(bars))
    .forEach((bars) => {
      const after = bars.querySelector<HTMLElement>("[data-bar]");
      if (!after) return;
      const figure = bars.querySelector<HTMLElement>("[data-bar-from]");
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(all(".bar-fill", bars), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.out", stagger: 0.08 });
      tl.to(after, { scaleX: Number(after.dataset.bar), duration: 1.3, ease: "expo.inOut" }, "+=0.2");
      if (figure) {
        const value = { n: Number(figure.dataset.barFrom) };
        figure.textContent = String(value.n);
        tl.to(
          value,
          {
            n: Number(figure.dataset.barTo),
            duration: 1.3,
            ease: "expo.inOut",
            onUpdate: () => {
              figure.textContent = String(Math.round(value.n));
            },
          },
          "<",
        );
      }
      timelines.set(bars, tl);
    });

  const stops = [
    whenVisible(rings, (batch) =>
      gsap.to(batch, {
        strokeDashoffset: (_i: number, ring: SVGCircleElement) => Number(ring.dataset.ring),
        duration: 1.6,
        ease: "expo.out",
        delay: 0.1,
      }),
    ),
    whenVisible([...timelines.keys()], (batch) => batch.forEach((bars) => timelines.get(bars)?.play())),
  ];
  return () => stops.forEach((stop) => stop());
}

/** Галочки прорисовываются, когда их пункт появляется, — по очереди, как
 *  всплывают сами пункты. */
function checkmarks(onScreen: Set<Element>): () => void {
  const marks = all("[data-draw]").filter((el) => !onScreen.has(el));
  const paths = marks.flatMap((el) => all<SVGPathElement>("path", el));
  // Сначала все длины, потом запись — по той же причине, что в fades().
  const lengths = paths.map((path) => path.getTotalLength());
  paths.forEach((path, i) => {
    path.style.strokeDasharray = `${lengths[i]}`;
    path.style.strokeDashoffset = `${lengths[i]}`;
  });
  const stop = whenVisible(
    marks.map((el) => el.closest("li") ?? el),
    (batch) => gsap.to(batch.flatMap((item) => all("[data-draw] path", item)), { strokeDashoffset: 0, duration: 0.6, ease: "power2.out", delay: 0.15, stagger: 0.07 }),
  );
  return () => {
    stop();
    gsap.set(paths, { clearProps: "strokeDasharray,strokeDashoffset" });
  };
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
 *  остаётся контрастным и читаемым. Разбивка, заливка и каждый маркер —
 *  отдельными задачами: вместе они занимали поток на 100 мс на медленном
 *  телефоне. autoSplit не нужен: разбивка только на слова от ширины не
 *  зависит. */
function manifesto(): Array<() => void> {
  const el = document.querySelector<HTMLElement>("[data-manifesto]");
  if (!el) return [];
  let words: Element[] = [];
  // Для скринридера рядом есть обычный текст, разбивка спрятана целиком.
  const split = () => {
    words = SplitText.create(el, { type: "words", wordsClass: "manifesto-word", aria: "none" }).words;
  };
  const fill = () => {
    gsap.fromTo(
      words,
      // Начало — цвет бумаги, а не прозрачный: заливка закрывает внутренние
      // линии обводки (global.css, .manifesto-word).
      { color: "rgb(243 242 236)" },
      {
        color: "rgb(17 17 16)",
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: 0.5 },
      },
    );
  };
  // Маркер ищем в момент задачи: разбивка на слова перестраивает абзац.
  const marks = [...el.querySelectorAll("[data-manifesto-mark]")].map((_, i) => () => {
    const mark = all("[data-manifesto-mark]", el)[i];
    if (!mark) return;
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
  return [split, fill, ...marks];
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
  // Ширины по запасному шрифту не годятся — перемерить, когда приедет шрифт.
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

/** Текст кнопки при наведении перекатывается: буквы по очереди уезжают
 *  вверх, снизу на их место въезжает копия (global.css, .roll). Буквы
 *  скрыты от скринридера, рядом — тот же текст целиком. */
function rollText(btn: HTMLElement): () => void {
  // Текст прямо в кнопке и в её простых <span> (в шапке номер и «Позвонить»
  // лежат в своих span для разной ширины экрана).
  const nodes = [...btn.childNodes].flatMap((node) => {
    if (node instanceof Text) return node.data.trim() ? [node] : [];
    if (node instanceof HTMLSpanElement && !node.classList.contains("sr-only") && node.childNodes.length === 1 && node.firstChild instanceof Text)
      return [node.firstChild];
    return [];
  });
  const restores = nodes.map((node) => {
    const text = node.data.trim();
    const line = () => {
      const el = document.createElement("span");
      [...text].forEach((char, i) => {
        if (char === " ") return el.append(" ");
        const letter = document.createElement("span");
        letter.textContent = char;
        letter.style.setProperty("--i", String(i));
        el.append(letter);
      });
      return el;
    };
    const roll = document.createElement("span");
    roll.className = "roll";
    roll.setAttribute("aria-hidden", "true");
    roll.append(line(), line());
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = text;
    node.replaceWith(roll, label);
    return () => {
      roll.replaceWith(node);
      label.remove();
    };
  });
  return () => restores.forEach((fn) => fn());
}

function hover(): () => void {
  const cleanups: Array<() => void> = [];

  all(".btn").forEach((btn) => cleanups.push(rollText(btn)));

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
    // Плоский, а не preserve-3d: в общем 3D-контексте окно и телефон делили
    // одну плоскость, и браузер то и дело считал верхним окно — колёсико над
    // телефоном листало окно под ним.
    gsap.set(target, { transformPerspective: 1200 });
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

  // Карточки услуг наклоняются к курсору, по ним бежит блик (--gx/--gy,
  // global.css). Наклон — на самой карточке: появление при прокрутке
  // двигает её y, а не поворот, и твины друг другу не мешают.
  all(".service").forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 9);
      rx((0.5 - py) * 9);
      card.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      card.style.removeProperty("--gx");
      card.style.removeProperty("--gy");
    });
  });

  // Контакты: за курсором по тёмному блоку плывёт мягкое жёлтое пятно.
  // Прокрутка уносит блок из-под неподвижной мыши — пятно догоняет.
  const contact = document.querySelector<HTMLElement>("#contact");
  const glow = contact?.querySelector<HTMLElement>("[data-contact-glow]");
  if (contact && glow) {
    const gx = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
    const gy = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
    let pointer: { x: number; y: number } | null = null;
    const follow = () => {
      if (!pointer) return;
      const r = contact.getBoundingClientRect();
      gx(pointer.x - r.left);
      gy(pointer.y - r.top);
    };
    const move = (e: PointerEvent) => {
      if (!pointer) glow.classList.add("is-on");
      pointer = { x: e.clientX, y: e.clientY };
      follow();
    };
    const leave = () => {
      pointer = null;
      glow.classList.remove("is-on");
    };
    contact.addEventListener("pointermove", move);
    contact.addEventListener("pointerleave", leave);
    addEventListener("scroll", follow, { passive: true });
    cleanups.push(() => {
      contact.removeEventListener("pointermove", move);
      contact.removeEventListener("pointerleave", leave);
      removeEventListener("scroll", follow);
      glow.classList.remove("is-on");
    });
  }

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
        const stopBadge = badge ? initBadge(badge, false, fine) : () => {};
        return () => stopBadge();
      }
      // Класс включает то, что имеет смысл только при движении (кнопки паузы окон).
      document.documentElement.classList.add("motion-on");

      const stops: Array<() => void> = [];
      let cancelled = false;

      // Настройка мелкими задачами с передышками: каждая короче 50 мс даже на
      // медленном телефоне, и первое касание не ждёт. ctx.add — чтобы и то,
      // что создано позже, откатилось вместе с контекстом.
      void (async () => {
        const onScreen = measureOnScreen();
        const tasks: Array<() => void> = [
          // Визитка — первым делом: она на первом экране и ждёт рук.
          () => {
            if (badge) stops.push(initBadge(badge, true, fine), initStickers(badge.closest("section") ?? badge));
            if (fine) stops.push(initCursor());
          },
          // Закреплённая лента услуг добавляет странице высоты — она раньше
          // всех триггеров ниже неё, тогда они сразу считаются с её учётом.
          services,
          () => {
            header();
            progress();
          },
          () => stops.push(fades(onScreen)),
          () => {
            const index = document.querySelector<HTMLElement>("[data-works-index]");
            if (index) stops.push(initWorksIndex(index, fine));
          },
          () => stops.push(odometers(onScreen)),
          () => stops.push(gauges(onScreen)),
          () => stops.push(checkmarks(onScreen)),
          ...headings(onScreen),
          ...manifesto(),
          ...cases(onScreen),
          processLine,
          contactReveal,
          () => {
            stops.push(initLiveWindows(fine));
            if (fine) stops.push(hover());
          },
          () => stops.push(marquee()),
          () => stops.push(footerName(fine)),
        ];
        for (const task of tasks) {
          if (cancelled) return;
          ctx.add(task);
          await yieldToMain();
        }
      })();

      return () => {
        cancelled = true;
        stops.forEach((stop) => stop());
        document.documentElement.classList.remove("motion-on");
      };
    },
  );
}
