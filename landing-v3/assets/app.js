/* Landing ask box. The field is a real input. Price comes from app/assets/config.js. */
(() => {
  const EXAMPLES = [
    "How do small credit unions handle chargebacks?",
    "How do dental clinics pick scheduling software?",
    "How do freight brokers find new carriers?",
    "How do retail shops handle a rush of returns?",
  ];
  const FIND = "→ Find people who do this";

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
    addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu(); });
  }

  const hero = document.getElementById("q");
  let tick = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hero && !reduce) {
    setInterval(() => {
      if (document.activeElement === hero || hero.value) return;
      tick = (tick + 1) % EXAMPLES.length;
      hero.placeholder = EXAMPLES[tick];
    }, 2800);
  }

  function go(text) {
    const q = String(text || "").trim();
    if (!q) return;
    location.href = "app/?q=" + encodeURIComponent(q);
  }

  function bindAsk(form) {
    const input = form.querySelector("input[name=q]");
    const list = form.querySelector(".suggest");
    if (!input || !list) return;
    let active = -1;
    let items = [];

    function render() {
      const typed = input.value.trim();
      items = typed ? [FIND].concat(EXAMPLES) : EXAMPLES.slice();
      active = -1;
      list.innerHTML = items.map((text, i) => {
        const find = text === FIND;
        return `<button type="button" role="option" id="${list.id}-opt-${i}" data-i="${i}" class="${find ? "find" : ""}">${find ? FIND : text}</button>`;
      }).join("");
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
      if (!document.querySelector(".askbox input:focus")) document.body.classList.remove("asking");
    }

    function highlight(i) {
      const buttons = [...list.querySelectorAll("button")];
      if (!buttons.length) return;
      active = (i + buttons.length) % buttons.length;
      buttons.forEach((b, n) => b.classList.toggle("on", n === active));
      input.setAttribute("aria-activedescendant", buttons[active].id);
      buttons[active].scrollIntoView({ block: "nearest" });
    }

    function choose(i) {
      const text = items[i];
      if (!text) return go(input.value);
      if (text === FIND) return go(input.value);
      input.value = text;
      go(text);
    }

    input.addEventListener("focus", () => {
      document.body.classList.add("asking");
      render();
    });
    input.addEventListener("input", () => {
      document.body.classList.add("asking");
      render();
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (form.contains(document.activeElement)) return;
        close();
      }, 120);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) render(); highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (list.hidden) render(); highlight(active < 0 ? items.length - 1 : active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (active >= 0) choose(active); else go(input.value.trim() || input.placeholder); }
      else if (e.key === "Escape") { close(); }
    });
    list.addEventListener("mousedown", (e) => e.preventDefault());
    list.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      choose(Number(b.dataset.i));
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      go(input.value.trim() || input.placeholder);
    });
  }

  document.querySelectorAll("form.askbox").forEach(bindAsk);

  document.querySelectorAll("[data-fill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!hero) return;
      hero.value = btn.getAttribute("data-fill") || "";
      hero.focus();
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  });
})();
