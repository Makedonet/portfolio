// Картинки, которые не нужны к первой отрисовке: адреса лежат в data-srcset
// и data-src (у <img> и у <source> в его <picture>), скрипт подставляет их,
// когда картинка понадобится. Используют «живые окна» и визитка.

/** Подставляет srcset из data-атрибутов и ждёт, пока картинка декодируется. */
export function load(img: HTMLImageElement): Promise<void> {
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
