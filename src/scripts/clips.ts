// Ролики шагов в блоке «Как работаю» (components/Process.astro): один кадр и
// пять серий, в которых один сайт проходит путь от разговора до запуска.
// - Серия доиграла — включается следующая, после последней снова первая.
//   Линия у идущего шага заполняется вслед за роликом.
// - Шаг выбирают нажатием на строку, кнопками под кадром и свайпом по кадру.
//   Выбор снимает с паузы: человек попросил показать.
// - Файл качается, когда кадр подходит к экрану; до того виден постер.
// - Играет, только пока кадр на экране; вернулся на экран — серия с начала.
// - Кнопка останавливает ролик: автодвижение дольше пяти секунд должно
//   останавливаться (WCAG 2.2.2). С «экономией трафика» ролик сам не запускается.
// animate = false — «уменьшить движение»: только постеры, их меняет выбор шага.

type Clip = { root: HTMLElement; video: HTMLVideoElement; loaded: boolean };

export function initClips(animate: boolean): () => void {
  const root = document.querySelector<HTMLElement>("[data-steps]");
  const frame = root?.querySelector<HTMLElement>("[data-clip-frame]");
  if (!root || !frame) return () => {};
  const clips: Clip[] = [...frame.querySelectorAll<HTMLElement>("[data-clip]")].map((el) => ({
    root: el,
    video: el.querySelector("video")!,
    loaded: false,
  }));
  const steps = [...root.querySelectorAll<HTMLElement>("[data-step]")];
  const stepButtons = steps.map((step) => step.querySelector<HTMLButtonElement>("[data-step-button]")!);
  const names = steps.map((step) => step.querySelector(".step-title")?.textContent ?? "");
  const count = root.querySelector("[data-clip-count]");
  const name = root.querySelector("[data-clip-name]");
  const toggleButton = root.querySelector<HTMLButtonElement>("[data-clip-toggle]")!;

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let paused = Boolean(connection?.saveData);
  let visible = false;
  let current = 0;

  const stops: Array<() => void> = [];
  const on = <E extends Event>(target: EventTarget, type: string, listener: (event: E) => void) => {
    target.addEventListener(type, listener as EventListener);
    stops.push(() => target.removeEventListener(type, listener as EventListener));
  };

  const load = (clip: Clip) => {
    if (clip.loaded) return;
    clip.loaded = true;
    clip.video.querySelectorAll("source").forEach((source) => {
      source.src = source.dataset.src!;
    });
    clip.video.preload = "auto";
    clip.video.load();
  };

  const sync = () => {
    const clip = clips[current]!;
    if (animate && visible && !paused) {
      load(clip);
      // Следующая серия качается заранее, чтобы смена шла без паузы на постере.
      load(clips[(current + 1) % clips.length]!);
      // Автозапуск могут запретить (режим энергосбережения): тогда останется постер.
      clip.video.play().catch(() => {});
    } else clip.video.pause();
  };

  const show = (index: number) => {
    clips[current]!.video.pause();
    current = index;
    const { video } = clips[index]!;
    if (video.currentTime > 0) video.currentTime = 0;
    clips.forEach((clip, i) => clip.root.classList.toggle("is-current", i === index));
    steps.forEach((step, i) => {
      step.classList.toggle("is-current", i === index);
      step.classList.toggle("is-done", i < index);
      step.style.setProperty("--p", "0");
    });
    stepButtons.forEach((button, i) => (i === index ? button.setAttribute("aria-current", "step") : button.removeAttribute("aria-current")));
    if (count) count.textContent = String(index + 1);
    if (name) name.textContent = names[index] ?? "";
    sync();
  };

  const drawButton = () => {
    const label = paused ? toggleButton.dataset.labelPlay : toggleButton.dataset.labelPause;
    if (label) toggleButton.setAttribute("aria-label", label);
    toggleButton.querySelector(".clip-pause")?.classList.toggle("hidden", paused);
    toggleButton.querySelector(".clip-play")?.classList.toggle("hidden", !paused);
    root.classList.toggle("is-paused", paused);
  };
  drawButton();

  const pick = (index: number) => {
    paused = false;
    drawButton();
    show((index + clips.length) % clips.length);
  };
  stepButtons.forEach((button, i) => on(button, "click", () => pick(i)));
  on(root.querySelector("[data-clip-prev]")!, "click", () => pick(current - 1));
  on(root.querySelector("[data-clip-next]")!, "click", () => pick(current + 1));

  // Свайп по кадру. Вертикальный забирает браузер (touch-action: pan-y) и шлёт
  // pointercancel, поэтому прокрутку это не трогает.
  let swipe: { x: number; y: number } | null = null;
  on<PointerEvent>(frame, "pointerdown", (event) => {
    swipe = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null;
  });
  on(frame, "pointercancel", () => {
    swipe = null;
  });
  on<PointerEvent>(frame, "pointerup", (event) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) pick(current + (dx < 0 ? 1 : -1));
  });

  if (!animate) return () => stops.forEach((stop) => stop());

  on(toggleButton, "click", () => {
    paused = !paused;
    drawButton();
    sync();
  });

  clips.forEach(({ video }) => {
    // Ролик проявляется над постером, когда пошли кадры.
    on(video, "playing", () => video.classList.add("is-playing"));
    on(video, "ended", () => show((current + 1) % clips.length));
    on(video, "timeupdate", () => {
      if (video === clips[current]!.video && video.duration) steps[current]?.style.setProperty("--p", String(video.currentTime / video.duration));
    });
  });

  const near = new IntersectionObserver(
    (entries) => {
      if (paused || !entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load(clips[current]!);
    },
    { rootMargin: "600px 0px" },
  );
  // Половина кадра на экране — смотрят. Ушёл совсем — следующий показ с начала серии.
  const seen = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      visible = entry.intersectionRatio >= 0.5;
      if (visible) root.classList.add("is-seen");
      const { video } = clips[current]!;
      if (entry.intersectionRatio === 0 && video.currentTime > 0) video.currentTime = 0;
      sync();
    },
    { threshold: [0, 0.5] },
  );
  near.observe(frame);
  seen.observe(frame);

  return () => {
    near.disconnect();
    seen.disconnect();
    stops.forEach((stop) => stop());
    clips.forEach(({ video }) => video.pause());
  };
}
