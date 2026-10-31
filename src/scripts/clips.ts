// Ролики шагов в блоке «Как работаю» (components/Process.astro).
// - Файл качается, когда ролик подходит к экрану; до того виден постер.
// - Играет, только пока ролик на экране; вернулся на экран — история с начала.
// - Кнопка останавливает все ролики блока: автодвижение дольше пяти секунд
//   должно останавливаться (WCAG 2.2.2). С «экономией трафика» ролики сами не
//   запускаются, но кнопка их запустит.
// Вызывается только без «уменьшить движение»: иначе остаются постеры.

type Clip = { root: HTMLElement; video: HTMLVideoElement; visible: boolean; loaded: boolean };

export function initClips(): () => void {
  const clips: Clip[] = [...document.querySelectorAll<HTMLElement>("[data-clip]")].map((root) => ({
    root,
    video: root.querySelector("video")!,
    visible: false,
    loaded: false,
  }));
  if (!clips.length) return () => {};

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let paused = Boolean(connection?.saveData);

  const load = (clip: Clip) => {
    if (clip.loaded) return;
    clip.loaded = true;
    clip.video.querySelectorAll("source").forEach((source) => {
      source.src = source.dataset.src!;
    });
    clip.video.load();
  };

  const sync = (clip: Clip) => {
    if (clip.visible && !paused) {
      load(clip);
      // Автозапуск могут запретить (режим энергосбережения): тогда останется постер.
      clip.video.play().catch(() => {});
    } else clip.video.pause();
  };

  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-clip-toggle]")];
  const drawButtons = () =>
    buttons.forEach((button) => {
      const label = paused ? button.dataset.labelPlay : button.dataset.labelPause;
      if (label) button.setAttribute("aria-label", label);
      button.querySelector(".clip-pause")?.classList.toggle("hidden", paused);
      button.querySelector(".clip-play")?.classList.toggle("hidden", !paused);
    });
  drawButtons();
  const toggle = () => {
    paused = !paused;
    drawButtons();
    clips.forEach(sync);
  };
  buttons.forEach((button) => button.addEventListener("click", toggle));

  // Ролик проявляется над постером, когда пошли кадры.
  const reveal = (event: Event) => (event.target as HTMLVideoElement).classList.add("is-playing");
  clips.forEach((clip) => clip.video.addEventListener("playing", reveal));

  const near = new IntersectionObserver(
    (entries) => {
      if (paused) return;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        near.unobserve(entry.target);
        const clip = clips.find((c) => c.root === entry.target);
        if (clip) load(clip);
      });
    },
    { rootMargin: "600px 0px" },
  );
  // Половина ролика в кадре — смотрят. Ушёл совсем — следующий показ с начала.
  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const clip = clips.find((c) => c.root === entry.target);
        if (!clip) return;
        clip.visible = entry.intersectionRatio >= 0.5;
        if (entry.intersectionRatio === 0 && clip.video.currentTime > 0) clip.video.currentTime = 0;
        sync(clip);
      });
    },
    { threshold: [0, 0.5] },
  );
  clips.forEach((clip) => {
    near.observe(clip.root);
    seen.observe(clip.root);
  });

  return () => {
    near.disconnect();
    seen.disconnect();
    buttons.forEach((button) => button.removeEventListener("click", toggle));
    clips.forEach((clip) => {
      clip.video.removeEventListener("playing", reveal);
      clip.video.pause();
    });
  };
}
