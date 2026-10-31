// Шаг 2. Структура: чертёж на жёлтом. Экраны страницы ложатся друг под друга,
// у каждого своя подпись. Потом посетитель-точка проходит путь: кнопка, форма,
// «заказ принят». Так видно, куда ведёт каждая кнопка.
import React from "react";
import { AbsoluteFill } from "remotion";
import { accel, back, c, Check, display, Draw, expo, inOut, mix, r, sans, useT } from "./kit";

const INK = c.ink;
const X = 76;
const W = 420;

const BLOCKS = [
  { label: "Первый экран", y: 50, h: 232, at: 0.25 },
  { label: "Хлеб и цены", y: 298, h: 170, at: 1.0 },
  { label: "Как заказать", y: 484, h: 118, at: 1.75 },
  { label: "Адрес", y: 618, h: 132, at: 2.5 },
];

const rectPath = (x: number, y: number, w: number, h: number, rad = 18) =>
  `M${x + rad} ${y} H${x + w - rad} Q${x + w} ${y} ${x + w} ${y + rad} V${y + h - rad} Q${x + w} ${y + h} ${x + w - rad} ${y + h} H${x + rad} Q${x} ${y + h} ${x} ${y + h - rad} V${y + rad} Q${x} ${y} ${x + rad} ${y}Z`;

// Пути посетителя. Кубические кривые: точка считается через getPointAt ниже.
const P1 = { a: [288, 234], b: [520, 264], c: [540, 138], d: [690, 138] };
const P2 = { a: [470, 434], b: [590, 434], c: [570, 280], d: [690, 280] };
const P3 = { a: [905, 400], b: [905, 430], c: [905, 448], d: [905, 472] };

const cubicD = (p: typeof P1) => `M${p.a[0]} ${p.a[1]} C${p.b[0]} ${p.b[1]} ${p.c[0]} ${p.c[1]} ${p.d[0]} ${p.d[1]}`;
const cubicAt = (p: typeof P1, k: number): [number, number] => {
  const u = 1 - k;
  const f = (i: 0 | 1) => u * u * u * p.a[i]! + 3 * u * u * k * p.b[i]! + 3 * u * k * k * p.c[i]! + k * k * k * p.d[i]!;
  return [f(0), f(1)];
};

/** Содержимое экранов на чертеже: линии вместо текста, крест вместо картинки. */
const Sketch: React.FC<{ i: number; p: number; press: number }> = ({ i, p, press }) => {
  const line = (d: string, width: number, from: number) => <Draw key={d} d={d} p={Math.max(0, Math.min(1, (p - from) / 0.5))} width={width} />;
  const B = BLOCKS[i]!;
  const y = B.y;
  if (i === 0) {
    return (
      <>
        {line(`M${X + 24} ${y + 34} H${X + 92}`, 9, 0)}
        {line(`M${X + 28} ${y + 86} H${X + 210}`, 26, 0.1)}
        {line(`M${X + 28} ${y + 128} H${X + 160}`, 26, 0.2)}
        {line(rectPath(X + 262, y + 34, 134, 134, 67), 4, 0.25)}
        <g style={{ opacity: Math.min(1, p * 2), transformBox: "fill-box", transformOrigin: "center", scale: `${1 - press * 0.1}` }}>
          <rect x={X + 22} y={y + 158} width={190} height={52} rx={26} fill={INK} />
          <text x={X + 117} y={y + 194} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={30} fill={c.accent}>
            Заказать
          </text>
        </g>
      </>
    );
  }
  if (i === 1) {
    return (
      <>
        {[0, 1, 2].map((k) => {
          const bx = X + 22 + k * 128;
          return (
            <React.Fragment key={k}>
              {line(rectPath(bx, y + 18, 116, 84, 12), 4, k * 0.1)}
              {line(`M${bx} ${y + 18} L${bx + 116} ${y + 102} M${bx + 116} ${y + 18} L${bx} ${y + 102}`, 2.5, 0.2 + k * 0.1)}
            </React.Fragment>
          );
        })}
        <g style={{ opacity: Math.min(1, p * 2), transformBox: "fill-box", transformOrigin: "center", scale: `${1 - press * 0.1}` }}>
          <rect x={X + 278} y={y + 116} width={116} height={40} rx={20} fill={INK} />
          <text x={X + 336} y={y + 144} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={24} fill={c.accent}>
            В заказ
          </text>
        </g>
        {line(`M${X + 26} ${y + 136} H${X + 190}`, 9, 0.4)}
      </>
    );
  }
  if (i === 2) {
    return (
      <>
        {[0, 1, 2].map((k) => {
          const dx = X + 66 + k * 144;
          return (
            <React.Fragment key={k}>
              {line(rectPath(dx - 24, y + 22, 48, 48, 24), 4, k * 0.12)}
              {line(`M${dx - 40} ${y + 92} H${dx + 40}`, 8, 0.2 + k * 0.12)}
              {k < 2 ? line(`M${dx + 36} ${y + 46} H${dx + 106}`, 3, 0.3 + k * 0.12) : null}
            </React.Fragment>
          );
        })}
      </>
    );
  }
  return (
    <>
      {line(rectPath(X + 22, y + 18, 210, 96, 12), 4, 0)}
      {line(`M${X + 22} ${y + 74} Q${X + 100} ${y + 40} ${X + 232} ${y + 86}`, 3, 0.2)}
      {line(`M${X + 130} ${y + 18} L${X + 112} ${y + 114}`, 3, 0.3)}
      {line(`M${X + 262} ${y + 44} H${X + 392}`, 11, 0.3)}
      {line(`M${X + 262} ${y + 84} H${X + 356}`, 8, 0.4)}
    </>
  );
};

