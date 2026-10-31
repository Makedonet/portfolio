// Сайт вымышленной пекарни «Корка» — сквозной герой роликов: в «Структуре» он
// чертёж, в «Дизайне» обретает цвет, в «Разработке» собирается, в «Запуске»
// выходит на домен. Один и тот же макет, поэтому ролики складываются в историю.
// Рисуется в своей сетке (960 шир.) и масштабируется под рамку.
import React from "react";
import { c, display, sans } from "./kit";

export const cobalt = "#2340e8";
export const green = "#0d7a55";
export const tomato = "#e23d1f";
const crust = "#e8983a";
const crumb = "#ffe7c2";

/** Круглая буханка: корка, мякиш не виден, три надреза. */
export const Loaf: React.FC<{ size: number; style?: React.CSSProperties; rotate?: number }> = ({ size, style, rotate = -24 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: "block", rotate: `${rotate}deg`, ...style }}>
    <circle cx="100" cy="100" r="100" fill={crust} />
    <circle cx="100" cy="100" r="82" fill="#f0aa52" />
    {[-44, 0, 44].map((dx) => (
      <path
        key={dx}
        d={`M${100 + dx - 6} ${100 - 58 + Math.abs(dx) * 0.45} Q${100 + dx + 22} 100 ${100 + dx - 6} ${100 + 58 - Math.abs(dx) * 0.45}`}
        fill="none"
        stroke={crumb}
        strokeWidth="15"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

const Baguette: React.FC<{ width: number }> = ({ width }) => (
  <svg viewBox="0 0 200 80" width={width} style={{ display: "block", rotate: "-8deg" }}>
    <rect width="200" height="80" rx="40" fill={crust} />
    {[50, 100, 150].map((x) => (
      <path key={x} d={`M${x - 14} 58 L${x + 14} 22`} stroke={crumb} strokeWidth="11" strokeLinecap="round" />
    ))}
  </svg>
);

const Brick: React.FC<{ width: number }> = ({ width }) => (
  <svg viewBox="0 0 200 130" width={width} style={{ display: "block" }}>
    <path d="M0 50 Q0 0 50 0 H150 Q200 0 200 50 Q200 66 186 70 V118 Q186 130 174 130 H26 Q14 130 14 118 V70 Q0 66 0 50Z" fill="#a9652a" />
    <path d="M36 42 H164" stroke="#d99a5b" strokeWidth="11" strokeLinecap="round" />
  </svg>
);

export type Parts = {
  /** Появление частей: 0..1. По умолчанию всё на месте. */
  nav?: number;
  title?: number;
  lead?: number;
  loaf?: number;
  button?: number;
  cards?: number;
  /** Размер кнопки: в «Дизайне» её просят сделать крупнее. */
  buttonScale?: number;
  /** Нажатие кнопки. */
  press?: number;
  /** Цена ржаного: прокручивается в «Запуске». */
  price?: React.ReactNode;
  /** Подсветка карточки с ценой. */
  flash?: number;
};

const show = (p: number, dy = 26): React.CSSProperties => ({
  opacity: Math.min(1, p * 2.5),
  translate: `0 ${(1 - p) * dy}px`,
});

export const PAGE_W = 960;
export const HERO_H = 520;
export const PAGE_H = 880;

/** Компьютерная версия: первый экран и ряд хлеба под ним. */
export const KorkaDesktop: React.FC<{ color?: string; parts?: Parts }> = ({ color = cobalt, parts = {} }) => {
  const { nav = 1, title = 1, lead = 1, loaf = 1, button = 1, cards = 1, buttonScale = 1, press = 0, price = "180 рублей", flash = 0 } = parts;
  return (
    <div style={{ width: PAGE_W, height: PAGE_H, background: c.paper, position: "relative", fontFamily: sans }}>
      <div style={{ position: "absolute", inset: `0 0 ${PAGE_H - HERO_H}px 0`, background: color, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 52, right: 52, top: 30, display: "flex", alignItems: "center", justifyContent: "space-between", color: c.paper, ...show(nav, -14) }}>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 56, lineHeight: 1 }}>Корка</span>
          <span style={{ display: "flex", gap: 40, fontSize: 30, fontWeight: 600 }}>
            <span>Хлеб</span>
            <span>Как заказать</span>
            <span>Адрес</span>
          </span>
        </div>
        <div style={{ position: "absolute", left: 52, top: 106, width: 560, fontFamily: display, fontWeight: 800, fontSize: 150, lineHeight: 0.88, color: c.paper, ...show(title, 40) }}>
          Хлеб
          <br />к утру
        </div>
        <div style={{ position: "absolute", left: 52, top: 402, display: "flex", alignItems: "center", gap: 26, ...show(lead, 16) }}>
          <span
            style={{
              ...show(button, 16),
              display: "inline-block",
              padding: "18px 42px 20px",
              borderRadius: 99,
              background: c.paper,
              color,
              fontWeight: 800,
              fontSize: 38,
              lineHeight: 1,
              scale: `${buttonScale * (1 - press * 0.08)}`,
              transformOrigin: "0 0",
            }}
          >
            Заказать
          </span>
        </div>
        <div style={{ position: "absolute", right: 34, top: 112, scale: `${0.4 + loaf * 0.6}`, opacity: Math.min(1, loaf * 3), rotate: `${(1 - loaf) * -60}deg` }}>
          <Loaf size={380} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 52, right: 52, top: HERO_H + 38, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, ...show(cards, 40) }}>
        {[
          { name: "Ржаной", art: <Brick width={150} />, cost: price },
          { name: "Багет", art: <Baguette width={170} />, cost: "90 рублей" },
          { name: "Деревенский", art: <Loaf size={112} rotate={10} />, cost: "210 рублей" },
        ].map((item, i) => (
          <div
            key={item.name}
            style={{
              height: 280,
              padding: "22px 26px",
              borderRadius: 22,
              background: i === 0 && flash > 0 ? `color-mix(in srgb, ${c.accent} ${flash * 100}%, ${c.surface})` : c.surface,
              border: `2px solid ${c.line}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ height: 122, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.art}</div>
            <div>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 56, lineHeight: 1, color: c.ink }}>{item.name}</div>
              <div style={{ marginTop: 6, fontSize: 38, fontWeight: 600, color: c.muted }}>{item.cost}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Телефонная версия того же экрана (ширина 300). */
export const KorkaPhone: React.FC<{ color?: string; parts?: Parts }> = ({ color = cobalt, parts = {} }) => {
  const { nav = 1, title = 1, loaf = 1, button = 1, buttonScale = 1 } = parts;
  return (
    <div style={{ width: 300, height: 640, background: color, position: "relative", overflow: "hidden", fontFamily: sans, color: c.paper }}>
      <div style={{ position: "absolute", left: 24, top: 26, fontFamily: display, fontWeight: 800, fontSize: 44, lineHeight: 1, ...show(nav, -10) }}>Корка</div>
      <div style={{ position: "absolute", left: 24, top: 86, fontFamily: display, fontWeight: 800, fontSize: 104, lineHeight: 0.88, ...show(title, 30) }}>
        Хлеб
        <br />к утру
      </div>
      <div style={{ position: "absolute", left: 40, top: 280, scale: `${0.4 + loaf * 0.6}`, opacity: Math.min(1, loaf * 3), rotate: `${(1 - loaf) * -60}deg` }}>
        <Loaf size={220} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 28,
          padding: "16px 0 18px",
          textAlign: "center",
          borderRadius: 99,
          background: c.paper,
          color,
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1,
          scale: `${buttonScale}`,
          ...show(button, 14),
        }}
      >
        Заказать
      </div>
    </div>
  );
};

/** Чертёж того же экрана: линии вместо цвета и букв — так он выглядит в
 *  «Структуре» и в начале «Дизайна». */
export const KorkaWire: React.FC = () => (
  <div style={{ position: "relative", width: PAGE_W, height: PAGE_H, background: c.surface }}>
    <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} width={PAGE_W} height={PAGE_H} style={{ position: "absolute", inset: 0 }}>
      <g fill="none" stroke={c.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 58 H178" strokeWidth="18" />
        <path d="M600 58 H680 M716 58 H820 M856 58 H908" strokeWidth="10" />
        <path d="M52 170 H420" strokeWidth="58" />
        <path d="M52 290 H330" strokeWidth="58" />
        <rect x="52" y="402" width="250" height="78" rx="39" />
        <circle cx="736" cy="302" r="190" />
        <path d="M601 167 L870 436 M871 167 L602 436" strokeWidth="3" />
        <path d="M0 520 H960" strokeWidth="3" />
      </g>
      {[52, 340, 628].map((x) => (
        <g key={x} fill="none" stroke={c.ink} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <rect x={x} y="558" width="280" height="280" rx="22" />
          <path d={`M${x + 34} 760 H${x + 200}`} strokeWidth="14" />
          <path d={`M${x + 34} 800 H${x + 150}`} strokeWidth="9" />
        </g>
      ))}
    </svg>
  </div>
);

export const KorkaPhoneWire: React.FC = () => (
  <div style={{ width: 300, height: 640, background: c.surface }}>
    <svg viewBox="0 0 300 640" width={300} height={640} fill="none" stroke={c.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 46 H110" strokeWidth="16" />
      <path d="M24 128 H230" strokeWidth="40" />
      <path d="M24 214 H180" strokeWidth="40" />
      <circle cx="150" cy="390" r="110" />
      <path d="M72 312 L228 468 M228 312 L72 468" strokeWidth="3" />
      <rect x="24" y="544" width="252" height="68" rx="34" />
    </svg>
  </div>
);
