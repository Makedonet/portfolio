// Работы для портфолио. Каждая цифра и каждое утверждение взяты из README,
// аудитов и кода самих проектов — ничего «для красоты». Источники:
// - mc-project: README.md, audit-mc-project-2026-10.md (замеры на 01.10.2026),
//   _tools/seo-monitor-function/README.md;
// - шиномонтаж: README.md (вес страницы и Lighthouse на 01.10.2026),
//   remotion/README.md;
// - мойка: README.md, src/data/content.ts; вес страницы — gzip собранного
//   index.html из репозитория (24.10.2026);
// - ТИ: README.md;
// - OMEGA и PERIBACA: их README.md.
// Скриншоты мойки, шиномонтажа и ТИ сняты с локальной сборки, остальные — из
// docs/ репозиториев.
import type { ImageMetadata } from "astro";

import mcDesktop from "../assets/works/mc-desktop.webp";
import mcMobile from "../assets/works/mc-mobile.webp";
import shinoDesktop from "../assets/works/shino-desktop.jpg";
import shinoMobile from "../assets/works/shino-mobile.jpg";
import moykaDesktop from "../assets/works/moyka-desktop.jpg";
import moykaMobile from "../assets/works/moyka-mobile.jpg";
import tiDesktop from "../assets/works/ti-desktop.jpg";
import tiMobile from "../assets/works/ti-mobile.jpg";
import omegaDesktop from "../assets/works/omega-desktop.jpg";
import omegaMobile from "../assets/works/omega-mobile.jpg";
import peribacaDesktop from "../assets/works/peribaca-desktop.jpg";
import peribacaMobile from "../assets/works/peribaca-mobile.jpg";

export type Metric = { value: string; label: string };

export type Work = {
  id: string;
  title: string;
  /** Что это за сайт — одной строкой под названием. */
  kind: string;
  /** Плашка состояния. `live` — сайт работает у заказчика. */
  status: { tone: "live" | "concept"; label: string };
  /** Что происходит с проектом сейчас, если есть что сказать. */
  now?: string;
  summary: string;
  done: string[];
  metrics: Metric[];
  stack: string[];
  url: string;
  urlLabel: string;
  desktop: ImageMetadata;
  mobile: ImageMetadata;
};