export const Step2Plan: React.FC = () => {
  const t = useT();
  const erase = r(t, 9.75, 10.2, inOut);
  const labelsOut = r(t, 3.75, 4.2, accel);

  // Посетитель: идёт от первой кнопки к форме, заполняет её, затем к «принято».
  const go1 = r(t, 4.35, 5.2, inOut);
  const go2 = r(t, 5.75, 6.3, inOut); // второй посетитель, с кнопки «В заказ»
  const go3 = r(t, 7.15, 7.6, inOut);
  const formIn = r(t, 4.8, 5.3);
  const doneIn = r(t, 7.4, 7.85);

  const press1 = r(t, 4.2, 4.3) - r(t, 4.3, 4.5);
  const press2 = r(t, 5.6, 5.7) - r(t, 5.7, 5.9);

  const dot1 = cubicAt(P1, go1);
  const dot2 = cubicAt(P2, go2);
  const dot3 = cubicAt(P3, go3);

  return (
    <AbsoluteFill style={{ background: c.accent, overflow: "hidden" }}>
      {/* Сетка чертёжной бумаги. */}
      <svg width={1200} height={800} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill={INK} opacity="0.2" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#grid)" />
      </svg>

      <div style={{ position: "absolute", inset: 0, opacity: 1 - erase, translate: `0 ${erase * 30}px` }}>
        <svg width={1200} height={800} style={{ position: "absolute", inset: 0 }}>
          {BLOCKS.map((b, i) => {
            const draw = r(t, b.at, b.at + 0.75, inOut);
            const fill = r(t, b.at + 0.3, b.at + 0.8);
            return (
              <g key={b.label}>
                <path d={rectPath(X, b.y, W, b.h)} fill={`rgb(255 255 255 / ${fill * 0.55})`} />
                <Draw d={rectPath(X, b.y, W, b.h)} p={draw} width={5} />
                <Sketch i={i} p={r(t, b.at + 0.2, b.at + 1.0, (n) => n)} press={i === 0 ? press1 : i === 1 ? press2 : 0} />
                {/* Выноска к подписи. */}
                <Draw d={`M${X + W + 4} ${b.y + 42} H${X + W + 44}`} p={r(t, b.at + 0.3, b.at + 0.6) * (1 - labelsOut)} width={4} />
              </g>
            );
          })}

          {/* Путь от первой кнопки к форме. */}
          <Draw d={cubicD(P1)} p={go1} width={5} />
          {go1 >= 1 ? <path d="M672 122 L694 138 L672 154" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {/* Вторая кнопка ведёт туда же. */}
          <Draw d={cubicD(P2)} p={go2} width={5} />
          {go2 >= 1 ? <path d="M672 264 L694 280 L672 296" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}
          <Draw d={cubicD(P3)} p={go3} width={5} />
          {go3 >= 1 ? <path d="M889 454 L905 476 L921 454" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </svg>

        {/* Подписи экранов: крупно, справа от блоков. */}
        {BLOCKS.map((b) => {
          const p = r(t, b.at + 0.3, b.at + 0.95);
          return (
            <div
              key={b.label}
              style={{
                position: "absolute",
                left: X + W + 60,
                top: b.y - 18,
                fontFamily: display,
                fontWeight: 800,
                fontSize: 122,
                lineHeight: 1,
                color: INK,
                whiteSpace: "nowrap",
                opacity: Math.min(1, p * 2) * (1 - labelsOut),
                translate: `${(1 - p) * 40 + labelsOut * 90}px 0`,
              }}
            >
              {b.label}
            </div>
          );
        })}

        {/* Форма заказа. */}
        <div
          style={{
            position: "absolute",
            left: 700,
            top: 56,
            width: 424,
            height: 344,
            padding: "26px 34px",
            boxSizing: "border-box",
            background: c.surface,
            border: `5px solid ${INK}`,
            borderRadius: 22,
            scale: `${mix(0.82, 1, r(t, 4.8, 5.25, back))}`,
            opacity: formIn,
            transformOrigin: "0 30%",
          }}
        >
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 76, lineHeight: 1, color: INK }}>Заказ на утро</div>
          {[0, 1].map((k) => {
            const fillAt = 6.3 + k * 0.28;
            return (
              <div key={k} style={{ marginTop: k === 0 ? 20 : 12, height: 58, borderRadius: 12, border: `4px solid ${INK}`, position: "relative", overflow: "hidden" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 18,
                    height: 15,
                    borderRadius: 8,
                    background: INK,
                    width: `${r(t, fillAt, fillAt + 0.3, inOut) * (k === 0 ? 58 : 76)}%`,
                  }}
                />
              </div>
            );
          })}
          <div
            style={{
              marginTop: 16,
              height: 60,
              borderRadius: 99,
              background: INK,
              color: c.accent,
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 34,
              lineHeight: "58px",
              textAlign: "center",
              scale: `${1 - (r(t, 6.98, 7.06) - r(t, 7.06, 7.24)) * 0.08}`,
            }}
          >
            Отправить
          </div>
        </div>

        {/* Заказ принят. */}
        <div
          style={{
            position: "absolute",
            left: 700,
            top: 488,
            width: 424,
            height: 250,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: INK,
            borderRadius: 22,
            color: c.paper,
            opacity: doneIn,
            scale: `${mix(0.85, 1, r(t, 7.4, 7.85, back))}`,
          }}
        >
          {t >= 7.6 ? <Check at={7.6} t={t} size={96} /> : <div style={{ height: 96 }} />}
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 78, lineHeight: 1 }}>Заказ принят</div>
        </div>

        {/* Посетитель. */}
        {[
          { on: t > 4.32 && t < 5.3, at: dot1 },
          { on: t > 5.72 && t < 6.4, at: dot2 },
          { on: t > 7.12 && t < 7.7, at: dot3 },
        ].map(({ on, at }, i) =>
          on ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: at[0] - 20,
                top: at[1] - 20,
                width: 40,
                height: 40,
                borderRadius: 99,
                background: c.surface,
                border: `9px solid ${INK}`,
                boxSizing: "border-box",
                scale: `${r(t, [4.32, 5.72, 7.12][i]!, [4.32, 5.72, 7.12][i]! + 0.2, expo)}`,
              }}
            />
          ) : null,
        )}
      </div>
    </AbsoluteFill>
  );
};
