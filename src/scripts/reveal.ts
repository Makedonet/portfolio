// Появление блоков при прокрутке: [data-reveal] получает .is-visible, когда
// показался на экране, и больше не отслеживается. Стили — в global.css, они
// работают только при html.js и без «уменьшить движение».
const items = document.querySelectorAll<HTMLElement>("[data-reveal]");

if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
  items.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    // Срабатывает чуть раньше, чем блок дошёл до края, — чтобы не ловить
    // пустоту при быстрой прокрутке.
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((item) => observer.observe(item));
}
