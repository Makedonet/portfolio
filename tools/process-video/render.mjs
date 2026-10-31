// Рендер роликов для блока «Как работаю»: node render.mjs [id ...]
// Кладёт в src/assets/process/ два кодека и кадр-постер. AV1 раза в два легче,
// H.264 - для браузеров без AV1 (старые iPhone).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = "../../src/assets/process";
const TMP = "out/master";
// Постер - самый говорящий кадр ролика, он виден до загрузки и при «уменьшить движение».
const STEPS = {
  "step-1-talk": 9.0,
  "step-2-plan": 8.8,
  "step-3-design": 9.0,
  "step-4-build": 9.6,
  "step-5-launch": 9.4,
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STEPS);
const FPS = 30;
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

for (const id of ids) {
  const master = join(TMP, `${id}.mp4`);
  run("npx", ["remotion", "render", id, master, "--scale=1.2", "--codec=h264", "--crf=12", "--color-space=bt709", "--log=error"]);
  const color = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart"];
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", master, "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-crf", "27", ...color, join(OUT, `${id}.h264.mp4`)]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", master, "-c:v", "libsvtav1", "-preset", "4", "-crf", "42", "-svtav1-params", "tune=0", ...color, join(OUT, `${id}.av1.mp4`)]);
  const poster = join(OUT, `${id}.png`);
  rmSync(poster, { force: true });
  run("npx", ["remotion", "still", id, poster, `--frame=${Math.round(STEPS[id] * FPS)}`, "--scale=1.2", "--log=error"]);
  const kb = (f) => Math.round(statSync(join(OUT, f)).size / 1024);
  console.log(id, "h264", kb(`${id}.h264.mp4`), "KB, av1", kb(`${id}.av1.mp4`), "KB");
}
