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
    return req.matches
      .filter((m) => !m.excluded && m.grade !== "X")
      .slice(0, 5)
      .map((m) => ({ m, p: person(m.personId) }))
      .filter((x) => x.p);
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
      <h2 style="font-size:18px;font-weight:650">${esc(r.title)} ${r.example ? '<span class="ex">Example</span>' : ""}</h2>
      <p class="role" style="color:var(--muted);margin-top:4px">${esc(projectBlurb(r))}</p>
    </a>`).join("");
    return `<div class="rowhead"><div><h1>Projects</h1><p class="sub">Each project is one question. Open it to see who you can talk to, and the calls already on the calendar.</p></div>
      <a class="btn" href="request-new.html">Request a new call</a></div>${cards || "<p class='sub'>No projects yet.</p>"}`;
  }

  function ask() {
    const pre = qs("q") || TL.agents.SAMPLE_BRIEF.title;
    const fromCall = !!qs("q");
    return `<a class="back" href="index.html">Projects</a>
      <h1>${fromCall ? "Talk to someone else about this" : "Request a new call"}</h1>
      <p class="sub">${fromCall ? "Parker will look for other people on the same question." : "Write the question. Parker will come back with people who do that work."} ${fromCall ? "" : "An example is filled in."}</p>
      <form data-act="ask" style="max-width:640px">
        <label class="field">Your question<span>What do you need to understand?</span>
          <textarea name="q" required>${esc(pre)}</textarea>
        </label>
        <div style="margin-top:16px"><button class="btn" type="submit">Find people</button></div>
      </form>`;
  }

  function project() {
    const req = TL.store.request(qs("id"));
    if (!req) return `<h1>That project isn’t here.</h1><a class="btn" href="index.html">Projects</a>`;
    const state = TL.store.get();
    const people = peopleFor(req).map(({ m, p }) => {
      const { inv, booking } = inviteState(req, p.id);
      let action = `<button class="btn" type="button" data-act="book-person" data-request="${esc(req.id)}" data-person="${esc(p.id)}">Book call</button>`;
      if (booking && booking.status === "confirmed") action = `<a class="btn secondary" href="call.html?booking=${esc(booking.id)}">Scheduled</a>`;
      else if (booking) action = `<span class="ex">Already spoke</span>`;
      else if (inv && inv.status === "pending") action = `<span class="ex">Waiting for them to accept</span>`;
      return `<article class="card"><div class="person"><div class="init">${esc(initials(p.name))}</div><div><h2>${esc(p.name)} ${p.example ? '<span class="ex">Example</span>' : ""}</h2><p class="role">${esc(why(p))}</p></div><div class="actions">${action}</div></div></article>`;
    }).join("");
    const calls = state.bookings.filter((b) => b.requestId === req.id);
    const upcoming = calls.filter((b) => b.status === "confirmed").map((b) => {
      const p = person(b.personId);
      return `<article class="card"><h2 style="font-size:17px">${esc(p ? p.name : "Call")} · ${esc(when(b.slot))}</h2><p class="sub">Scheduled. ${money(C.pricePerCallUsd)}.</p><div style="margin-top:12px"><a class="btn" href="call.html?booking=${esc(b.id)}">Add notes</a></div></article>`;
    }).join("");
    const done = calls.filter((b) => b.status !== "confirmed").map((b) => {
      const p = person(b.personId);
      const text = b.summary || b.notes || "No notes.";
      return `<article class="card"><h2 style="font-size:17px">${esc(p ? p.name : "Call")} ${b.example ? '<span class="ex">Example</span>' : ""}</h2><p class="role" style="color:var(--muted)">${esc(when(b.completedAt || b.slot))} · ${esc(b.status === "no-show" ? "No one joined" : b.status === "compliance-ended" ? "Ended to keep something confidential" : "Completed")}</p><div class="note">${esc(text)}</div><div style="margin-top:12px"><a class="btn secondary" href="request-new.html?q=${encodeURIComponent(req.title)}">Talk to someone else about this</a></div></article>`;
    }).join("");
    const top = peopleFor(req)[0];
    const parker = top ? `Parker: I’d start with ${top.p.name.split(" ")[0]}. ${top.p.role}, ${top.p.yearsLabel}.` : "Parker hasn’t found anyone for this yet.";
    return `<a class="back" href="index.html">Projects</a>
      <div class="rowhead"><div><h1>${esc(req.title)} ${req.example ? '<span class="ex">Example</span>' : ""}</h1>${req.decision && req.decision !== req.title ? `<p class="sub">${esc(req.decision)}</p>` : ""}</div>
      <a class="btn" href="request-new.html">Request a new call</a></div>
      <div class="msg"><b>Parker</b><p>${esc(parker)}</p></div>
      <section class="section"><h2>People to talk to</h2>${people || "<p class='sub'>No one yet.</p>"}</section>
      <section class="section"><h2>Scheduled</h2>${upcoming || "<p class='sub'>None scheduled.</p>"}</section>
      <section class="section"><h2>Completed</h2>${done || "<p class='sub'>No completed calls.</p>"}</section>`;
  }

  function book() {
    const state = TL.store.get();
    const inv = state.invitations.find((i) => i.id === qs("invite"));
    if (!inv) return `<h1>Choose a person first.</h1><a class="btn" href="index.html">Projects</a>`;
    const who = person(inv.personId);
    const req = TL.store.request(inv.requestId);
    const existing = state.bookings.find((b) => b.inviteId === inv.id && b.status !== "cancelled");
    if (existing) return `<h1>Already scheduled</h1><p class="sub">${esc(when(existing.slot))}</p><a class="btn" href="request.html?id=${esc(inv.requestId)}">Back to the project</a>`;
    const slots = TL.store.slots(who.id).filter((s) => !s.taken).slice(0, 5);
    const radios = slots.map((s, i) => `<label><input type="radio" name="slot" value="${esc(s.iso)}" ${i === 0 ? "checked" : ""} required> ${esc(when(s.iso))}</label>`).join("");
    return `<a class="back" href="request.html?id=${esc(inv.requestId)}">Back to the project</a>
      <h1>Book ${esc(who.name.split(" ")[0])}</h1>
      <p class="sub">${esc(who.role)}. ${money(C.pricePerCallUsd)} for 30 minutes. Pick a time.</p>
      <form data-act="book">
        <input type="hidden" name="invite" value="${esc(inv.id)}">
        <div class="times">${radios || "<p>No open times.</p>"}</div>
        <div style="margin-top:16px"><button class="btn" type="submit" ${state.credits.balance < 1 ? "disabled" : ""}>Confirm time</button></div>
        ${state.credits.balance < 1 ? '<p class="sub">No example credits left. <button class="link" type="button" data-act="credits" style="background:none;border:0;color:var(--accent);padding:0">Add example credits</button></p>' : ""}
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
    const who = TL.store.self();
    const mine = state.invitations.filter((i) => i.personId === state.expertId);
    const cards = mine.map((inv) => {
      const req = TL.store.request(inv.requestId);
      if (inv.status === "pending") {
        return `<article class="card"><h2 style="font-size:18px">${esc(req ? req.title : "A call")}</h2>
          <p class="sub">${esc(req ? req.decision : "")} Not about ${esc(who.employer)}. ${money(C.expertPayoutUsd)} if the call happens. Nothing if no one joins. Paid in full if you end it to keep something confidential.</p>
          <label class="check"><input type="checkbox" id="ok-${esc(inv.id)}"> I will not share confidential information, material non-public information, or talk about my employer or a direct competitor.</label>
          <button class="btn" type="button" data-act="accept" data-invite="${esc(inv.id)}">Accept</button>
          <button class="btn secondary" type="button" data-act="decline" data-invite="${esc(inv.id)}" style="margin-left:8px">Decline</button>
          <p style="margin-top:10px"><a href="consent.html">Employer consent form</a>, if you need it.</p>
        </article>`;
      }
      return `<article class="card"><h2 style="font-size:17px">${esc(req ? req.title : "Call")}</h2><p class="sub">${esc(inv.status)}</p></article>`;
    }).join("");
    return `<div class="rowhead"><div><h1>Invites</h1><p class="sub">${esc(who.name)}, example profile. Accept or decline. The client books the time.</p></div></div>
      ${cards || "<p class='sub'>No invites.</p>"}`;
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
      const res = TL.store.createRequest(Object.assign({}, base, { title: q, decision: q }));
      if (!res.ok) return show(res.error, true);
      return go("request.html?id=" + res.id, "Here are people for that question.");
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

  function boot() {
    if (document.body.dataset.booted) return;
    document.body.dataset.booted = "1";
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
