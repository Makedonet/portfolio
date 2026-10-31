// Контактный лист: кадры ролика на одном изображении, чтобы проверить его глазами.
// node sheet.mjs step-1-talk 0.5,2,4,6,8,10 [папка]
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const [id, times, dir = "out/sheets"] = process.argv.slice(2);
const FPS = 30;
const frames = times.split(",").map((s) => Math.round(Number(s) * FPS));
const tmp = join(dir, `${id}-frames`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
execFileSync("npx", ["remotion", "render", id, tmp, `--frames=${frames.join(",")}`, "--image-format=jpeg", "--scale=0.5", "--log=error"], { stdio: "inherit" });
const files = readdirSync(tmp).sort().map((f) => join(tmp, f));
const cols = 3;
const rows = Math.ceil(files.length / cols);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `${files.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${files.length}:grid=${cols}x${rows}:fill=gray`, "-frames:v", "1", join(dir, `${id}.jpg`)]);
console.log(join(dir, `${id}.jpg`));
