// @ts-check
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { transformSync } from "esbuild";

// Адрес сайта нужен для canonical, og:url и sitemap. Своего домена пока нет,
// поэтому на Vercel берём продакшен-адрес проекта: Vercel кладёт его в
// VERCEL_PROJECT_PRODUCTION_URL при каждой сборке (свой домен, когда он
// подключён, иначе *.vercel.app). SITE_URL перебивает его вручную.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:4321");

// Комментарии в коде — рабочий контекст, но Astro не трогает тело
// <script is:inline>, и в «исходном коде страницы» они лежали как есть. Эта
// интеграция вычищает их из готовой сборки, как на сайтах шиномонтажа и мойки.
// Хук astro:build:done работает только при сборке: в `npm run dev` они на месте.
//
// - HTML-комментарии удаляются, кроме условных <!--[if …]>.
// - Встроенные скрипты проходят через esbuild: он снимает комментарии и пробелы,
//   а синтаксис оставляет как написан (target не задан).
// - JSON-LD, <style>, <pre> и <textarea> не трогаются. В стилях остаётся одна
//   строка — лицензия Tailwind, её положено сохранять.
function stripComments() {
  // Один проход с альтернативой, а не два отдельных: что началось раньше, то
  // и поглощается целиком. Комментарий, где упомянут тег <style>, остаётся
  // комментарием, строка «<!--» внутри скрипта — скриптом.
  const TOKEN = /<!--[\s\S]*?-->|<(script|style|pre|textarea)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;

  const isInlineJs = (/** @type {string} */ attrs) => {
    if (/(?:^|\s)src\s*=/i.test(attrs)) return false;
    const type = attrs.match(/(?:^|\s)type\s*=\s*["']?([^"'\s>]+)/i)?.[1].toLowerCase();
    return !type || type === "text/javascript" || type === "module";
  };

  const clean = (/** @type {string} */ html, /** @type {string} */ file) =>
    html.replace(TOKEN, (match, tag, attrs, body) => {
      if (match.startsWith("<!--")) return match.startsWith("<!--[if") ? match : "";
      if (tag.toLowerCase() !== "script" || !isInlineJs(attrs) || !body.trim()) return match;
      try {
        const { code } = transformSync(body, { loader: "js", minifyWhitespace: true });
        return `<${tag}${attrs}>${code.trim()}</${tag}>`;
      } catch (error) {
        throw new Error(`strip-comments: не разобрался встроенный скрипт в ${file}`, { cause: error });
      }
    });

  // Без комментариев и тел <script>, <style>, <pre> и <textarea> документ до и
  // после чистки обязан совпасть байт в байт; иначе сборка падает.
  const markup = (/** @type {string} */ html) =>
    html.replace(TOKEN, (match, tag, attrs) =>
      match.startsWith("<!--") ? (match.startsWith("<!--[if") ? match : "") : `<${tag}${attrs}></${tag}>`,
    );

  /** @returns {Promise<string[]>} */
  const walk = async (/** @type {string} */ dir) => {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(path)));
      else if (entry.name.endsWith(".html")) files.push(path);
    }
    return files;
  };

  /** @type {import("astro").AstroIntegration} */
  const integration = {
    name: "strip-comments",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let before = 0;
        let after = 0;
        for (const file of await walk(root)) {
          const source = await readFile(file, "utf8");
          const result = clean(source, file);
          if (markup(result) !== markup(source)) {
            throw new Error(
              `strip-comments: чистка задела разметку в ${file}. ` +
                "Сборка остановлена — такой файл на прод уезжать не должен.",
            );
          }
          before += Buffer.byteLength(source);
          after += Buffer.byteLength(result);
          if (result !== source) await writeFile(file, result);
        }
        logger.info(`комментарии вычищены: ${((before - after) / 1024).toFixed(1)} КБ, разметка не задета`);
      },
    },
  };
  return integration;
}

export default defineConfig({
  site,

  integrations: [stripComments()],

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
      // Текст, кнопки, подписи. Файлы лежат в проекте и обрезаны под сайт
      // (tools/fonts.py), посетитель не ходит ни к Google, ни к CDN.
      provider: fontProviders.local(),
      name: "Sofia Sans",
      cssVariable: "--font-sofia",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [{ weight: "400 800", style: "normal", src: ["./src/assets/fonts/sofia-sans.woff2"] }],
      },
    },
    {
      // Заголовки и крупные цифры. Насыщенность от 300 нужна имени в подвале.
      provider: fontProviders.local(),
      name: "Sofia Sans Extra Condensed",
      cssVariable: "--font-sofia-condensed",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [{ weight: "300 900", style: "normal", src: ["./src/assets/fonts/sofia-sans-extra-condensed.woff2"] }],
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
