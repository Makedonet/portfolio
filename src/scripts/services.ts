// Блок «Что входит» (components/Services.astro, сцены — ServiceScene.astro).
// Услуги идут столбцом. Сцена проигрывается, когда её лист на экране, и остаётся
// на последнем кадре; ушла с экрана — при возвращении сыграет заново.
// Разметка сцен — последний кадр. Здесь ставится начало и движение к разметке;
// откат контекста motion.ts возвращает последний кадр.
// Вызывается только без «уменьшить движение»: иначе остаются последние кадры.
import { gsap } from "gsap";

const all = (root: ParentNode, selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];

const type = (root: ParentNode) => {
  const els = all(root, ".sc-type");
  gsap.set(els, { clipPath: "inset(-10% 100% -10% 0%)" });
  return els;
};
const typed = { clipPath: "inset(-10% 0% -10% 0%)", ease: "none" };

/** Каждая сцена — лента времени от начала к разметке. Длина любая: снаружи её
 *  приводят к нужной. */
const scenes: Record<string, (root: HTMLElement) => gsap.core.Timeline> = {
  // Вода зачёркивается, вместо неё — то, что нужно знать покупателю.
  texts(root) {
    const strikes = all(root, ".sc-strike");
    const lines = all(root, ".sc-line");
    const mark = all(root, ".sc-mark");
    gsap.set(strikes, { backgroundSize: "0% 0.12em", opacity: 1 });
    gsap.set(lines, { yPercent: 115 });
    gsap.set(mark, { backgroundSize: "0% 0.42em" });
    return gsap
      .timeline()
      .to(strikes, { backgroundSize: "100% 0.12em", duration: 0.7, stagger: 0.55, ease: "none" })
      .to(strikes, { opacity: 0.45, duration: 0.4 }, ">-0.2")
      .to(lines, { yPercent: 0, duration: 0.8, stagger: 0.25, ease: "power3.out" }, "<")
      .to(mark, { backgroundSize: "100% 0.42em", duration: 0.6, ease: "none" });
  },

  // Окно сужается от компьютера до телефона, страница перестраивается по-настоящему.
  design(root) {
    const device = all(root, ".sc-device")[0]!;
    const sizes = all(root, ".sc-sizes span");
    const proxy = { w: 31 };
    const draw = () => {
      device.style.width = `${proxy.w.toFixed(2)}em`;
      const step = proxy.w > 22 ? 0 : proxy.w > 14.5 ? 1 : 2;
      device.dataset.w = "lms"[step];
      sizes.forEach((size, i) => size.classList.toggle("is-on", i === step));
    };
    draw();
    return gsap
      .timeline()
      .to(proxy, { w: 19, duration: 1, ease: "power2.inOut", onUpdate: draw }, 0.25)
      .to(proxy, { w: 10.5, duration: 1, ease: "power2.inOut", onUpdate: draw }, 1.6)
      .to({}, { duration: 0.25 });
  },

  speed(root) {
    const ring = all(root, ".sc-gauge-value");
    const number = all(root, ".sc-gauge-number")[0]!;
    const value = { n: 0 };
    gsap.set(ring, { strokeDashoffset: 100 });
    number.textContent = "0";
    return gsap
      .timeline()
      .to(ring, { strokeDashoffset: 0, duration: 1, ease: "power2.out" }, 0)
      .to(value, { n: 100, duration: 1, ease: "power2.out", onUpdate: () => (number.textContent = String(Math.round(value.n))) }, 0);
  },

  // Заявку заполняют и отправляют, она приходит сообщением.
  leads(root) {
    const fields = type(root);
    const box = all(root, ".sc-box svg");
    const submit = all(root, ".sc-submit");
    const message = all(root, ".sc-message");
    gsap.set(box, { scale: 0 });
    gsap.set(message, { opacity: 0, y: 40, scale: 0.85 });
    return gsap
      .timeline()
      .to(fields[0]!, { ...typed, duration: 0.5 })
      .to(fields[1]!, { ...typed, duration: 0.9 }, "+=0.1")
      .to(box, { scale: 1, duration: 0.25, ease: "back.out(3)" }, "+=0.1")
      .to(submit, { scale: 0.94, duration: 0.12 }, "+=0.15")
      .to(submit, { scale: 1, duration: 0.2 })
      .to(message, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" }, "-=0.1");
  },

  // Разметка добавляет к строке в поиске адрес и часы, цели Метрики рисуют столбики.
  stats(root) {
    const rich = all(root, ".sc-rich span");
    const bars = all(root, ".sc-bars span");
    gsap.set(rich, { opacity: 0, y: 12 });
    gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%" });
    return gsap
      .timeline()
      .to(rich, { opacity: 1, y: 0, duration: 0.4, stagger: 0.25 })
      .to(bars, { scaleY: 1, duration: 0.6, stagger: 0.12, ease: "power3.out" }, 0.5);
  },

  // Адрес набран, замок закрылся, устройства проверены.
  launch(root) {
    const address = type(root);
    const shackle = all(root, ".sc-shackle");
    const checks = all(root, ".sc-check");
    gsap.set(shackle, { yPercent: -18, rotation: 14, transformOrigin: "85% 100%" });
    gsap.set(checks, { opacity: 0, y: 14 });
    return gsap
      .timeline()
      .to(address, { ...typed, duration: 0.9 })
      .to(shackle, { rotation: 0, duration: 0.3 }, "+=0.05")
      .to(shackle, { yPercent: 0, duration: 0.25, ease: "power4.in" })
      .to(checks, { opacity: 1, y: 0, duration: 0.3, stagger: 0.2 }, "+=0.1");
  },

  // Линия работы идёт, срывается, я узнаю первым, линия выправляется.
  care(root) {
    const [before, after] = all(root, ".sc-pulse-ok");
    const down = all(root, ".sc-pulse-down");
    const statusOk = all(root, ".sc-status-ok");
    const statusDown = all(root, ".sc-status-down");
    const alert = all(root, ".sc-alert");
    gsap.set([before!, after!, ...down], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(statusDown, { opacity: 0 });
    gsap.set(alert, { opacity: 0, y: 24, scale: 0.9 });
    return gsap
      .timeline()
      .to(before!, { strokeDashoffset: 0, duration: 1, ease: "none" })
      .to(statusOk, { opacity: 0, duration: 0.1 })
      .to(statusDown, { opacity: 1, duration: 0.1 }, "<")
      .to(down, { strokeDashoffset: 0, duration: 0.5, ease: "none" }, "<")
      .to(alert, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.8)" })
      .to(statusDown, { opacity: 0, duration: 0.1 }, "+=0.1")
      .to(statusOk, { opacity: 1, duration: 0.1 }, "<")
      .to(after!, { strokeDashoffset: 0, duration: 0.7, ease: "none" }, "<");
  },

  // Новый сайт стирает старый, адрес наверху не меняется.
  redesign(root) {
    const next = all(root, ".sc-new");
    const seam = all(root, ".sc-seam");
    gsap.set(next, { clipPath: "inset(0% 100% 0% 0%)" });
    gsap.set(seam, { left: "0%", opacity: 1 });
    return gsap
      .timeline()
      .to(next, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power1.inOut" }, 0.35)
      .to(seam, { left: "100%", duration: 1, ease: "power1.inOut" }, 0.35)
      .to(seam, { opacity: 0, duration: 0.1 });
  },

  // Прыгающий мяч, первое упражнение аниматора, только вместо мяча буханка.
  // Доли дуг и высоты — как в ServiceScene.astro. Высота дуг в процентах от
  // самой буханки (5 em), чтобы сцена не зависела от размера экрана.
  motion(root) {
    const ball = all(root, ".sc-ball")[0]!;
    const ghosts = all(root, ".sc-ghost");
    const size = 5;
    const up = (em: number) => (-100 * em) / size;
    gsap.set(ball, { xPercent: -500, yPercent: up(15), transformOrigin: "50% 100%" });
    gsap.set(ghosts, { opacity: 0 });
    const tl = gsap.timeline();
    tl.to(ball, { xPercent: 0, duration: 1, ease: "none" }, 0);
    // След остаётся в тот момент, когда буханка проходит это место.
    ghosts.forEach((ghost) => tl.to(ghost, { opacity: 1, duration: 0.01 }, Number(ghost.dataset.t)));
    tl.to(ball, { yPercent: 0, duration: 0.25, ease: "power2.in" }, 0);
    tl.to(ball, { yPercent: up(9), duration: 0.225, ease: "power2.out" }, 0.25);
    tl.to(ball, { yPercent: 0, duration: 0.225, ease: "power2.in" }, 0.475);
    tl.to(ball, { yPercent: up(4), duration: 0.15, ease: "power2.out" }, 0.7);
    tl.to(ball, { yPercent: 0, duration: 0.15, ease: "power2.in" }, 0.85);
    // Сплющивается в момент удара и тут же выпрямляется.
    [0.25, 0.7, 1].forEach((at) => {
      tl.to(ball, { scaleY: 0.68, scaleX: 1.22, duration: 0.025, ease: "none" }, at - 0.025);
      tl.to(ball, { scaleY: 1, scaleX: 1, duration: 0.05, ease: "power2.out" }, at);
    });
    return tl;
  },
};

const sceneOf = (item: HTMLElement) => {
  const root = item.querySelector<HTMLElement>("[data-scene]")!;
  const name = [...root.classList].find((c) => c.startsWith("scene-") && c !== "scene-canvas")!.slice("scene-".length);
  return scenes[name]!(root);
};

/** Сцена «Дизайн» пишет ширину и размер окна напрямую: откат их не знает. */
function resetDesign(root: HTMLElement) {
  all(root, ".sc-device").forEach((device) => {
    device.style.removeProperty("width");
    device.dataset.w = "s";
  });
  all(root, ".sc-sizes span").forEach((size, i, sizes) => size.classList.toggle("is-on", i === sizes.length - 1));
  all(root, ".sc-gauge-number").forEach((number) => (number.textContent = "100"));
}

export function initServices(): () => void {
  const root = document.querySelector<HTMLElement>("[data-services]");
  if (!root) return () => {};
  const timelines = new Map(
    all(root, "[data-service]").map((item) => [item.querySelector("[data-service-sheet]")!, sceneOf(item).duration(3).pause()]),
  );
  // Порог такой, чтобы первая сцена заиграла при открытии страницы и на низком
  // ноутбуке: при окне 640 px над краем видно меньше половины листа.
  const start = 0.4;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const tl = timelines.get(entry.target);
        if (!tl) return;
        // false: перемотка должна вызвать onUpdate, им сцены рисуют ширину и число.
        if (!entry.isIntersecting) tl.pause(0, false);
        else if (entry.intersectionRatio >= start) tl.play();
      });
    },
    { threshold: [0, start] },
  );
  timelines.forEach((_tl, sheet) => observer.observe(sheet));
  return () => {
    observer.disconnect();
    resetDesign(root);
  };
}
