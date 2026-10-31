// Шаг 1. Знакомство: запись разговора. Мой голос - столбики вверх, голос
// заказчика - вниз. Вопросы и ответы проговариваются вместе со столбиками, главное
// отмечается маркером. В конце лента уезжает, остаётся лист с тем, что я записал.
import React from "react";
import { AbsoluteFill, random } from "remotion";
import { accel, c, Check, display, expo, inOut, Marker, mix, r, sans, useT } from "./kit";

const PAIRS = [
  { q: "Чем вы занимаетесь?", before: "", key: "Пекарня", after: " на Литейном" },
  { q: "Что должен делать сайт?", before: "", key: "Заказы", after: " на утро" },
  { q: "Когда и за какой бюджет?", before: "", key: "К декабрю", after: ", бюджет есть" },
];
const NOTES = ["Пекарня на Литейном", "Заказы на утро", "К декабрю, бюджет есть"];

const SLOT = 2.15; // секунд на пару вопрос-ответ
const START = 0.25;
const AXIS = 372;
const BAR_STEP = 19;
const FRAME = 1200;

/** Столбики голоса одной пары: x в кадре, высота и момент, когда их «сказали». */
const barsOf = (pair: number) => {
  const count = Math.floor((FRAME - 150) / BAR_STEP);
  return Array.from({ length: count }, (_, i) => {
    const x = 75 + i * BAR_STEP;
    const part = i / count;
    const up = part < 0.42; // вопрос звучит первым, короче ответа
    const gap = part > 0.4 && part < 0.46;
    // Слоги: огибающая плюс шум, чтобы было похоже на настоящую речь.
    const syllable = Math.abs(Math.sin(i * 0.62 + pair * 2.1));
    const noise = random(`bar-${pair}-${i}`);
    const height = gap ? 7 : 12 + (syllable * 0.55 + noise * 0.45) * (up ? 92 : 112);
    return { x, up, height, at: part };
  });
};

export const Step1Talk: React.FC = () => {
  const t = useT();
  const leave = r(t, 6.75, 7.35, inOut); // лента уходит вверх
  const sheetIn = r(t, 6.85, 7.6);
  const sheetOut = r(t, 9.55, 10.0, accel);
  // Лента едет на кадр, когда пара договорена.
  const pan = PAIRS.reduce((sum, _, i) => sum + (i === 0 ? 0 : r(t, START + SLOT * i - 0.32, START + SLOT * i + 0.12, inOut)), 0);

  const talking = t > START && t < 6.7;
  // Счётчик звонка бежит быстрее времени, к повтору возвращается к началу.
  const seconds = t > 9 ? 754 : Math.floor(754 + Math.max(0, Math.min(t, 6.7)) * 11);
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <AbsoluteFill style={{ background: c.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, translate: `0 ${leave * -860}px` }}>
        {/* Ось разговора: на ней появляются столбики, в начале ролика это просто линия. */}
        <div style={{ position: "absolute", left: 0, right: 0, top: AXIS - 2, height: 4, background: c.ink }} />

        <div style={{ position: "absolute", inset: 0, translate: `${pan * -FRAME}px 0` }}>
          {PAIRS.map((pair, i) => {
            const from = START + SLOT * i;
            const sayQ = r(t, from + 0.02, from + 0.5);
            const sayA = r(t, from + 0.62, from + 1.15);
            const voice = (t - from) / 1.55; // 0..1 - куда дошёл голос
            return (
              <div key={i} style={{ position: "absolute", left: FRAME * i, top: 0, width: FRAME, height: 800 }}>
                <svg width={FRAME} height={800} style={{ position: "absolute", inset: 0 }}>
                  {barsOf(i).map((bar, k) => {
                    const grow = Math.min(1, Math.max(0, (voice - bar.at) / 0.05));
                    if (grow <= 0) return null;
                    const live = 1 + Math.sin(t * 16 + k) * 0.1 * (voice < bar.at + 0.25 ? 1 : 0);
                    const h = bar.height * grow * live;
                    return <rect key={k} x={bar.x} y={bar.up ? AXIS - h : AXIS} width={10} height={h} rx={5} fill={c.ink} />;
                  })}
                </svg>
                <div
                  style={{
                    position: "absolute",
                    left: 76,
                    top: 110,
                    fontFamily: sans,
                    fontWeight: 600,
                    fontSize: 68,
                    lineHeight: 1,
                    color: c.ink,
                    opacity: sayQ,
                    translate: `0 ${(1 - sayQ) * 24}px`,
                  }}
                >
                  {pair.q}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 76,
                    right: 40,
                    top: 524,
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 132,
                    lineHeight: 1.02,
                    color: c.ink,
                    whiteSpace: "nowrap",
                    opacity: Math.min(1, sayA * 2),
                    translate: `0 ${(1 - sayA) * 50}px`,
                  }}
                >
                  {pair.before}
                  <Marker p={r(t, from + 1.05, from + 1.6)}>{pair.key}</Marker>
                  {pair.after}
                </div>
              </div>
            );
          })}
        </div>

        {/* Плашка звонка: идёт, пока идёт разговор. */}
        <div
          style={{
            position: "absolute",
            left: 76,
            top: 28,
            translate: `0 ${r(t, 9.8, 10.3) * 860}px`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1,
            color: c.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 99,
              background: c.ink,
              scale: talking ? `${1 + Math.sin(t * 7) * 0.16}` : "1",
            }}
          />
          {timer}
        </div>
      </div>

      {/* Лист с записью. */}
      <div
        style={{
          position: "absolute",
          left: 95,
          top: 90,
          width: 1010,
          height: 620,
          padding: "72px 72px 0",
          boxSizing: "border-box",
          background: c.surface,
          borderRadius: 10,
          boxShadow: "0 2px 4px rgb(17 17 16 / 0.08), 0 30px 70px -20px rgb(17 17 16 / 0.35)",
          rotate: `${mix(5, -1.6, sheetIn) + sheetOut * -12}deg`,
          translate: `0 ${(1 - sheetIn) * 900 + sheetOut * -1000}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -28,
            width: 220,
            height: 56,
            marginLeft: -110,
            background: c.accent,
            opacity: 0.92,
            rotate: "2deg",
          }}
        />
        {NOTES.map((note, i) => {
          const at = 7.5 + i * 0.5;
          const write = r(t, at, at + 0.5);
          return (
            <div key={note} style={{ display: "flex", alignItems: "center", gap: 34, height: 158 }}>
              <div style={{ width: 84, flex: "none" }}>{t >= at + 0.15 ? <Check at={at + 0.15} t={t} size={84} /> : null}</div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 96,
                  lineHeight: 1,
                  color: c.ink,
                  whiteSpace: "nowrap",
                  clipPath: `inset(-20% ${(1 - write) * 100}% -20% 0)`,
                }}
              >
                {note}
              </div>
            </div>
          );
        })}
      </div>
      {/* Возврат к началу: ось снова проводится, и петля замыкается незаметно. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: AXIS - 2,
          height: 4,
          width: `${r(t, 9.8, 10.3, expo) * 100}%`,
          background: c.ink,
        }}
      />
    </AbsoluteFill>
  );
};
