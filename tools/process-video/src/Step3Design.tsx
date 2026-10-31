// Шаг 3. Дизайн: мир роликов чёрно-белый с жёлтым, и здесь в него впервые
// входит цвет. Чертёж заливается, потом идут правки: кнопку просят крупнее,
// цвет примеряют прямо на макете. Правки заканчиваются печатью «Согласовано».
import React from "react";
import { AbsoluteFill } from "remotion";
import { accel, back, Browser, c, display, Draw, expo, inOut, mix, Phone, r, Sticker, useSpringAt, useT } from "./kit";
import { cobalt, green, KorkaDesktop, KorkaPhone, KorkaPhoneWire, KorkaWire, Parts, PAGE_H, PAGE_W, tomato } from "./korka";

const BX = 36;
const BY = 76;
const BW = 830;
const BH = 648;
const BAR = 50;
const SCALE = BW / PAGE_W;

const PX = 852;
const PY = 150;
const PW = 300;
const PH = 618;
const PSCALE = (PW - 22) / 300;

// Примерка цвета: новый цвет разливается кругом от буханки поверх предыдущего.
const TRIES = [
  { color: green, at: 5.25 },
  { color: tomato, at: 5.95 },
  { color: cobalt, at: 6.65 },
];

const Scaled: React.FC<{ scale: number; w: number; h: number; children: React.ReactNode }> = ({ scale, w, h, children }) => (
  <div style={{ width: w, height: h, scale: `${scale}`, transformOrigin: "0 0" }}>{children}</div>
);

export const Step3Design: React.FC = () => {
  const t = useT();
  const pour = r(t, 0.75, 1.55, inOut); // цвет заливает чертёж
  const undo = r(t, 9.7, 10.15, inOut); // обратно в чертёж перед повтором

  const circle = (cx: string, cy: string, p: number) => `circle(${p * 135}% at ${cx} ${cy})`;
  const dressed = pour * (1 - undo);

  const parts: Parts = {
    nav: r(t, 1.05, 1.5),
    title: r(t, 1.15, 1.75),
    loaf: r(t, 1.3, 2.0, back),
    button: r(t, 1.45, 1.9),
    cards: r(t, 1.5, 2.1),
    buttonScale: mix(1, 1.32, r(t, 3.7, 4.15, back)),
  };

  const phoneParts: Parts = { ...parts, buttonScale: mix(1, 1.06, r(t, 3.7, 4.15, back)) };

  const stamp = useSpringAt(8.05, 14, 320);
  const shake = t > 8.05 && t < 8.35 ? Math.sin((t - 8.05) * 70) * (8.35 - t) * 22 : 0;

  // Круг маркера вокруг кнопки: от руки, чуть мимо, с нахлёстом.
  const ring = "M78 -6 C-6 -14 -42 34 -30 60 C-16 92 160 106 268 88 C356 74 368 22 310 2 C240 -22 96 -22 30 2";

  return (
    <AbsoluteFill style={{ background: c.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, translate: `${shake}px ${shake * 0.6}px` }}>
        <Browser x={BX} y={BY} width={BW} height={BH} url="korka.ru" barSize={BAR}>
          <Scaled scale={SCALE} w={PAGE_W} h={PAGE_H}>
            <KorkaWire />
          </Scaled>
          <div style={{ position: "absolute", inset: 0, clipPath: circle("78%", "48%", dressed) }}>
            <Scaled scale={SCALE} w={PAGE_W} h={PAGE_H}>
              <KorkaDesktop parts={parts} color={cobalt} />
            </Scaled>
          </div>
          {TRIES.map((tr) => (
            <div key={tr.color} style={{ position: "absolute", inset: 0, clipPath: circle("78%", "48%", r(t, tr.at, tr.at + 0.55, inOut) * (1 - undo)) }}>
              <Scaled scale={SCALE} w={PAGE_W} h={PAGE_H}>
                <KorkaDesktop parts={parts} color={tr.color} />
              </Scaled>
            </div>
          ))}
        </Browser>

        <Phone x={PX} y={PY} width={PW} height={PH}>
          <Scaled scale={PSCALE} w={300} h={640}>
            <KorkaPhoneWire />
          </Scaled>
          <div style={{ position: "absolute", inset: 0, clipPath: circle("50%", "60%", r(t, 0.95, 1.7, inOut) * (1 - undo)) }}>
            <Scaled scale={PSCALE} w={300} h={640}>
              <KorkaPhone parts={phoneParts} color={cobalt} />
            </Scaled>
          </div>
          {TRIES.map((tr) => (
            <div key={tr.color} style={{ position: "absolute", inset: 0, clipPath: circle("50%", "60%", r(t, tr.at + 0.08, tr.at + 0.63, inOut) * (1 - undo)) }}>
              <Scaled scale={PSCALE} w={300} h={640}>
                <KorkaPhone parts={phoneParts} color={tr.color} />
              </Scaled>
            </div>
          ))}
        </Phone>

        {/* Правка первая: обвести кнопку и попросить крупнее. */}
        <svg width={1200} height={800} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - r(t, 4.3, 4.6) }}>
          <g transform={`translate(${BX + 52 * SCALE} ${BY + BAR + 402 * SCALE}) scale(0.82 0.92)`}>
            <Draw d={ring} p={r(t, 2.6, 3.15, inOut)} color={c.accent} width={15} />
            <Draw d={ring} p={r(t, 2.6, 3.15, inOut)} color={c.ink} width={4} />
          </g>
        </svg>
        <Sticker at={3.0} out={4.35} t={t} x={BX + 330} y={BY + BAR + 318} rotate={-5} size={68}>
          Можно крупнее?
        </Sticker>

        {/* Правка вторая: примерить цвет. */}
        <Sticker at={4.75} out={7.45} t={t} x={BX + 26} y={BY + BAR + 470} rotate={3} size={68} bg={c.surface}>
          А если другой цвет?
        </Sticker>
        <div style={{ position: "absolute", left: PX + 30, top: 58, display: "flex", gap: 16 }}>
          {[green, tomato, cobalt].map((color, i) => {
            const pop = r(t, 4.85 + i * 0.09, 5.25 + i * 0.09, back) * (1 - r(t, 7.45, 7.75, accel));
            const on = t >= TRIES[i]!.at && (i === 2 || t < TRIES[i + 1]!.at);
            return (
              <div
                key={color}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 99,
                  background: color,
                  scale: `${pop * (on ? 1.14 : 1)}`,
                  outline: on ? `5px solid ${c.ink}` : "none",
                  outlineOffset: 5,
                }}
              />
            );
          })}
        </div>

        {/* Печать. */}
        {t >= 8.05 ? (
          <div
            style={{
              position: "absolute",
              left: 200,
              top: 300,
              padding: "22px 44px 28px",
              background: c.accent,
              border: `8px solid ${c.ink}`,
              borderRadius: 22,
              boxShadow: `9px 10px 0 ${c.ink}`,
              fontFamily: display,
              fontWeight: 900,
              fontSize: 138,
              lineHeight: 1,
              color: c.ink,
              rotate: "-7deg",
              scale: `${mix(2.1, 1, stamp) * (1 - r(t, 9.55, 9.85, accel))}`,
              opacity: Math.min(1, (t - 8.05) * 14) * (1 - r(t, 9.55, 9.8, expo)),
            }}
          >
            Согласовано
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
