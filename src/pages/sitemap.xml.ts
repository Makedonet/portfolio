import type { APIRoute } from "astro";
import { caseUrl, works } from "../data/works";

// Главная и страницы кейсов, без интеграции @astrojs/sitemap. lastmod не
// пишем: честной даты изменения у страниц нет, а дата сборки на каждом
// деплое приучает поисковики игнорировать этот сигнал.
export const GET: APIRoute = ({ site }) => {
  const urls = ["/", ...works.map((work) => caseUrl(work.id))].map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
