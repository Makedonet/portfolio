// Точка входа страницы. Сразу — только то, что нужно с первого нажатия:
// звук и копирование номера. Анимации (GSAP и всё, что на нём) приезжают
// отдельными файлами после загрузки, в свободное время и по частям: большой
// скрипт, скачанный раньше, чем разобрана разметка, задерживал бы первую
// отрисовку, а его разбор одним куском — отклик на первое касание.
import { initSound } from "./sound";
import { initCopy } from "./copy";

initSound();
initCopy();

const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function loadMotion() {
  // Ядро GSAP и плагины — каждый своей задачей, затем сценарий страницы.
  await import("gsap");
  await pause();
  await import("gsap/ScrollTrigger");
  await pause();
  await import("gsap/SplitText");
  await pause();
  const { init } = await import("./motion");
  await pause();
  init();
}

if (document.readyState === "complete") idle(loadMotion);
else addEventListener("load", () => idle(loadMotion), { once: true });
