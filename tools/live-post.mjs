// Постобработка кадров «живых окон» после tools/capture-live.mjs:
// - постер первого экрана — им окно показывается до загрузки длинного кадра;
// - полоса шапки для кадров без неё (снятых не скриптом, а, например, из PDF);
// - остановки «видео»: под шапкой, которая видна при прокрутке, и без пропусков
//   длиннее 1.25 экрана — иначе «видео» пролетало бы полстраницы за раз.
//   node tools/live-post.mjs
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = "src/assets/live";
const manifestPath = "src/data/live.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await mkdir(join(dir, "posters"), { recursive: true });
await mkdir(join(dir, "headers"), { recursive: true });

for (const [id, e] of Object.entries(manifest)) {
  const scale = e.device === "mobile" ? 2 : 1; // телефон снят с DPR 2
  const vh = e.device === "mobile" ? 844 : 900;
  const file = join(dir, `${id}.jpg`);

  if (e.strip === undefined) {
    e.strip = e.header;
    if (e.header > 0) {
      await sharp(file)
        .extract({ left: 0, top: 0, width: e.width * scale, height: e.header * scale })
        .jpeg({ quality: 90 })
        .toFile(join(dir, "headers", `${id}.jpg`));
    }
  }

  await sharp(file)
    .extract({ left: 0, top: 0, width: e.width * scale, height: vh * scale })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(join(dir, "posters", `${id}.jpg`));

  e.rawStops ??= e.stops;
  const cover = Math.max(0, e.strip - e.header);
  const max = e.height - vh;
  const base = e.rawStops.map((s) => Math.min(max, Math.max(0, s - cover)));
  const stops = [];
  let prev = 0;
  for (const s of [...base, max]) {
    const gap = s - prev;
    if (gap > vh * 1.25) {
      const n = Math.ceil(gap / vh);
      for (let k = 1; k < n; k++) stops.push(Math.round(prev + (gap * k) / n));
    }
    if (gap >= vh * 0.35) stops.push(Math.round(s));
    prev = s;
  }
  e.stops = [...new Set(stops)].filter((s) => s > 0 && s <= max);
  console.log(`${id}: остановки ${e.stops.join(", ")}`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
