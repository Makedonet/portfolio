// Общее для всех пяти роликов: токены сайта (global.css), шрифты, движение и
// детали, которые повторяются: окно браузера, телефон, наклейка, знак-ключ.
import { loadFont } from "@remotion/fonts";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import React from "react";
import { Easing, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const c = {
  paper: "#f3f2ec",
  surface: "#ffffff",
  ink: "#111110",
  ink2: "#262624",
  muted: "#5c5b55",
  mutedDark: "#a3a29b",
  line: "#dedcd3",
  lineDark: "#2e2e2b",
  accent: "#ffd43b",
  ok: "#1f9d55",
};

export const sans = '"Sofia Sans", sans-serif';
export const display = '"Sofia Sans Extra Condensed", sans-serif';
export const { fontFamily: mono } = loadMono("normal", { weights: ["500"], subsets: ["latin", "cyrillic"] });

loadFont({ family: "Sofia Sans", url: staticFile("sofia-sans.woff2"), weight: "400 800" });
loadFont({ family: "Sofia Sans Extra Condensed", url: staticFile("sofia-sans-extra-condensed.woff2"), weight: "300 900" });

// Те же кривые, что у сайта: --ease-out-expo и плавный разгон-торможение.
export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const back = Easing.bezier(0.34, 1.56, 0.64, 1);
export const accel = Easing.bezier(0.55, 0, 1, 0.45);

/** Время ролика в секундах. */
export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** 0..1 между двумя моментами времени. */
export const r = (t: number, from: number, to: number, ease: (n: number) => number = expo) => {
  if (t <= from) return 0;
  if (t >= to) return 1;
  return ease((t - from) / (to - from));
};

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** Пружина с перелётом для всего, что «приклеивается». */
export const useSpringAt = (start: number, damping = 13, stiffness = 170) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start * fps, fps, config: { damping, stiffness, mass: 0.8 } });
};

/** Линия, которая прорисовывается. d — путь SVG, p — сколько нарисовано. */
export const Draw: React.FC<{
  d: string;
  p: number;
  color?: string;
  width?: number;
  fill?: string;
  dash?: string;
}> = ({ d, p, color = c.ink, width = 5, fill = "none", dash }) => {
  if (p <= 0) return null;
  return (
    <path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={dash ?? `${p} ${1.01}`}
    />
  );
};

/** Маркер под словом, как .marker на сайте: заливка проводится слева направо. */
export const Marker: React.FC<{ p: number; children: React.ReactNode; color?: string }> = ({ p, children, color = c.accent }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "0 86%",
      backgroundSize: `${p * 100}% 0.42em`,
      paddingInline: "0.06em",
      marginInline: "-0.06em",
    }}
  >
    {children}
  </span>
);

/** Галочка в кружке: кружок выскакивает, линия галочки дорисовывается. */
export const Check: React.FC<{ at: number; t: number; size?: number; bg?: string; fg?: string }> = ({
  at,
  t,
  size = 64,
  bg = c.accent,
  fg = c.ink,
}) => {
  const pop = useSpringAt(at);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ scale: `${pop}`, flex: "none", display: "block" }}>
      <circle cx="32" cy="32" r="32" fill={bg} />
      <Draw d="M18 33 L28 43 L47 22" p={r(t, at + 0.1, at + 0.45)} color={fg} width={7} />
    </svg>
  );
};

/** Наклейка, как на первом экране сайта: белая бумага, толстая чёрная рамка. */
export const Sticker: React.FC<{
  at: number;
  out?: number;
  rotate?: number;
  x: number;
  y: number;
  t: number;
  bg?: string;
  size?: number;
  children: React.ReactNode;
}> = ({ at, out = 1e9, rotate = -4, x, y, t, bg = c.accent, size = 58, children }) => {
  const pop = useSpringAt(at, 11, 190);
  const gone = r(t, out, out + 0.3, accel);
  if (t < at || gone >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "12px 26px 14px",
        background: bg,
        color: c.ink,
        border: `5px solid ${c.ink}`,
        borderRadius: 18,
        boxShadow: `6px 7px 0 ${c.ink}`,
        fontFamily: display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        rotate: `${rotate + gone * 18}deg`,
        scale: `${pop * (1 - gone * 0.2)}`,
        translate: `0 ${gone * -60}px`,
        opacity: 1 - gone,
      }}
    >
      {children}
    </div>
  );
};

