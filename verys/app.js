(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  requestAnimationFrame(() => setTimeout(() => document.body.classList.add("loaded"), 60));

  const nav = $("#nav");
  const bar = $("#progress");
  const onScroll = () => {
    const y = scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (nav) nav.classList.toggle("scrolled", y > 8);
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const mb = $("#menuBtn");
  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    if (!mb) return;
    mb.setAttribute("aria-expanded", "false");
    mb.setAttribute("aria-label", "Open menu");
  };
  if (mb) {
    mb.addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      mb.setAttribute("aria-expanded", String(open));
      mb.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }
  $$("#mobileMenu a").forEach((a) => a.addEventListener("click", closeMenu));
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  if (!reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".rv").forEach((el) => io.observe(el));
  } else {
    $$(".rv").forEach((el) => el.classList.add("in"));
  }

  const form = $("#briefForm");
  const note = $("#briefNote");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const body = [
      "Name: " + data.get("name"),
      "Email: " + data.get("email"),
      "What I want to learn: " + data.get("learn"),
      "Who I want to talk to: " + data.get("who"),
      "How many calls: " + data.get("calls")
    ].join("\n");
    const url = "https://mail.google.com/mail/?view=cm&fs=1&to=19jalbin@gmail.com&su=" + encodeURIComponent("Verys brief") + "&body=" + encodeURIComponent(body);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) location.href = url;
    if (note) {
      note.classList.add("brief-note");
      note.textContent = "Gmail should open in a new tab with the brief filled in. Send it, and we will reply.";
    }
  });
})();
