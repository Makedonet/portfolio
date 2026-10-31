// Шаг 4. Разработка: тёмный кадр, слева пишется код, справа по нему собирается
// страница: строка дописана - деталь встала на место и мигнула жёлтой рамкой.
// Потом форма отправляет заказ, и по жёлтому проводу он приходит в Telegram и в
// Метрику. Сверху весь ролик виден тестовый адрес.
import React from "react";
import { AbsoluteFill } from "remotion";
import { accel, back, Browser, c, Check, display, Draw, inOut, mix, mono, r, sans, Sticker, useT } from "./kit";
import { cobalt, HERO_H, KorkaDesktop, PAGE_W } from "./korka";

type Token = [string, string?];
const Y = c.accent;
const G = c.mutedDark;
const P = c.paper;

// Настоящий код сайта такого типа: разметка компонентов, форма, отправка.
const CODE: Token[][] = [
  [["<Header ", G], ["logo", P], ['="Корка"', Y], [" />", G]],
  [["<Hero", G]],
  [["  title", P], ['="Хлеб к утру"', Y]],
  [["  image", P], ["={loaf}", Y], [" />", G]],
  [["<Button ", G], ["href", P], ['="#order"', Y], [">", G]],
  [["  Заказать", P]],
  [["</Button>", G]],
  [["{bread.map((item) => (", G]],
  [["  <Card ", G], ["{...item}", Y], [" />", G]],
  [["))}", G]],
  [[""]],
  [["<form ", G], ["onSubmit", P], ["={send}", Y], [">", G]],
  [["  <input ", G], ["name", P], ['="phone"', Y], [" />", G]],
  [["</form>", G]],
  [[""]],
  [["await ", P], ["telegram", Y], [".send(order)", P]],
  [["metrika", Y], [".goal(", P], ['"order"', Y], [")", P]],
];

const LINE = 50;
const CHAR_TIME = 0.0175;
const CODE_START = 0.3;

// Когда дописывается каждая строка.
const lineEnds: number[] = [];
{
  let at = CODE_START;
  for (const line of CODE) {
    const chars = line.reduce((n, [text]) => n + text.length, 0);
    at += chars * CHAR_TIME + 0.05;
    lineEnds.push(at);
  }
}
const lineStarts = lineEnds.map((end, i) => (i === 0 ? CODE_START : lineEnds[i - 1]!));
const ORDER_AT = lineEnds[13]!;

