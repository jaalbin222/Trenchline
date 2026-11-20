/* Trenchline landing. Price and payout are read from app/assets/config.js. */
(() => {
  const PRICE = window.TL && TL.CONFIG ? TL.CONFIG.pricePerCallUsd : 50;
  const PAYOUT = window.TL && TL.CONFIG ? TL.CONFIG.expertPayoutUsd : 35;
  const EXPERT_HOURLY = 300;
  const GUIDEPOINT_BASE = 150;
  const TEGUS_TRANSCRIPT = 75;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  $$("[data-bind=price]").forEach((el) => { el.textContent = money(PRICE); });
  $$("[data-bind=payout]").forEach((el) => { el.textContent = money(PAYOUT); });

  requestAnimationFrame(() => setTimeout(() => document.body.classList.add("loaded"), 60));

  const hero = $(".hero");
  const fan = $(".fan");
  if (!reduce && fan && hero && matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      fan.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      fan.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => {
      fan.style.setProperty("--px", 0);
      fan.style.setProperty("--py", 0);
    });
  }

  const nav = $("#nav");
  const bar = $("#progress");
  const onScroll = () => {
    const y = scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (nav) nav.classList.toggle("scrolled", y > 8);
    if (bar) bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const mb = $("#menuBtn");
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
    $$("#mobileMenu a").forEach((a) => a.addEventListener("click", closeMenu));
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".rv").forEach((el) => io.observe(el));

  const steps = $$(".step");
  const railLinks = $$("#rail a");
  const fill = $("#railFill");
  if (steps.length && railLinks.length) {
    const setStep = (i) => {
      steps.forEach((s, j) => { s.classList.toggle("on", j === i); if (j === i) s.classList.add("seen"); });
      railLinks.forEach((a, j) => a.classList.toggle("on", j <= i));
      if (fill) fill.style.height = `${railLinks[i].offsetTop - railLinks[0].offsetTop}px`;
    };
    const sio = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setStep(+e.target.dataset.i);
    }), { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => sio.observe(s));
  }

  const tIdea = $("#typeIdea");
  const ideaText = "Whether to build the payroll import, or kill it.";
  if (tIdea) {
    if (reduce) tIdea.textContent = ideaText;
    else {
      let k = 0;
      let started = false;
      const tick = () => {
        tIdea.textContent = ideaText.slice(0, ++k);
        if (k < ideaText.length) setTimeout(tick, 28 + Math.random() * 40);
      };
      new IntersectionObserver((es, o) => es.forEach((e) => {
        if (e.isIntersecting && !started) { started = true; tick(); o.disconnect(); }
      }), { threshold: 0.4 }).observe(tIdea);
    }
  }

  const halfHour = EXPERT_HOURLY / 2;
  const rates = {
    guidepoint: GUIDEPOINT_BASE + halfHour,
    tegus: halfHour + TEGUS_TRANSCRIPT,
    trenchline: PRICE,
  };
  const range = $("#calls");
  const out = $("#callsOut");
  const saveOut = $("#saveOut");
  const bars = $$("#bars .bar");
  const paint = (el) => {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty("--p", p + "%");
  };
  if (range && out && bars.length) {
    const calc = () => {
      const n = +range.value;
      out.textContent = n;
      paint(range);
      const max = rates.guidepoint * n;
      bars.forEach((b) => {
        const v = rates[b.dataset.kind] * n;
        const fil = $(".fil", b);
        const amt = $(".amt", b);
        if (fil) fil.style.width = Math.max(1.5, (v / max) * 100) + "%";
        if (amt) amt.textContent = money(v);
      });
      if (saveOut) saveOut.textContent = money((rates.guidepoint - rates.trenchline) * n);
    };
    range.addEventListener("input", calc);
    const barsEl = $("#bars");
    if (barsEl) {
      new IntersectionObserver((es, o) => es.forEach((e) => {
        if (e.isIntersecting) { calc(); o.disconnect(); }
      }), { threshold: 0.3 }).observe(barsEl);
    }
    calc();
  }

  const pm = $("#perMonth");
  const pmOut = $("#pmOut");
  const earnOut = $("#earnOut");
  if (pm && pmOut && earnOut) {
    const earn = () => {
      pmOut.textContent = pm.value;
      earnOut.textContent = (pm.value * PAYOUT).toLocaleString("en-US");
      paint(pm);
    };
    pm.addEventListener("input", earn);
    earn();
  }
})();
