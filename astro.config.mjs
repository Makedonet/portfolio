// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Адрес сайта нужен для canonical, og:url и sitemap. Своего домена пока нет,
// поэтому на Vercel берём продакшен-адрес проекта: Vercel кладёт его в
// VERCEL_PROJECT_PRODUCTION_URL при каждой сборке (свой домен, когда он
// подключён, иначе *.vercel.app). SITE_URL перебивает его вручную.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:4321");

// Шрифты — вариативные файлы из установленных пакетов @fontsource-variable:
// они уезжают в сборку, посетитель не ходит ни к Google, ни к CDN. Латиница и
// кириллица — отдельными файлами, браузер качает только нужный набор.
/** @type {[string, ...string[]]} */
const LATIN = [
  "U+0000-00FF", "U+0131", "U+0152-0153", "U+02BB-02BC", "U+02C6", "U+02DA", "U+02DC",
  "U+0304", "U+0308", "U+0329", "U+2000-206F", "U+20AC", "U+2122", "U+2191", "U+2193",
  "U+2212", "U+2215", "U+FEFF", "U+FFFD",
];
/** @type {[string, ...string[]]} */
const CYRILLIC = ["U+0301", "U+0400-045F", "U+0490-0491", "U+04B0-04B1", "U+2116"];

export default defineConfig({
  site,

  build: {
    // Стили небольшие: отдельный CSS-файл был бы лишним запросом до первой
    // отрисовки — и на главной, и на странице кейса, куда приходят из поиска.
    inlineStylesheets: "always",
  },

  image: {
    // Картинки размечены Tailwind; адаптивные стили Astro живут вне cascade
    // layers и перебивали бы его.
    responsiveStyles: false,
  },

  fonts: [
    {
      // Onest — гротеск, нарисованный под кириллицу: им набрано всё.
      provider: fontProviders.local(),
      name: "Onest",
      cssVariable: "--font-onest",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["@fontsource-variable/onest/files/onest-latin-wght-normal.woff2"],
            unicodeRange: LATIN,
          },
          {
            weight: "100 900",
            style: "normal",
            src: ["@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2"],
            unicodeRange: CYRILLIC,
          },
        ],
      },
    },
    {
      // JetBrains Mono — только подписи и цифры. У него нет 900, отсюда 800.
      // Фолбэки без Courier New: пока шрифт едет, мелькала бы печатная машинка.
      provider: fontProviders.local(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains",
      fallbacks: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            weight: "100 800",
            style: "normal",
            src: ["@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"],
            unicodeRange: LATIN,
          },
          {
            weight: "100 800",
            style: "normal",
            src: ["@fontsource-variable/jetbrains-mono/files/jetbrains-mono-cyrillic-wght-normal.woff2"],
            unicodeRange: CYRILLIC,
          },
        ],
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
