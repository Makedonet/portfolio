// Ролики шагов в блоке «Как работаю» (components/Process.astro): один кадр и
// пять серий, в которых один сайт проходит путь от разговора до запуска.
// - Серия доиграла — включается следующая, после последней снова первая.
//   Линия у идущего шага заполняется вслед за роликом.
// - Нажатие на шаг сразу показывает его серию.
// - Файл качается, когда кадр подходит к экрану; до того виден постер.
// - Играет, только пока кадр на экране; вернулся на экран — серия с начала.
// - Кнопка останавливает ролик: автодвижение дольше пяти секунд должно
//   останавливаться (WCAG 2.2.2). С «экономией трафика» ролик сам не запускается,
//   но кнопка его запустит.
// animate = false — «уменьшить движение»: только постеры, их меняет нажатие на шаг.

type Clip = { root: HTMLElement; video: HTMLVideoElement; loaded: boolean };

export function initClips(animate: boolean): () => void {
  const frame = document.querySelector<HTMLElement>("[data-clip-frame]");
  if (!frame) return () => {};
  const clips: Clip[] = [...frame.querySelectorAll<HTMLElement>("[data-clip]")].map((root) => ({
    root,
    video: root.querySelector("video")!,
    loaded: false,
  }));
  const steps = [...document.querySelectorAll<HTMLElement>("[data-step]")];
  const stepButtons = steps.map((step) => step.querySelector<HTMLButtonElement>("[data-step-button]")!);

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let paused = Boolean(connection?.saveData);
  let visible = false;
  let current = 0;

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
    sync();
  };

  const clicks = stepButtons.map((button, i) => {
    const onClick = () => show(i);
    button.addEventListener("click", onClick);
    return () => button.removeEventListener("click", onClick);
  });
  if (!animate) return () => clicks.forEach((stop) => stop());

  const toggleButton = frame.querySelector<HTMLButtonElement>("[data-clip-toggle]")!;
  const drawButton = () => {
    const label = paused ? toggleButton.dataset.labelPlay : toggleButton.dataset.labelPause;
    if (label) toggleButton.setAttribute("aria-label", label);
    toggleButton.querySelector(".clip-pause")?.classList.toggle("hidden", paused);
    toggleButton.querySelector(".clip-play")?.classList.toggle("hidden", !paused);
  };
  drawButton();
  const toggle = () => {
    paused = !paused;
    drawButton();
    sync();
  };
  toggleButton.addEventListener("click", toggle);

  // Ролик проявляется над постером, когда пошли кадры.
  const reveal = (event: Event) => (event.target as HTMLVideoElement).classList.add("is-playing");
  const advance = () => show((current + 1) % clips.length);
  const track = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    if (video === clips[current]!.video && video.duration) steps[current]?.style.setProperty("--p", String(video.currentTime / video.duration));
  };
  clips.forEach(({ video }) => {
    video.addEventListener("playing", reveal);
    video.addEventListener("ended", advance);
    video.addEventListener("timeupdate", track);
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
    clicks.forEach((stop) => stop());
    toggleButton.removeEventListener("click", toggle);
    clips.forEach(({ video }) => {
      video.removeEventListener("playing", reveal);
      video.removeEventListener("ended", advance);
      video.removeEventListener("timeupdate", track);
      video.pause();
    });
  };
}
