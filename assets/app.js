/* Trenchline landing — vanilla JS, no dependencies */
(() => {
  // TODO: replace with your form backend (Formspree, Tally, Basin, etc.). Leave empty to use the mailto fallback.
  const FORM_ENDPOINT = ""; // e.g. "https://formspree.io/f/XXXXXXX"
  // TODO: replace with the inbox that should receive waitlist sign-ups.
  const FALLBACK_EMAIL = "hello@trenchline.example";

  // PLACEHOLDER switch: set to false to hide every invented stat, testimonial and "founders from" wordmark in one go.
  const SHOW_PLACEHOLDERS = true;
  if (!SHOW_PLACEHOLDERS) document.documentElement.classList.add("no-placeholders");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  requestAnimationFrame(() => setTimeout(() => document.body.classList.add("loaded"), 60));

  /* PLACEHOLDER: invented company wordmarks for the "Founders from" strip — not real customers */
  const logos = [
    ["Fernhollow", "", '<path d="M11 20V6M11 9c-3 0-5 2-5 4 3 0 5-1 5-4zm0 4c3 0 5-2 5-4-3 0-5 1-5 4z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>'],
    ["Parcelwise", "mono", '<rect x="4" y="5" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M4 9.5h14M11 5v4.5" stroke="currentColor" stroke-width="1.8"/>'],
    ["Lumenbay", "serif", '<circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M5 14h12" stroke="currentColor" stroke-width="1.8"/>'],
    ["SALTGRID", "caps", '<path d="M4 4h6v6H4zM12 12h6v6h-6z" fill="currentColor"/><path d="M12 4h6v6h-6zM4 12h6v6H4z" stroke="currentColor" stroke-width="1.6" fill="none"/>'],
    ["Tidewell", "", '<path d="M3 13c2.5-3 5-3 8 0s5.5 3 8 0M3 8.5c2.5-3 5-3 8 0s5.5 3 8 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>'],
    ["Quillory", "serif", '<path d="M17 4C10 5 6 10 5 18c3-5 7-9 12-14z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>'],
    ["Orbitkin", "", '<circle cx="11" cy="11" r="3" fill="currentColor"/><ellipse cx="11" cy="11" rx="8.5" ry="4" stroke="currentColor" stroke-width="1.6" fill="none" transform="rotate(-25 11 11)"/>'],
    ["vantorra", "mono", '<path d="M4 5l7 13 7-13" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>']
  ];
  const lg = $("#logos");
  if (lg) {
    const html = logos.map(([n, c, p]) => `<span class="wm ${c}"><svg viewBox="0 0 22 22" aria-hidden="true">${p}</svg><span>${n}</span></span>`).join("");
    lg.innerHTML = html + html.replace(/<span class="wm/g, '<span aria-hidden="true" class="wm');
  }

  /* hero parallax + magnetic CTAs (fine pointers only) */
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    const hero = $(".hero"), fan = $(".fan");
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      fan.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(3));
      fan.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => { fan.style.setProperty("--px", 0); fan.style.setProperty("--py", 0); });
    $$(".hero .btn, .final .btn, .plan .btn").forEach(b => {
      b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * .12}px ${(e.clientY - r.top - r.height / 2) * .2}px`; });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  /* scroll progress + nav state */
  const nav = $("#nav"), bar = $("#progress");
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle("scrolled", y > 8);
    bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* mobile menu */
  const mb = $("#menuBtn");
  const closeMenu = () => { document.body.classList.remove("menu-open"); mb.setAttribute("aria-expanded", "false"); mb.setAttribute("aria-label", "Open menu"); };
  mb.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    mb.setAttribute("aria-expanded", String(open)); mb.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("#mobileMenu a").forEach(a => a.addEventListener("click", closeMenu));
  addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

  /* reveal on scroll */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  $$(".rv, .final h2").forEach(el => io.observe(el));

  /* cursor spotlight on quote cards */
  $$(".q").forEach(c => c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* how it works: active step + rail */
  const steps = $$(".step"), railLinks = $$("#rail a"), fill = $("#railFill");
  const setStep = i => {
    steps.forEach((s, j) => { s.classList.toggle("on", j === i); if (j === i) s.classList.add("seen"); });
    railLinks.forEach((a, j) => a.classList.toggle("on", j <= i));
    if (fill && railLinks.length) {
      const first = railLinks[0].offsetTop, cur = railLinks[i].offsetTop;
      fill.style.height = `${cur - first}px`;
    }
  };
  const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setStep(+e.target.dataset.i); }), { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => sio.observe(s));

  /* typing effect in step 1 */
  const tIdea = $("#typeIdea"), ideaText = "Software that resolves invoice exceptions for mid-market manufacturers";
  if (tIdea) {
    if (reduce) tIdea.textContent = ideaText;
    else {
      let k = 0, started = false;
      const tick = () => { tIdea.textContent = ideaText.slice(0, ++k); if (k < ideaText.length) setTimeout(tick, 28 + Math.random() * 40); };
      new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting && !started) { started = true; tick(); o.disconnect(); } }), { threshold: .4 }).observe(tIdea);
    }
  }

  /* pricing calculator */
  const fmt = n => "$" + Math.round(n).toLocaleString("en-US");
  const range = $("#calls"), out = $("#callsOut"), saveOut = $("#saveOut"), bars = $$("#bars .bar");
  const paint = (el) => { const p = ((el.value - el.min) / (el.max - el.min)) * 100; el.style.setProperty("--p", p + "%"); };
  const calc = () => {
    const n = +range.value; out.textContent = n; paint(range);
    const max = 1000 * n;
    bars.forEach(b => {
      const v = +b.dataset.rate * n;
      $(".fil", b).style.width = Math.max(1.5, (v / max) * 100) + "%";
      $(".amt", b).textContent = fmt(v);
    });
    saveOut.textContent = fmt((1000 - 50) * n);
  };
  range.addEventListener("input", calc);
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { calc(); o.disconnect(); } }), { threshold: .3 }).observe($("#bars"));
  bars.forEach(b => $(".amt", b).textContent = fmt(+b.dataset.rate * +range.value)); paint(range);

  /* earnings */
  const pm = $("#perMonth"), pmOut = $("#pmOut"), earnOut = $("#earnOut");
  const earn = () => { pmOut.textContent = pm.value; earnOut.textContent = (pm.value * 35).toLocaleString("en-US"); paint(pm); };
  pm.addEventListener("input", earn); earn();

  /* PLACEHOLDER stats count-up */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now(), d = reduce ? 0 : 1400;
    const step = t => { const p = d ? Math.min(1, (t - t0) / d) : 1, v = to * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .5 });
  $$("[data-count]").forEach(el => cio.observe(el));

  /* waitlist tabs */
  const tabs = $("#tabs"), pathField = $("#pathField"), submitBtn = $("#submitBtn"), consentJr = $("#consentJr");
  const setPath = v => {
    tabs.dataset.v = v; pathField.value = v;
    $$("button[role=tab]", tabs).forEach(b => b.setAttribute("aria-selected", String(b.dataset.v === v)));
    $("#pane-founder").hidden = v !== "founder"; $("#pane-junior").hidden = v !== "junior";
    consentJr.hidden = v !== "junior";
    submitBtn.firstChild.textContent = v === "founder" ? "Request a founder spot " : "Apply to take calls ";
  };
  $$("button[role=tab]", tabs).forEach(b => b.addEventListener("click", () => setPath(b.dataset.v)));
  tabs.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const v = tabs.dataset.v === "founder" ? "junior" : "founder"; setPath(v); $(`#tab-${v}`).focus(); } });
  $$("[data-path]").forEach(a => a.addEventListener("click", () => setPath(a.dataset.path)));

  /* waitlist submit */
  const form = $("#wlForm"), msg = $("#formMsg"), card = $("#formCard");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.checkValidity()) { msg.textContent = "Please add your name, a valid email and tick the box."; form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form));
    submitBtn.disabled = true; msg.textContent = "Sending…";
    try {
      if (FORM_ENDPOINT) {
        const r = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error("bad status");
      } else {
        const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
        location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent("Trenchline waitlist: " + data.path)}&body=${encodeURIComponent(body)}`;
      }
      $("#okMsg").textContent = data.path === "founder" ? "We'll reply personally within 48 hours to scope your first calls." : "We'll reply within 48 hours when a founder needs your role.";
      card.classList.add("sent");
    } catch (err) {
      msg.textContent = "Something went wrong. Please try again.";
    } finally { submitBtn.disabled = false; }
  });
})();