/** Окно браузера: та же строка адреса, что у «живых окон» на сайте. */
export const Browser: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  style?: React.CSSProperties;
  barSize?: number;
  dark?: boolean;
  urlStyle?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, width, height, url, style, barSize = 52, dark, urlStyle, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderRadius: 20,
      overflow: "hidden",
      background: c.surface,
      boxShadow: dark ? "0 0 0 2px #2e2e2b" : "0 2px 4px rgb(17 17 16 / 0.08), 0 26px 60px -18px rgb(17 17 16 / 0.32), 0 0 0 2px rgb(17 17 16 / 0.1)",
      ...style,
    }}
  >
    <div
      style={{
        height: barSize,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "0 18px",
        background: "#f8f7f3",
        borderBottom: `2px solid ${c.line}`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 13, height: 13, borderRadius: 99, background: "#e2dfd6" }} />
      ))}
      <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "3px 22px",
            borderRadius: 10,
            background: c.paper,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: barSize * 0.5,
            color: c.muted,
            whiteSpace: "nowrap",
            ...urlStyle,
          }}
        >
          {url}
        </span>
      </span>
      <span style={{ width: 60 }} />
    </div>
    <div style={{ position: "relative", width: "100%", height: height - barSize, overflow: "hidden" }}>{children}</div>
  </div>
);

/** Телефон: чёрная рамка, как у телефонных окон на сайте. */
export const Phone: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, width, height, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderRadius: 42,
      border: `11px solid ${c.ink}`,
      background: c.ink,
      overflow: "hidden",
      boxShadow: "0 30px 60px -18px rgb(17 17 16 / 0.5)",
      ...style,
    }}
  >
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 30, overflow: "hidden" }}>{children}</div>
  </div>
);

/** Знак сайта — ключ (components/Logo.astro). */
export const KeyLogo: React.FC<{ width: number; blade?: string; style?: React.CSSProperties }> = ({ width, blade = c.ink, style }) => (
  <svg viewBox="0 0 41 24" width={width} height={(width * 24) / 41} style={{ display: "block", overflow: "visible", ...style }}>
    <rect width="24" height="24" rx="7" fill={c.accent} />
    <path d="M6 18V6.5l6 7 6-7V18" fill="none" stroke={c.ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M24 9.5h15a1.8 1.8 0 0 1 1.8 1.8v1.4a1.8 1.8 0 0 1-1.8 1.8h-1.3v3.3a1 1 0 0 1-1 1h-1.9a1 1 0 0 1-1-1v-3.3h-1.6v1.9a1 1 0 0 1-1 1h-1.9a1 1 0 0 1-1-1v-1.9H24z"
      fill={blade}
    />
  </svg>
);

/** Слова поднимаются из-под маски, как заголовок первого экрана на сайте. */
export const Rise: React.FC<{ text: string; at: number; t: number; step?: number; dur?: number; style?: React.CSSProperties }> = ({
  text,
  at,
  t,
  step = 0.035,
  dur = 0.7,
  style,
}) => (
  <span style={{ display: "inline-block", overflow: "hidden", padding: "0.06em 0.04em 0.14em", margin: "-0.06em -0.04em -0.14em", verticalAlign: "bottom", ...style }}>
    {[...text].map((ch, i) => (
      <span
        key={i}
        style={{
          display: "inline-block",
          whiteSpace: "pre",
          translate: `0 ${(1 - r(t, at + i * step, at + i * step + dur)) * 120}%`,
        }}
      >
        {ch}
      </span>
    ))}
  </span>
);
