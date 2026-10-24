// Кнопка «скопировать номер» в контактах: на компьютере tel: никуда не
// звонит, а номер удобнее вставить в мессенджер. Галочка на месте значка и
// сообщение для скринридера ([data-copy-status]) — на две секунды.
export function initCopy() {
  const status = document.querySelector<HTMLElement>("[data-copy-status]");
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) => {
    let timer = 0;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? "");
      } catch {
        return;
      }
      button.classList.add("is-copied");
      if (status) status.textContent = "Номер скопирован";
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (status) status.textContent = "";
      }, 1800);
    });
  });
}