export const works: Work[] = [
  {
    id: "mc-project",
    title: "MC-PROJECT.RU",
    kind: "Сайт геотехнической компании",
    status: { tone: "live", label: "Работает с июля 2026" },
    now: "Сейчас делаю редизайн и многостраничную версию",
    summary:
      "Продвигает технологию усиления грунтов и подъёма фундаментов. Читают его главные инженеры и проектировщики, поэтому вместо обещаний — цифры, нормативы и документы, которые можно приложить к проекту.",
    done: [
      "13 блоков главной выстроены как путь заказчика: от «найдите свой случай» до заявки на расчёт",
      "Шесть кейсов на отдельных страницах и интерактивный стенд технологии",
      "Заявка в два шага: компания по ИНН, файлы до 100 МБ, черновик не пропадает",
      "Заявки идут в Telegram и на почту, а сайт и каналы заявок проверяются каждые 10 минут",
    ],
    metrics: [
      { value: "99", label: "PageSpeed главной на компьютере" },
      { value: "10 из 10", label: "страниц в индексе Google" },
      { value: "10 мин", label: "между проверками сайта и заявок" },
    ],
    stack: ["Astro", "TypeScript", "Tailwind CSS", "PHP", "Telegram Bot API", "Яндекс Облако"],
    url: "https://mc-project.ru/",
    urlLabel: "mc-project.ru",
    desktop: mcDesktop,
    mobile: mcMobile,
  },
  {
    id: "shinomontazh",
    title: "Шиномонтаж на Народной 55",
    kind: "Сайт сети шиномонтажей в Санкт-Петербурге",
    status: { tone: "live", label: "Работает" },
    summary:
      "Две мастерские, прайс по радиусам для четырёх типов транспорта, карта и отзывы с Яндекс Карт. Плюс три страницы под поисковые запросы: правка дисков, хранение шин, шиномонтаж в Невском районе.",
    done: [
      "Перенёс сайт на Astro: значки стали SVG вместо шрифта на 273 КБ, главная похудела почти в семь раз",
      "Цены лежат в одном файле — из него собираются таблица, карточки для телефона и внутренние страницы",
      "Рейтинг с Яндекс Карт обновляется сам при каждой сборке, карта грузится, только когда до неё долистали",
      "Анимированные ролики к шагам «Как проходит работа»",
    ],
    metrics: [
      { value: "314 → 47 КБ", label: "вес главной до и после" },
      { value: "90–91", label: "Lighthouse на телефоне" },
      { value: "5", label: "целей в Метрике — от звонка до маршрута" },
    ],
    stack: ["Astro", "Tailwind CSS", "TypeScript", "Remotion", "Яндекс Карты"],
    url: "https://shinomontazh-narodnaya-55.ru/",
    urlLabel: "shinomontazh-narodnaya-55.ru",
    desktop: shinoDesktop,
    mobile: shinoMobile,
  },
  {
    id: "moyka",
    title: "Мойка на Витебском",
    kind: "Сайт мойки самообслуживания",
    status: { tone: "live", label: "Работает" },
    summary:
      "Одна страница: цены за минуту, что есть в боксе, как мыть по шагам, адрес и частые вопросы. Тексты — по фото бокса и ответам владельца, без выдумок.",
    done: [
      "Своего JavaScript нет: только разметка и стили, открывается сразу",
      "Цены, тексты и контакты — в отдельных файлах: поменять цену значит поправить одну строку",
      "Микроразметка, sitemap и llms.txt — для поисковиков и ИИ-ассистентов",
    ],
    metrics: [
      { value: "0 КБ", label: "своего JavaScript" },
      { value: "16 КБ", label: "страница со стилями, gzip" },
    ],
    stack: ["Astro", "Tailwind CSS", "TypeScript"],
    url: "https://moyka-vitebskiy.ru/",
    urlLabel: "moyka-vitebskiy.ru",
    desktop: moykaDesktop,
    mobile: moykaMobile,
  },
  {
    id: "ti-redesign",
    title: "Технологии инъектирования",
    kind: "Концепт редизайна главной",
    status: { tone: "concept", label: "Концепт" },
    summary:
      "Новый дизайн для действующего сайта строительной компании на WordPress — без смены домена, адресов и текстов.",
    done: [
      "Изометрические сцены и 12 инженерных схем рисуются кодом, а не вручную",
      "Сцены оживают при прокрутке: смола идёт по трещине, растёт зона закрепления, поднимается фундамент",
      "Все ссылки старой главной на месте, вёрстка готова к переносу в WordPress",
    ],
    metrics: [
      { value: "12", label: "инженерных схем к методам" },
      { value: "4", label: "анимированные сцены" },
      { value: "0", label: "сторонних библиотек" },
    ],
    stack: ["HTML", "CSS", "JavaScript", "SVG", "Node.js"],
    url: "https://ti-redesign-iota.vercel.app/",
    urlLabel: "ti-redesign-iota.vercel.app",
    desktop: tiDesktop,
    mobile: tiMobile,
  },
];

export type Demo = {
  id: string;
  title: string;
  kind: string;
  summary: string;
  url: string;
  urlLabel: string;
  code: string;
  desktop: ImageMetadata;
  mobile: ImageMetadata;
};

export const demos: Demo[] = [
  {
    id: "omega",
    title: "OMEGA",
    kind: "Лендинг детективного агентства",
    summary:
      "Коммерческая работа 2024 года, переведённая в демо-режим. Весь сайт — один HTML-файл без библиотек: 17 карточек услуг с переворотом, отзывы на нативной прокрутке вместо слайдера на 170 КБ.",
    url: "https://omegadet.vercel.app/",
    urlLabel: "omegadet.vercel.app",
    code: "https://github.com/Makedonet/Omega",
    desktop: omegaDesktop,
    mobile: omegaMobile,
  },
  {
    id: "peribaca",
    title: "PERIBACA",
    kind: "Лендинг туров по Каппадокии",
    summary:
      "Учебный макет 2021 года, переписанный с нуля: девять экранов, галерея с лайтбоксом, заявка с проверкой полей. Работает с клавиатуры, контраст — по WCAG AA.",
    url: "https://peribaca.vercel.app/",
    urlLabel: "peribaca.vercel.app",
    code: "https://github.com/Makedonet/Cappadocia",
    desktop: peribacaDesktop,
    mobile: peribacaMobile,
  },
];

/** Цифры под первым экраном — самые показательные из работ выше. */
export const facts: Metric[] = [
  { value: "314 → 47 КБ", label: "весит главная шиномонтажа после переезда на Astro" },
  { value: "99", label: "PageSpeed главной mc-project.ru на компьютере" },
  { value: "0 КБ", label: "своего JavaScript на сайте мойки" },
  { value: "10 мин", label: "между проверками, что сайт и заявки работают" },
];
