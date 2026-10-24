// Единственный источник имени, контактов и навигации: телефон и ссылки на
// мессенджеры подставляются отсюда в шапку, первый экран, контакты,
// микроразметку и подвал.

const phoneDigits = "79811052533";

export const site = {
  name: "Максим",
  role: "Разработка сайтов под ключ",
  title: "Максим — разработка сайтов под ключ",
  description:
    "Делаю сайты для бизнеса под ключ: структура, дизайн, разработка, формы заявок, аналитика, хостинг и поддержка. Работы: mc-project.ru, шиномонтаж на Народной 55, мойка на Витебском.",
  github: "https://github.com/Makedonet",
};

export const phone = {
  display: "+7 981 105-25-33",
  href: `tel:+${phoneDigits}`,
  e164: `+${phoneDigits}`,
};

export type Contact = {
  id: "phone" | "telegram" | "whatsapp" | "max";
  label: string;
  /** Что видно рядом с названием: номер или ник. */
  handle?: string;
  href: string;
  /** Подсказка при наведении: куда ведёт ссылка. */
  title: string;
  external: boolean;
};

export const contacts: Contact[] = [
  { id: "phone", label: "Позвонить", href: phone.href, title: `Позвонить: ${phone.display}`, external: false },
  {
    id: "telegram",
    label: "Telegram",
    handle: "@medve_ev",
    href: "https://t.me/medve_ev",
    title: "Написать в Telegram: @medve_ev",
    external: true,
  },
  {
    id: "max",
    label: "MAX",
    href: "https://max.ru/u/f9LHodD0cOKIWH0rITWLam86tSI2bQQohoCkcbhq9OVPdMgj7kl4XwP-M7w",
    title: "Написать в MAX",
    external: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    handle: phone.display,
    href: `https://wa.me/${phoneDigits}`,
    title: "Написать в WhatsApp",
    external: true,
  },
];

export const contact = (id: Contact["id"]) => contacts.find((c) => c.id === id)!;

export const nav = [
  { href: "#works", label: "Работы" },
  { href: "#services", label: "Что входит" },
  { href: "#process", label: "Как работаю" },
  { href: "#contact", label: "Контакты" },
];
