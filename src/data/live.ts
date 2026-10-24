// Кадры «живых окон»: длинный снимок страницы, постер первого экрана и полоса
// шапки в прокрученном состоянии. Размеры, высота шапки и остановки «видео»
// (верхние края секций под шапкой) лежат в live.json — его пишет скрипт
// съёмки, руками там ничего не правится. Координаты — в CSS-пикселях снимка:
// компьютер снят на 1440×900, телефон — на 390×844 с DPR 2.
import type { ImageMetadata } from "astro";
import manifest from "./live.json";

type Entry = {
  url: string;
  device: "desktop" | "mobile";
  width: number;
  height: number;
  header: number;
  strip: number;
  stops: number[];
};

export type Scene = Entry & {
  id: string;
  page: ImageMetadata;
  poster: ImageMetadata;
  headerImage?: ImageMetadata;
};

type Module = { default: ImageMetadata };
const pages = import.meta.glob<Module>("../assets/live/*.jpg", { eager: true });
const posters = import.meta.glob<Module>("../assets/live/posters/*.jpg", { eager: true });
const headers = import.meta.glob<Module>("../assets/live/headers/*.jpg", { eager: true });

export function scene(id: string): Scene {
  const entry = (manifest as Record<string, Entry>)[id];
  const page = pages[`../assets/live/${id}.jpg`]?.default;
  const poster = posters[`../assets/live/posters/${id}.jpg`]?.default;
  if (!entry || !page || !poster) throw new Error(`live: нет кадра «${id}» — снимите его скриптом съёмки`);
  return { ...entry, id, page, poster, headerImage: headers[`../assets/live/headers/${id}.jpg`]?.default };
}

/** Высота экрана окна в CSS-пикселях снимка. */
export const viewportHeight = (device: Scene["device"]) => (device === "desktop" ? 900 : 844);
