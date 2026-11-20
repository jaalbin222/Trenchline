/* Plain client portal. Data stays in TL.store. Nothing is sent. */
(function () {
  const TL = (window.TL = window.TL || {});
  const C = TL.CONFIG;
  let banner = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function money(n) { return "$" + Math.round(Number(n)); }
  function qs(n) { return new URLSearchParams(location.search).get(n); }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }
  function when(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function person(id) { return TL.store.get().pool.find((p) => p.id === id); }
  function flash(msg) { sessionStorage.setItem("tl.flash", msg); }
  function takeFlash() {
    const m = sessionStorage.getItem("tl.flash");
    sessionStorage.removeItem("tl.flash");
    return m;
  }
  function go(url, msg) { if (msg) flash(msg); location.href = url; }
  function show(text, bad) { banner = { text, bad: !!bad }; paint(); }

  function shell(page, body) {
    const buyer = page === "home" || page === "dashboard" || page === "request" || page === "requestNew" || page === "book" || page === "call" || page === "signup";
    const links = buyer
      ? [["index.html", "Projects", "home"], ["inbox.html", "Taking a call", "inbox"]]
      : [["inbox.html", "Invites", "inbox"], ["payouts.html", "Payouts", "payouts"], ["index.html", "Projects", "home"]];
    const note = banner; banner = null;
    const flashed = takeFlash();
    const msg = note ? `<div class="notice ${note.bad ? "bad" : ""}">${esc(note.text)}</div>` : flashed ? `<div class="notice">${esc(flashed)}</div>` : "";
    return `<div class="wrap" id="main">
      <header class="top">
        <a class="brand" href="index.html">Trenchline</a>
        <nav class="nav">${links.map(([href, label, id]) => `<a class="${page === id || (page === "dashboard" && id === "home") ? "on" : ""}" href="${href}">${label}</a>`).join("")}</nav>
      </header>
      ${msg}${body}
      <p class="foot">${money(C.pricePerCallUsd)} for 30 minutes. Example data stays in this browser. <button type="button" data-act="reset">Restore example</button></p>
    </div>`;
  }

  function peopleFor(req) {
    const passed = req.passed || [];
    return req.matches
      .filter((m) => !m.excluded && m.grade !== "X" && passed.indexOf(m.personId) < 0)
      .slice(0, 3)
      .map((m) => ({ m, p: person(m.personId) }))
      .filter((x) => x.p);
  }

  function pairsFor(req, id) {
    const answers = (req.answers && req.answers[id]) || [];
    return (req.screening || []).slice(0, 3).map((q, i) => ({ q: q, a: answers[i] || "" }));
  }

  function personCard(req, p) {
    const pairs = pairsFor(req, p.id);
    const key = pairs.find((x) => x.a) || pairs[0];
    const rest = pairs.filter((x) => x !== key);
    const booking = inviteState(req, p.id).booking;
    let actions = `<a class="btn" href="book.html?request=${esc(req.id)}&person=${esc(p.id)}">Book call</a><button class="btn secondary" type="button" data-act="pass" data-request="${esc(req.id)}" data-person="${esc(p.id)}">Not a fit</button>`;
    if (booking && booking.status === "confirmed") actions = `<a class="btn secondary" href="call.html?booking=${esc(booking.id)}">Scheduled</a>`;
    else if (booking) actions = `<span class="ex">Already spoke</span>`;
    const block = (x) => `<div class="qa"><p class="q">${esc(x.q)}</p><p>${esc(x.a || "No answer yet.")}</p></div>`;
    return `<article class="card profile"><div class="person"><div><h2 class="who">${esc(p.name)}</h2><p class="role">${esc(p.role)}${p.employerType ? " · " + esc(p.employerType) : ""} · ${esc(p.yearsLabel)}</p></div><div class="actions">${actions}</div></div><p class="bio">${esc(p.bio || "")}</p>${key ? block(key) : ""}${rest.length ? `<details><summary>View profile</summary>${rest.map(block).join("")}</details>` : ""}</article>`;
  }

  function why(p) {
    const tense = p.former ? "Previously " : "";
    return tense + p.role + ", " + p.yearsLabel + (p.employerType ? " · " + p.employerType : "");
  }

  function inviteState(req, personId) {
    const state = TL.store.get();
    const inv = state.invitations.find((i) => i.requestId === req.id && i.personId === personId && i.status !== "declined" && i.status !== "expired");
    const booking = state.bookings.find((b) => b.requestId === req.id && b.personId === personId && b.status !== "cancelled");
    return { inv, booking };
  }

  function projectBlurb(req) {
    const state = TL.store.get();
    const calls = state.bookings.filter((b) => b.requestId === req.id);
    const upcoming = calls.filter((b) => b.status === "confirmed").length;
    const done = calls.filter((b) => b.status !== "confirmed").length;
    const people = peopleFor(req).length;
    if (upcoming) return upcoming + " scheduled";
    if (done && !people) return done + " completed";
    if (people) return people + " people to talk to";
    if (done) return done + " completed";
    return "Open";
  }

  function projects() {
    const state = TL.store.get();
    const cards = state.requests.map((r) => `<a class="card" href="request.html?id=${esc(r.id)}">
      <h2>${esc(r.title)}</h2>
      <p class="role">${esc(projectBlurb(r))}</p>
    </a>`).join("");
    const acct = state.buyer || {};
    return `<div class="rowhead"><div><h1>Projects</h1><p class="ex">Example data</p></div>
      <a class="btn" href="request-new.html">Request a new call</a></div>${cards || "<p class='sub'>No projects yet.</p>"}
      <form data-act="account" class="account"><p class="ex">Your name and email stay in this browser.</p>
        <label class="field">Name<input type="text" name="name" value="${esc(acct.name || "")}" required></label>
        <label class="field">Email<input type="text" name="email" value="${esc(acct.email || "")}" required></label>
        <div class="form-actions"><button class="btn secondary" type="submit">Save</button></div>
      </form>`;
  }

  function ask() {
    const pre = qs("q") || "";
    const fromCall = !!qs("q");
    const fromReq = qs("from") && TL.store.request(qs("from"));
    const seeds = ((fromReq && fromReq.screening) || TL.agents.SAMPLE_BRIEF.screening || []).slice(0, 3);
    while (seeds.length < 3) seeds.push("");
    const fields = seeds.map((s, i) => `<label class="field">Question ${i + 1}<input type="text" name="s${i + 1}" value="${esc(s)}" maxlength="300"></label>`).join("");
    const who = (fromReq && fromReq.who && fromReq.who.role) || "";
    return `<a class="back" href="index.html">Projects</a>
      <h1>${fromCall ? "Talk to someone else about this" : "Request a new call"}</h1>
      <p class="sub">Write the question, who does the work, and up to three things to ask.</p>
      <form data-act="ask">
        <label class="field">Your question<span>What do you need to understand?</span>
          <textarea name="q" required placeholder="How do freight brokers find new carriers?">${esc(pre)}</textarea>
        </label>
        <label class="field">Who you want to talk to<input type="text" name="who" value="${esc(who)}" placeholder="Freight coordinator"></label>
        ${fields}
        <div class="form-actions"><button class="btn" type="submit">Find people</button></div>
      </form>`;
  }

  function project() {
    const req = TL.store.request(qs("id"));
    if (!req) return `<h1>That project isn’t here.</h1><a class="btn" href="index.html">Projects</a>`;
    const state = TL.store.get();
    const people = peopleFor(req).map(({ p }) => personCard(req, p)).join("");
    const passed = (req.passed || []).map(person).filter(Boolean).map((p) => `<p class="role">${esc(p.name)} · ${esc(p.role)}</p>`).join("");
    const calls = state.bookings.filter((b) => b.requestId === req.id);
    const upcoming = calls.filter((b) => b.status === "confirmed").map((b) => {
      const p = person(b.personId);
      return `<article class="card"><h2 class="who">${esc(p ? p.name : "Call")} · ${esc(when(b.slot))}</h2><p class="sub">Scheduled. ${money(C.pricePerCallUsd)} for 30 minutes. Example only.</p><div style="margin-top:12px"><a class="btn" href="call.html?booking=${esc(b.id)}">Mark done</a></div></article>`;
    }).join("");
    const done = calls.filter((b) => b.status !== "confirmed").map((b) => {
      const p = person(b.personId);
      const text = b.summary || b.notes || "No notes.";
      return `<article class="card"><h2 class="who">${esc(p ? p.name : "Call")}</h2><p class="role">${esc(when(b.completedAt || b.slot))} · ${esc(b.status === "no-show" ? "No one joined" : b.status === "compliance-ended" ? "Ended to keep something confidential" : "Completed")}</p><div class="note">${esc(text)}</div><div style="margin-top:12px"><a class="btn secondary" href="request-new.html?q=${encodeURIComponent(req.title)}&from=${esc(req.id)}">Talk to someone else about this</a></div></article>`;
    }).join("");
    return `<a class="back" href="index.html">Projects</a>
      <div class="rowhead"><div><h1>${esc(req.title)}</h1></div>
      <a class="btn" href="request-new.html">Request a new call</a></div>
      <section class="section"><h2>People to talk to</h2>${people || "<p class='sub'>No one yet.</p>"}</section>
      <section class="section"><h2>Scheduled</h2>${upcoming || "<p class='sub'>None scheduled.</p>"}</section>
      <section class="section"><h2>Notes</h2>${done || "<p class='sub'>No notes yet.</p>"}</section>
      <section class="section"><h2>Not a fit</h2>${passed || "<p class='sub'>No one yet.</p>"}</section>`;
  }

  function nextSlots() {
    const hours = [9, 13, 16];
    const out = [];
    const day = new Date();
    day.setDate(day.getDate() + 1);
    day.setHours(0, 0, 0, 0);
    while (out.length < 3) {
      if (day.getDay() !== 0 && day.getDay() !== 6) {
        const at = new Date(day.getTime());
        at.setHours(hours[out.length], 0, 0, 0);
        out.push(at.toISOString());
      }
      day.setDate(day.getDate() + 1);
    }
    return out;
  }

  function book() {
    const requestId = qs("request") || qs("id");
    const personId = qs("person");
    const req = TL.store.request(requestId);
    const who = person(personId);
    if (!req || !who) return `<h1>Choose a person first.</h1><a class="btn" href="index.html">Projects</a>`;
    const existing = TL.store.get().bookings.find((b) => b.requestId === req.id && b.personId === who.id && b.status !== "cancelled");
    if (existing && existing.status === "confirmed") return `<h1>Already scheduled</h1><p class="sub">${esc(when(existing.slot))}</p><a class="btn" href="request.html?id=${esc(req.id)}">Back to the project</a>`;
    const radios = nextSlots().map((iso, i) => `<label><input type="radio" name="slot" value="${esc(iso)}" ${i === 0 ? "checked" : ""} required> ${esc(when(iso))}</label>`).join("");
    return `<a class="back" href="request.html?id=${esc(req.id)}">Back to the project</a>
      <h1>Book ${esc(who.name.split(" ")[0])}</h1>
      <p class="sub">${esc(who.role)}. ${money(C.pricePerCallUsd)} for 30 minutes. Example only. Nothing is charged.</p>
      <form data-act="schedule">
        <input type="hidden" name="request" value="${esc(req.id)}">
        <input type="hidden" name="person" value="${esc(who.id)}">
        <div class="times">${radios}</div>
        <div class="form-actions"><button class="btn" type="submit">Confirm · ${money(C.pricePerCallUsd)} for 30 min</button></div>
      </form>`;
  }

  function callPage() {
    const b = TL.store.get().bookings.find((x) => x.id === qs("booking"));
    if (!b) return `<h1>Call not found.</h1><a class="btn" href="index.html">Projects</a>`;
    const who = person(b.personId);
    const req = TL.store.request(b.requestId);
    if (b.status !== "confirmed") {
      return `<a class="back" href="${req ? "request.html?id=" + esc(req.id) : "index.html"}">Back to the project</a>
        <h1>${esc(who ? who.name : "Call")}</h1>
        <p class="sub">${esc(when(b.completedAt || b.slot))}</p>
        <div class="note">${esc(b.summary || b.notes || "No notes.")}</div>
        ${req ? `<div style="margin-top:16px"><a class="btn" href="request-new.html?q=${encodeURIComponent(req.title)}">Talk to someone else about this</a></div>` : ""}`;
    }
    return `<a class="back" href="${req ? "request.html?id=" + esc(req.id) : "index.html"}">Back to the project</a>
      <h1>Notes</h1>
      <p class="sub">${esc(who ? who.name : "")} · ${esc(when(b.slot))}. Write what you learned. It shows on the project after you save.</p>
      <form data-act="log" style="max-width:640px">
        <input type="hidden" name="booking" value="${esc(b.id)}">
        <input type="hidden" name="outcome" value="completed">
        <label class="field">Notes<textarea name="notes" id="notes" placeholder="What did they say?"></textarea></label>
        <div style="margin-top:16px"><button class="btn" type="submit">Save notes</button></div>
      </form>`;
  }

  function inbox() {
    const state = TL.store.get();
    const taker = state.callTaker;
    if (!taker) {
      return `<h1>Taking a call</h1>
        <p class="sub">Say what you do. Call requests that match stay in this browser. Example only. Nothing is emailed.</p>
        <p class="ex">Example data</p>
        <form data-act="taker">
          <label class="field">Name<input type="text" name="name" required></label>
          <label class="field">Email<input type="text" name="email" required></label>
          <label class="field">Role<input type="text" name="role" placeholder="Freight coordinator" required></label>
          <label class="field">Background<textarea name="background" placeholder="How you find carriers, cover a cancellation, or ask for a quote."></textarea></label>
          <div class="form-actions"><button class="btn" type="submit">Save</button></div>
        </form>`;
    }
    const open = state.requests.filter((req) => {
      const blob = (taker.role + " " + (taker.background || "")).toLowerCase();
      const freight = /freight|broker|dispatch|ship|carrier|load|truck|logistic/.test(blob);
      const hay = (req.title + " " + (req.who && req.who.role) + " " + (req.who && req.who.industry)).toLowerCase();
      const words = blob.split(/\W+/).filter((w) => w.length > 3);
      return freight || words.some((w) => hay.indexOf(w) >= 0);
    });
    const cards = open.map((req) => {
      const mine = (req.answers && req.answers.ct_self) || [];
      const qs = (req.screening || []).slice(0, 3);
      const fields = qs.map((q, i) => `<label class="field">${esc(q)}<input type="text" name="s${i + 1}" value="${esc(mine[i] || "")}"></label>`).join("");
      return `<article class="card"><h2 class="who">${esc(req.title)}</h2>
        <form data-act="screen">
          <input type="hidden" name="request" value="${esc(req.id)}">
          ${fields}
          <div class="form-actions">
            <button class="btn" type="submit" name="choice" value="accept">Send answers</button>
            <button class="btn secondary" type="submit" name="choice" value="decline">Decline</button>
          </div>
        </form></article>`;
    }).join("");
    const calls = state.bookings.filter((b) => b.personId === "ct_self").map((b) => `<article class="card"><h2 class="who">${esc(b.requestTitle)}</h2><p class="role">${esc(when(b.slot))} · ${esc(b.status)}</p><p class="sub">${money(C.expertPayoutUsd)} if the call happens. Example only. Nothing is paid.</p></article>`).join("");
    return `<h1>Taking a call</h1>
      <p class="sub">${esc(taker.name)}, ${esc(taker.role)}. Requests that match you.</p>
      <p class="ex">Example data</p>
      <section class="section"><h2>Requests</h2>${cards || "<p class='sub'>No requests yet.</p>"}</section>
      <section class="section"><h2>Scheduled</h2>${calls || "<p class='sub'>No calls yet.</p>"}</section>`;
  }

  function payouts() {
    const state = TL.store.get();
    const rows = state.bookings.filter((b) => b.personId === state.expertId).map((b) => {
      const pay = TL.store.payoutInfo(b);
      return `<tr><td>${esc(b.requestTitle)}</td><td>${esc(b.status)}</td><td>${money(pay.amount)}</td><td>${esc(pay.status)}</td></tr>`;
    }).join("");
    return `<h1>Payouts</h1><p class="sub">Paid for minutes completed, about ${C.payoutDays} days later. Example only. Nothing is transferred.</p>
      <table><thead><tr><th>Call</th><th>Status</th><th>Amount</th><th>Payout</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>None yet.</td></tr>"}</tbody></table>`;
  }

  function consent() {
    return `<a class="back" href="inbox.html">Invites</a>
      <h1>Employer consent</h1>
      <p class="sub">Optional. This copy is not sent anywhere.</p>
      <div class="card"><p>An employee may take short paid calls about how a type of work gets done, not about your company. They won’t share confidential information, material non-public information, or discuss their employer or a direct competitor. They are paid in full if they end a call to keep that line.</p>
      <p style="margin-top:16px">Company _______________________________</p>
      <p>Employee ______________________________</p>
      <p>Date __________________________________</p></div>`;
  }

  function signup() {
    const b = TL.store.get().buyer;
    return `<h1>Company</h1><p class="sub">Example only.</p>
      <form data-act="buyer" style="max-width:480px">
        <label class="field">Company<input type="text" name="company" value="${esc(b.company)}"></label>
        <label class="field">Name<input type="text" name="name" value="${esc(b.name)}"></label>
        <div style="margin-top:16px"><button class="btn" type="submit">Save</button></div>
      </form>`;
  }

  function admin() {
    const m = TL.store.metrics();
    return `<h1>Ops</h1><p class="sub">${m.requests} projects · ${m.booked} calls booked · ${money(m.spend)} spent · ${m.credits} credits left. Not linked in the main nav.</p>`;
  }

  const views = {
    home: projects,
    dashboard: projects,
    requestNew: ask,
    request: project,
    book: book,
    call: callPage,
    inbox: inbox,
    payouts: payouts,
    consent: consent,
    signup: signup,
    admin: admin,
    expert: inbox,
  };

  function paint() {
    const root = document.getElementById("app");
    if (!root) return;
    const page = root.dataset.page || "home";
    document.title = "Trenchline";
    const view = views[page] || projects;
    const expertish = page === "inbox" || page === "payouts" || page === "expert" || page === "consent";
    root.innerHTML = shell(expertish ? page : page, view());
  }

  function bookPerson(requestId, personId) {
    const req = TL.store.request(requestId);
    if (!req) return;
    const { inv, booking } = inviteState(req, personId);
    if (booking && booking.status === "confirmed") return go("call.html?booking=" + booking.id);
    if (inv && inv.status === "accepted" && inv.complianceAt) return go("book.html?invite=" + inv.id);
    if (inv && inv.status === "pending") return show(person(personId).name.split(" ")[0] + " still needs to accept.", true);
    const draft = req.outreach.find((o) => o.personId === personId && o.status === "draft");
    if (!draft) return show("No open ask for this person.", true);
    const res = TL.store.approveOutreach(requestId, draft.id);
    if (!res.ok) return show(res.error, true);
    const inv2 = TL.store.inviteFor(requestId, personId);
    if (inv2 && inv2.status === "accepted" && inv2.complianceAt) return go("book.html?invite=" + inv2.id, "They can take the call. Pick a time.");
    show((person(personId).name.split(" ")[0]) + " needs to accept before a time can be booked.");
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.type === "submit") return;
    if (b.dataset.act === "reset") { TL.store.reset(); go("index.html", "Example restored."); return; }
    if (b.dataset.act === "pass") {
      const res = TL.store.passPerson(b.dataset.request, b.dataset.person);
      return show(res.ok ? "Moved to not a fit." : res.error, !res.ok);
    }
    if (b.dataset.act === "book-person") return bookPerson(b.dataset.request, b.dataset.person);
    if (b.dataset.act === "accept") {
      const box = document.getElementById("ok-" + b.dataset.invite);
      if (!box || !box.checked) return show("Tick the confidentiality box first.", true);
      const res = TL.store.respondInvite(b.dataset.invite, true, true);
      if (!res.ok) return show(res.error, true);
      const inv = TL.store.get().invitations.find((i) => i.id === b.dataset.invite);
      return go("book.html?invite=" + b.dataset.invite, "Accepted. Pick a time.");
    }
    if (b.dataset.act === "decline") {
      const res = TL.store.respondInvite(b.dataset.invite, false, false);
      return show(res.ok ? "Declined." : res.error, !res.ok);
    }
    if (b.dataset.act === "credits") {
      TL.store.addCredits(4);
      return show("Added example credits.");
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-act]");
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    if (form.dataset.act === "ask") {
      const q = String(fd.get("q") || "").trim();
      if (!q) return show("Write the question.", true);
      const base = TL.agents.SAMPLE_BRIEF;
      const screening = [fd.get("s1"), fd.get("s2"), fd.get("s3")].map((s) => String(s || "").trim()).filter(Boolean).slice(0, 3);
      const who = String(fd.get("who") || "").trim();
      const res = TL.store.createRequest(Object.assign({}, base, { title: q, decision: q, role: who || base.role, screening: screening.length ? screening : base.screening.slice(0, 3) }));
      if (!res.ok) return show(res.error, true);
      return go("request.html?id=" + res.id, "Here are people for that question.");
    }
    if (form.dataset.act === "schedule") {
      const res = TL.store.scheduleCall(fd.get("request"), fd.get("person"), fd.get("slot"));
      if (!res.ok) return show(res.error, true);
      return go("request.html?id=" + fd.get("request"), "Call scheduled.");
    }
    if (form.dataset.act === "account") {
      const res = TL.store.saveAccount({ name: fd.get("name"), email: fd.get("email") });
      return show(res.ok ? "Saved." : res.error, !res.ok);
    }
    if (form.dataset.act === "taker") {
      const res = TL.store.saveCallTaker({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role"), background: fd.get("background") });
      return show(res.ok ? "Saved." : res.error, !res.ok);
    }
    if (form.dataset.act === "screen") {
      const answers = [fd.get("s1"), fd.get("s2"), fd.get("s3")];
      const accept = fd.get("choice") !== "decline";
      const res = TL.store.saveAnswers(fd.get("request"), "ct_self", answers, accept);
      if (!res.ok) return show(res.error, true);
      if (!accept) TL.store.passPerson(fd.get("request"), "ct_self");
      return show(accept ? "Answers saved. They show on the project." : "Declined.");
    }
    if (form.dataset.act === "book") {
      const res = TL.store.book(fd.get("invite"), fd.get("slot"));
      if (!res.ok) return show(res.error, true);
      const inv = TL.store.get().invitations.find((i) => i.id === fd.get("invite"));
      return go("request.html?id=" + (inv ? inv.requestId : ""), "Call scheduled.");
    }
    if (form.dataset.act === "log") {
      const res = TL.store.completeCall(fd.get("booking"), {
        outcome: "completed",
        minutes: C.callMinutes,
        notes: fd.get("notes"),
        summary: fd.get("notes"),
        recording: false,
        expertOptIn: false,
        rating: "",
      });
      if (!res.ok) return show(res.error, true);
      const b = TL.store.get().bookings.find((x) => x.id === fd.get("booking"));
      return go("request.html?id=" + b.requestId, "Notes saved.");
    }
    if (form.dataset.act === "buyer") {
      const cur = TL.store.get().buyer;
      const res = TL.store.saveBuyer(Object.assign({}, cur, { company: fd.get("company"), name: fd.get("name") }));
      return show(res.ok ? "Saved." : res.error, !res.ok);
    }
  });

  function peopleList(req) {
    const people = peopleFor(req).map(({ p }) => personCard(req, p)).join("");
    return `<a class="back" href="index.html">Projects</a>
      <h1>${esc(req.title)}</h1>
      <section class="section"><h2>People to talk to</h2>${people || "<p class='sub'>No one yet.</p>"}</section>`;
  }

  function startFromQuestion(root, q) {
    root.innerHTML = shell("home", `<h1>${esc(q)}</h1><p class="sub" id="finding">Finding people who do this work...</p>`);
    setTimeout(() => {
      const key = "tl.q." + q;
      let id = sessionStorage.getItem(key);
      let req = id && TL.store.request(id);
      if (!req) {
        const brief = TL.agents.SAMPLE_BRIEF;
        const res = TL.store.createRequest(Object.assign({}, brief, { title: q, decision: q, screening: (brief.screening || []).slice(0, 3) }));
        if (!res.ok) {
          root.innerHTML = shell("home", `<h1>${esc(q)}</h1><p class="sub">${esc(res.error)}</p><p style="margin-top:16px"><a class="btn" href="index.html">Projects</a></p>`);
          return;
        }
        id = res.id;
        sessionStorage.setItem(key, id);
        req = TL.store.request(id);
      }
      views.home = function () {
        const current = TL.store.request(id);
        return current ? peopleList(current) : projects();
      };
      setTimeout(paint, 1000);
    }, 40);
  }

  function boot() {
    if (document.body.dataset.booted) return;
    document.body.dataset.booted = "1";
    const root = document.getElementById("app");
    const q = (qs("q") || "").trim();
    if (root && (root.dataset.page || "home") === "home" && q) {
      startFromQuestion(root, q);
      return;
    }
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
