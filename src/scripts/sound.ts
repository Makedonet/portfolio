// Звуки при нажатиях: синтез WebAudio, без звуковых файлов. Щелчок — на
// любой ссылке и кнопке, свой звук — у переворота визитки и у наклеек
// (data-sound="flip" | "pop", "none" — без звука). Кнопка в шапке
// ([data-sound-toggle]) выключает звук, выбор помнится в localStorage.
// AudioContext создаётся при первом нажатии: раньше браузер его не пустит.

export type Sound = "tick" | "flip" | "pop" | "on" | "whoosh";

const KEY = "sound";
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = read() !== "off";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(value: string) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Приватный режим или запрет хранилища: выбор просто не запомнится.
  }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    ctx = new Context();
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = Math.floor(c.sampleRate * 0.4);
    noiseBuffer = c.createBuffer(1, length, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Тон с быстрой атакой и затуханием; to — куда съезжает высота. */
function tone(c: AudioContext, at: number, freq: number, duration: number, gain: number, to?: number) {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(out!);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Шум через полосовой фильтр, частота едет from → to: щелчок или шорох. */
function hiss(c: AudioContext, at: number, duration: number, from: number, to: number, gain: number, q = 1) {
  const source = c.createBufferSource();
  source.buffer = noise(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + duration);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.012, duration * 0.3));
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(env).connect(out!);
  source.start(at);
  source.stop(at + duration + 0.02);
}

export function play(kind: Sound) {
  if (!enabled) return;
  const c = audio();
  if (!c || !out) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case "tick":
      hiss(c, t, 0.03, 3400, 2200, 0.5, 2.5);
      tone(c, t, 210, 0.05, 0.12, 120);
      break;
    case "flip":
      hiss(c, t, 0.26, 450, 3200, 0.3, 0.8);
      hiss(c, t + 0.24, 0.04, 2600, 1600, 0.45, 3);
      break;
    case "pop":
      tone(c, t, 720, 0.12, 0.28, 190);
      break;
    case "on":
      tone(c, t, 660, 0.08, 0.16);
      tone(c, t + 0.08, 990, 0.1, 0.16);
      break;
    case "whoosh":
      hiss(c, t, 0.32, 280, 1500, 0.22, 0.7);
      break;
  }
}

export function initSound(): () => void {
  const toggles = [...document.querySelectorAll<HTMLButtonElement>("[data-sound-toggle]")];
  const sync = () => toggles.forEach((b) => b.setAttribute("aria-pressed", String(enabled)));
  sync();

  // Перехват на всплытии не годится: ссылка в новой вкладке уводит фокус
  // раньше — слушаем на погружении.
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const el = target?.closest<HTMLElement>("a[href], button, [data-sound]");
    if (!el || el.matches("[data-sound-toggle]")) return;
    const kind = el.dataset.sound;
    if (kind === "none") return;
    play((kind as Sound | undefined) || "tick");
  };
  const onToggle = () => {
    enabled = !enabled;
    write(enabled ? "on" : "off");
    sync();
    play("on");
  };
  document.addEventListener("click", onClick, true);
  toggles.forEach((b) => b.addEventListener("click", onToggle));
  return () => {
    document.removeEventListener("click", onClick, true);
    toggles.forEach((b) => b.removeEventListener("click", onToggle));
  };
}
