// Шаг 5. Запуск и поддержка: «под ключ» буквально. Знак сайта входит в щель,
// поворачивается, как на логотипе при наведении, и двери расходятся: за ними
// сайт на настоящем домене. Его проверяют на трёх экранах, а потом заказчик
// пишет про цену, я отвечаю, и цифра на сайте прокручивается.
import React from "react";
import { AbsoluteFill } from "remotion";
import { accel, back, Browser, c, Check, display, expo, inOut, KeyLogo, mix, Phone, r, sans, Sticker, useSpringAt, useT } from "./kit";
import { KorkaDesktop, KorkaPhone, PAGE_H, PAGE_W } from "./korka";

const Scan: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const p = r(t, at, at + 0.75, inOut);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${p * 100}%`,
        height: 10,
        background: c.accent,
        boxShadow: "0 0 34px 10px rgb(255 212 59 / 0.75)",
      }}
    />
  );
};

const Scaled: React.FC<{ scale: number; w: number; h: number; y?: number; children: React.ReactNode }> = ({ scale, w, h, y = 0, children }) => (
  <div style={{ width: w, height: h, scale: `${scale}`, transformOrigin: "0 0", translate: `0 ${y}px` }}>{children}</div>
);

/** Цена прокручивается барабаном, как цифры в кейсах на сайте. */
const RollingPrice: React.FC<{ p: number }> = ({ p }) => (
  <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25em" }}>
    <span style={{ display: "inline-block", height: "1.2em", overflow: "hidden", lineHeight: "1.2em", verticalAlign: "bottom" }}>
      <span style={{ display: "block", translate: `0 ${p * -1.2}em` }}>
        <span style={{ display: "block" }}>180</span>
        <span style={{ display: "block", color: c.ink, fontWeight: 800 }}>195</span>
      </span>
    </span>
    рублей
  </span>
);

const Bubble: React.FC<{ at: number; t: number; mine?: boolean; x: number; y: number; w: number; children: React.ReactNode }> = ({ at, t, mine, x, y, w, children }) => {
  const pop = useSpringAt(at, 13, 210);
  if (t < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: "22px 30px 26px",
        boxSizing: "border-box",
        borderRadius: 30,
        borderBottomRightRadius: mine ? 8 : 30,
        borderBottomLeftRadius: mine ? 30 : 8,
        background: mine ? c.ink : c.surface,
        color: mine ? c.paper : c.ink,
        fontFamily: sans,
        fontWeight: 600,
        fontSize: 50,
        lineHeight: 1.12,
        boxShadow: "0 16px 40px -14px rgb(17 17 16 / 0.35)",
        transformOrigin: mine ? "100% 100%" : "0 100%",
        scale: `${pop}`,
      }}
    >
      {children}
    </div>
  );
};

export const Step5Launch: React.FC = () => {
  const t = useT();

  // Ключ едет к щели, поворачивается, двери расходятся.
  const enter = r(t, 0.15, 1.05, inOut);
  const turn = r(t, 1.15, 1.9, inOut);
  const open = r(t, 2.0, 2.65, Easing4);
  const shut = r(t, 9.9, 10.5, inOut); // двери закрываются перед повтором

  const doors = (1 - open) + shut;

  // Устройства выезжают за дверями.
  const laptop = r(t, 2.05, 2.8, expo);
  const tablet = r(t, 2.2, 2.95, back);
  const phone = r(t, 2.35, 3.1, back);

  // Камера: сначала все три экрана, потом сайт отходит влево к переписке.
  const shift = r(t, 5.5, 6.15, inOut);
  const pageUp = r(t, 5.75, 6.5, inOut);
  const price = r(t, 8.05, 8.55, inOut);
  const flash = r(t, 8.0, 8.2) * (1 - r(t, 9.1, 9.7));

  const domain = "korka.ru";
  const typed = domain.slice(0, Math.floor(r(t, 2.45, 3.0, (n) => n) * domain.length));

  const KEY_W = 640;
  const SEAM = 600;
  // Лезвие заходит за правую дверь: конец ключа стоит правее щели.
  const keyX = mix(-KEY_W - 40, SEAM - KEY_W + 132, enter);

  return (
    <AbsoluteFill style={{ background: c.paper, overflow: "hidden" }}>
      {/* Сайт на устройствах. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", translate: `${shift * -6}px ${shift * 2}px`, scale: `${mix(1, 0.78, shift)}` }}>
          <div style={{ position: "absolute", inset: 0, translate: `0 ${(1 - laptop) * 60}px`, opacity: laptop }}>
            <Browser
              x={48}
              y={56}
              width={800}
              height={600}
              url={`${typed}${t < 3.05 ? "|" : ""}`}
              barSize={58}
              urlStyle={{ color: c.ink, background: r(t, 3.05, 3.3) > 0 ? c.accent : c.paper, fontWeight: 800, minWidth: 110 }}
            >
              <Scaled scale={800 / PAGE_W} w={PAGE_W} h={PAGE_H} y={pageUp * -(PAGE_H - 542 * (PAGE_W / 800)) * (800 / PAGE_W)}>
                <KorkaDesktop parts={{ price: <RollingPrice p={price} />, flash }} />
              </Scaled>
              <Scan t={t} at={3.25} />
            </Browser>
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - r(t, 5.4, 5.8), translate: `${r(t, 5.4, 5.85, accel) * 240}px 0` }}>
          {/* Планшет: тот же макет чуть шире телефона. */}
          <div style={{ position: "absolute", left: 672, top: 290, width: 340, height: 316, translate: `${(1 - tablet) * 400}px 0`, rotate: "2deg" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 28, border: `11px solid ${c.ink}`, background: c.ink, overflow: "hidden", boxShadow: "0 30px 60px -18px rgb(17 17 16 / 0.5)", position: "relative" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" }}>
                <Scaled scale={318 / PAGE_W} w={PAGE_W} h={PAGE_H}>
                  <KorkaDesktop />
                </Scaled>
                <Scan t={t} at={3.55} />
              </div>
            </div>
          </div>
          <Phone x={944} y={282} width={214} height={440} style={{ translate: `${(1 - phone) * 280}px 0`, rotate: "-3deg" }}>
            <Scaled scale={192 / 300} w={300} h={640}>
              <KorkaPhone />
            </Scaled>
            <Scan t={t} at={3.85} />
          </Phone>
          {/* Галочки: проверено на каждом экране. */}
          {[
            { at: 4.0, x: 802, y: 22 },
            { at: 4.3, x: 884, y: 248 },
            { at: 4.6, x: 1090, y: 238 },
          ].map(({ at, x, y }) =>
            t >= at ? (
              <div key={at} style={{ position: "absolute", left: x, top: y }}>
                <Check at={at} t={t} size={92} />
              </div>
            ) : null,
          )}
        </div>
      </div>

      {/* Переписка: остаюсь на связи для правок. */}
      <Bubble at={6.15} t={t} x={664} y={116} w={490}>
        Ржаной подорожал, поменяете цену?
      </Bubble>
      <Bubble at={7.3} t={t} mine x={790} y={366} w={364}>
        Уже поменял, проверяйте
      </Bubble>
      {t >= 8.7 ? (
        <div style={{ position: "absolute", left: 1058, top: 532 }}>
          <Check at={8.7} t={t} size={96} />
        </div>
      ) : null}

      {/* Новая цена крупно: на телефоне мелкие цифры сайта не прочесть. */}
      <Sticker at={8.15} out={9.75} t={t} x={92} y={560} rotate={-5} size={92}>
        195 рублей
      </Sticker>

      {/* Двери и ключ. Правая дверь выше ключа и прячет его лезвие. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: SEAM, height: 800, background: c.ink, translate: `${(doors - 1) * (SEAM + 30)}px 0` }} />
      <div
        style={{
          position: "absolute",
          left: keyX + (doors - 1) * (SEAM + 200),
          top: 400 - (KEY_W * 24) / 41 / 2,
          perspective: 1800,
          opacity: shut > 0 ? 0 : 1,
        }}
      >
        <div style={{ rotate: `x ${turn * 360}deg`, transformStyle: "preserve-3d" }}>
          <KeyLogo width={KEY_W} blade={c.paper} />
        </div>
      </div>
      <div style={{ position: "absolute", left: SEAM, top: 0, width: 1200 - SEAM, height: 800, background: c.ink, translate: `${(1 - doors) * (1200 - SEAM + 30)}px 0` }}>
        {/* Щель: подсвечивается, когда ключ повернулся. */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: 800, background: c.lineDark }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 6, height: 800, background: c.accent, opacity: r(t, 1.75, 1.95) * (1 - shut) }} />
      </div>
      {/* Подпись на правой двери: то, ради чего всё. */}
      <div
        style={{
          position: "absolute",
          left: SEAM + 70,
          top: 318,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 148,
          lineHeight: 1,
          color: c.paper,
          whiteSpace: "nowrap",
          opacity: r(t, 0.75, 1.15) * (1 - r(t, 1.95, 2.1)) * (shut > 0 ? 0 : 1),
          translate: `${(1 - r(t, 0.75, 1.15)) * 40}px 0`,
        }}
      >
        Под ключ
      </div>
    </AbsoluteFill>
  );
};

// Двери расходятся резко, как после щелчка замка.
function Easing4(n: number) {
  return n < 0.5 ? 8 * n * n * n * n : 1 - Math.pow(-2 * n + 2, 4) / 2;
}
