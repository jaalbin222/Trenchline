/* Short landing. Price comes from app/assets/config.js. */
(() => {
  const price = window.TL && TL.CONFIG ? TL.CONFIG.pricePerCallUsd : 50;
  document.querySelectorAll("[data-bind=price]").forEach((el) => { el.textContent = "$" + price; });

  requestAnimationFrame(() => setTimeout(() => document.body.classList.add("loaded"), 40));

  const nav = document.getElementById("nav");
  const bar = document.getElementById("progress");
  const onScroll = () => {
    const y = scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (nav) nav.classList.toggle("scrolled", y > 8);
    if (bar) bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const mb = document.getElementById("menuBtn");
  if (mb) {
    const closeMenu = () => {
      document.body.classList.remove("menu-open");
      mb.setAttribute("aria-expanded", "false");
      mb.setAttribute("aria-label", "Open menu");
    };
    mb.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      mb.setAttribute("aria-expanded", String(open));
      mb.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.querySelectorAll("#mobileMenu a").forEach((a) => a.addEventListener("click", closeMenu));
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  const ask = document.getElementById("ask");
  const q = document.getElementById("q");
  if (ask && q) {
    ask.addEventListener("submit", () => {
      if (!q.value.trim()) q.value = q.placeholder;
    });
  }
})();