const CodeColumn: React.FC<{ t: number; dim: number }> = ({ t, dim }) => {
  let current = 0;
  lineStarts.forEach((start, i) => {
    if (t >= start) current = i;
  });
  // Если строк больше, чем вмещает кадр, колонка едет вверх за курсором.
  const scroll = Math.max(0, current - 12) * LINE;
  return (
    <div style={{ position: "absolute", left: 48, top: 48, right: 720, bottom: 40, overflow: "hidden", opacity: 1 - dim * 0.8, clipPath: `inset(0 0 ${dim * 170}px 0)` }}>
      <div style={{ translate: `0 ${-scroll}px`, fontFamily: mono, fontWeight: 500, fontSize: 28, lineHeight: `${LINE}px`, whiteSpace: "pre" }}>
        {CODE.map((line, i) => {
          const start = lineStarts[i]!;
          const typed = Math.floor((t - start) / CHAR_TIME);
          if (t < start) return <div key={i} style={{ height: LINE }} />;
          let left = typed;
          return (
            <div key={i} style={{ height: LINE }}>
              {line.map(([text, color], k) => {
                const part = text.slice(0, Math.max(0, left));
                left -= text.length;
                return (
                  <span key={k} style={{ color: color ?? P }}>
                    {part}
                  </span>
                );
              })}
              {i === current && t < lineEnds[lineEnds.length - 1]! + 0.3 ? (
                <span style={{ display: "inline-block", width: 15, height: 32, marginLeft: 2, verticalAlign: -6, background: Y }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Жёлтая рамка, которая мигает вокруг детали, когда та встала на место. */
const Flash: React.FC<{ t: number; at: number; x: number; y: number; w: number; h: number; radius?: number }> = ({ t, at, x, y, w, h, radius = 10 }) => {
  const p = r(t, at, at + 0.55, (n) => n);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 8,
        top: y - 8,
        width: w + 16,
        height: h + 16,
        borderRadius: radius,
        border: `6px solid ${Y}`,
        boxSizing: "border-box",
        opacity: 1 - p,
        scale: `${mix(0.97, 1.02, p)}`,
      }}
    />
  );
};

const BX = 500;
const BY = 44;
const BW = 656;
const BH = 500;
const BAR = 52;
const SCALE = BW / PAGE_W;

export const Step4Build: React.FC = () => {
  const t = useT();
  const parts = {
    nav: r(t, lineEnds[0]!, lineEnds[0]! + 0.35),
    title: r(t, lineEnds[2]!, lineEnds[2]! + 0.45),
    lead: 1,
    loaf: r(t, lineEnds[3]!, lineEnds[3]! + 0.55, back),
    button: r(t, lineEnds[6]!, lineEnds[6]! + 0.35),
    cards: r(t, lineEnds[9]!, lineEnds[9]! + 0.5),
    press: r(t, 5.0, 5.08) - r(t, 5.08, 5.25),
  };

  // Форма заказа выезжает поверх страницы.
  const form = r(t, 5.2, 5.65);
  const sent = r(t, 6.42, 6.5) - r(t, 6.5, 6.66);
  const formOut = r(t, 6.6, 7.0, inOut);

  const wire1 = r(t, 6.5, 7.15, inOut);
  const card1 = r(t, 7.0, 7.45, back);
  const wire2 = r(t, 7.35, 7.95, inOut);
  const card2 = r(t, 7.8, 8.25, back);

  const fadeOut = r(t, 10.0, 10.45, accel);

  return (
    <AbsoluteFill style={{ background: c.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: r(t, 0, 0.28) * (1 - fadeOut) }}>
        <CodeColumn t={t} dim={r(t, ORDER_AT + 0.1, ORDER_AT + 0.9) * r(t, 6.3, 6.8)} />

        <Browser
          x={BX}
          y={BY}
          width={BW}
          height={BH}
          url="korka.test"
          barSize={BAR}
          dark
          style={{ background: c.paper }}
          urlStyle={{ color: c.ink, background: t >= 8.7 ? Y : c.paper, fontWeight: 800 }}
        >
          <div style={{ width: PAGE_W, height: 880, scale: `${SCALE}`, transformOrigin: "0 0", background: cobalt }}>
            <div style={{ position: "absolute", inset: 0, background: c.paper }} />
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${(1 - r(t, 0.28, 1.0, inOut)) * 100}% 0)` }}>
              <KorkaDesktop parts={parts} color={cobalt} />
            </div>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <Flash t={t} at={lineEnds[0]!} x={40} y={22} w={880} h={72} />
              <Flash t={t} at={lineEnds[2]!} x={44} y={104} w={420} h={276} />
              <Flash t={t} at={lineEnds[3]!} x={544} y={110} w={384} h={384} radius={200} />
              <Flash t={t} at={lineEnds[6]!} x={48} y={398} w={266} h={84} radius={50} />
              <Flash t={t} at={lineEnds[9]!} x={44} y={HERO_H + 32} w={872} h={296} radius={26} />
            </div>

            {/* Форма поверх страницы. */}
            <div
              style={{
                position: "absolute",
                left: 170,
                top: 96,
                width: 620,
                height: 560,
                padding: "40px 48px",
                boxSizing: "border-box",
                borderRadius: 30,
                background: c.surface,
                boxShadow: "0 30px 80px rgb(0 0 0 / 0.5)",
                opacity: Math.min(1, form * 2) * (1 - formOut),
                translate: `${formOut * -240}px ${(1 - form) * 60}px`,
                scale: `${mix(1, 0.7, formOut)}`,
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 92, lineHeight: 1, color: c.ink }}>Заказ на утро</div>
              {[
                { text: "2 ржаных, 1 багет", at: 5.65 },
                { text: "+7 921 000-00-00", at: 5.98 },
              ].map(({ text, at }) => (
                <div
                  key={at}
                  style={{
                    marginTop: 24,
                    padding: "18px 24px",
                    height: 88,
                    boxSizing: "border-box",
                    borderRadius: 18,
                    border: `3px solid ${c.line}`,
                    fontFamily: sans,
                    fontWeight: 600,
                    fontSize: 42,
                    lineHeight: "48px",
                    color: c.ink,
                    whiteSpace: "nowrap",
                  }}
                >
                  {text.slice(0, Math.max(0, Math.floor((t - at) / 0.019)))}
                </div>
              ))}
              <div
                style={{
                  marginTop: 28,
                  padding: "22px 0 24px",
                  borderRadius: 99,
                  background: cobalt,
                  color: c.paper,
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 44,
                  lineHeight: 1,
                  textAlign: "center",
                  scale: `${1 - sent * 0.06}`,
                }}
              >
                Отправить
              </div>
            </div>
          </div>
        </Browser>

        {/* Провода: от страницы к Telegram и к Метрике. */}
        <svg width={1200} height={800} style={{ position: "absolute", inset: 0 }}>
          <Draw d="M620 544 C620 620 540 660 450 660" p={wire1} color={Y} width={7} />
          <Draw d="M930 544 V576" p={wire2} color={Y} width={7} />
        </svg>

        {/* Заказ в Telegram. */}
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 574,
            width: 400,
            height: 184,
            padding: "22px 28px",
            boxSizing: "border-box",
            borderRadius: 26,
            background: c.surface,
            color: c.ink,
            transformOrigin: "100% 40%",
            scale: `${card1}`,
            opacity: Math.min(1, card1 * 2),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: sans, fontWeight: 700, fontSize: 32, color: c.muted }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="#2aabee">
              <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.4-.1-.6-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.5 1.2Z" />
            </svg>
            Telegram
          </div>
          <div style={{ marginTop: 8, fontFamily: display, fontWeight: 800, fontSize: 84, lineHeight: 1 }}>Новый заказ</div>
        </div>

        {/* Заказ в Метрике: столбец растёт, цель отмечена. */}
        <div
          style={{
            position: "absolute",
            left: 716,
            top: 574,
            width: 436,
            height: 184,
            padding: "22px 28px",
            boxSizing: "border-box",
            borderRadius: 26,
            background: c.surface,
            color: c.ink,
            transformOrigin: "50% 0",
            scale: `${card2}`,
            opacity: Math.min(1, card2 * 2),
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 32, lineHeight: "36px", color: c.muted }}>Метрика</div>
          <div style={{ marginTop: 8, fontFamily: display, fontWeight: 800, fontSize: 84, lineHeight: 1, whiteSpace: "nowrap" }}>Цель: заказ</div>
          {t >= 8.3 ? (
            <div style={{ position: "absolute", right: 20, top: 16 }}>
              <Check at={8.3} t={t} size={60} bg={c.ok} fg={c.surface} />
            </div>
          ) : null}
        </div>

        {/* За работой можно следить. */}
        <Sticker at={8.75} t={t} x={BX + 14} y={BY + 74} rotate={-3} size={62}>
          Можно смотреть уже сейчас
        </Sticker>
      </div>
    </AbsoluteFill>
  );
};
