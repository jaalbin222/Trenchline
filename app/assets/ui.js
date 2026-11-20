/* Buyer-facing app. Parker is the project manager. Grades stay behind him. */
(function () {
  const TL = (window.TL = window.TL || {});
  const C = TL.CONFIG;
  const AV = ["#e3efe8|#0f5f46", "#ffe9b8|#7a5200", "#e6e3f7|#3a2f8a", "#f2dfd7|#8a3a22", "#dfe6f2|#2e4a7a"];

  let banner = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function money(n) {
    const v = Math.round(Number(n) * 100) / 100;
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }
  function avStyle(name) {
    let h = 0;
    for (let i = 0; i < String(name).length; i++) h = (h + name.charCodeAt(i)) % AV.length;
    const [bg, fg] = AV[h].split("|");
    return `background:${bg};color:${fg}`;
  }
  function when(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function flash(msg) { sessionStorage.setItem("tl.flash", msg); }
  function takeFlash() {
    const m = sessionStorage.getItem("tl.flash");
    sessionStorage.removeItem("tl.flash");
    return m;
  }
  function go(url, msg) { if (msg) flash(msg); location.href = url; }
  function person(id) { return TL.store.get().pool.find((p) => p.id === id); }

  function shell(page, body) {
    const links = [
      ["index.html", "Calls", "home"],
      ["request-new.html", "Ask Parker", "requestNew"],
      ["inbox.html", "Taking a call", "inbox"],
      ["admin.html", "Ops", "admin"],
    ];
    const note = banner;
    banner = null;
    const flashed = takeFlash();
    const msg = note ? `<div class="notice ${note.bad ? "bad" : ""}">${esc(note.text)}</div>` : flashed ? `<div class="notice">${esc(flashed)}</div>` : "";
    return `<div class="bg-lines"></div><div class="stage">
      <header class="top">
        <a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="28" height="28">Trenchline</a>
        <nav class="nav">${links.map(([href, label, id]) => `<a class="${page === id || (page === "dashboard" && id === "home") ? "on" : ""}" href="${href}">${label}</a>`).join("")}</nav>
      </header>
      ${msg}
      ${body}
      <p class="fine" style="margin-top:36px">Example only · ${money(C.pricePerCallUsd)} a call · nothing is sent or paid · <button class="link" type="button" data-act="reset">Restore example</button></p>
    </div>`;
  }

  function drafts(req) {
    return req.outreach
      .filter((o) => o.status === "draft")
      .map((o) => ({ o, m: req.matches.find((x) => x.personId === o.personId) }))
      .filter((x) => x.m && !x.m.excluded)
      .sort((a, b) => b.m.score - a.m.score);
  }

  function nextFor(req) {
    const state = TL.store.get();
    const invite = state.invitations.find((i) => i.requestId === req.id && i.status === "accepted" && i.complianceAt && !state.bookings.some((b) => b.inviteId === i.id && b.status !== "cancelled"));
    if (invite) return { kind: "book", invite, person: person(invite.personId) };
    const waiting = state.invitations.find((i) => i.requestId === req.id && i.status === "pending");
    if (waiting) return { kind: "wait", invite: waiting, person: person(waiting.personId) };
    const top = drafts(req)[0];
    if (top) return { kind: "approve", outreach: top.o, person: person(top.o.personId) };
    const upcoming = state.bookings.find((b) => b.requestId === req.id && b.status === "confirmed");
    if (upcoming) return { kind: "join", booking: upcoming, person: person(upcoming.personId) };
    return { kind: "none" };
  }

  function buyerNext() {
    const state = TL.store.get();
    for (const req of state.requests) {
      const n = nextFor(req);
      if (n.kind === "book" || n.kind === "approve") return Object.assign({ req }, n);
    }
    for (const req of state.requests) {
      const n = nextFor(req);
      if (n.kind === "join") return Object.assign({ req }, n);
    }
    return { kind: "ask" };
  }

  function parkerLine(req) {
    const names = req.matches.filter((m) => !m.excluded && m.grade !== "D" && m.grade !== "X").slice(0, 2).map((m) => person(m.personId)).filter(Boolean);
    if (!names.length) return "I don’t have a strong person for this yet.";
    return names.map((p, i) => `${p.name.split(" ")[0]} ${i === 0 ? "is the one I’d start with" : "is a second view"} — ${p.role.toLowerCase()}, ${p.yearsLabel}.`).join(" ");
  }

  function callCard(b) {
    const who = person(b.personId);
    const label = b.status === "confirmed" ? "Upcoming" : b.status === "completed" ? "Note saved" : b.status;
    return `<a class="pc" href="call.html?booking=${esc(b.id)}">
      <div class="top"><div class="av" style="${avStyle(who ? who.name : "")}">${esc(initials(who ? who.name : "?"))}</div>
      <div><h3>${esc(who ? who.name : "Call")}</h3><p>${esc(b.requestTitle || "")}</p></div></div>
      <div class="meta"><span>${esc(when(b.slot))}</span><b>${esc(label)}</b></div>
    </a>`;
  }

  function home() {
    const state = TL.store.get();
    const next = buyerNext();
    let hero = "";
    if (next.kind === "approve") {
      hero = `<p class="eyebrow">Parker</p>
        <h1><span class="up">${esc(next.req.title)}</span>Book <mark class="hl">${esc(next.person.name.split(" ")[0])}.</mark></h1>
        <p class="sub">${esc(parkerLine(next.req))} Half an hour, ${money(C.pricePerCallUsd)}. I won’t contact them until you say so. Here or by email — same conversation.</p>
        <div class="actions"><button class="btn" type="button" id="primary" data-act="primary" data-request="${esc(next.req.id)}">Book ${esc(next.person.name.split(" ")[0])}</button></div>
        <p style="margin-top:14px"><a class="link" href="request.html?id=${esc(next.req.id)}">The whole note</a></p>`;
    } else if (next.kind === "book") {
      hero = `<p class="eyebrow">Parker</p>
        <h1><span class="up">${esc(next.person.name)} can talk</span>Pick a <mark class="hl">time.</mark></h1>
        <p class="sub">${esc(next.req.decision)}</p>
        <div class="actions"><a class="btn" href="book.html?invite=${esc(next.invite.id)}">Book ${esc(next.person.name.split(" ")[0])}</a></div>`;
    } else if (next.kind === "join") {
      hero = `<p class="eyebrow">Next</p>
        <h1><span class="up">${esc(when(next.booking.slot))}</span>with <mark class="hl">${esc(next.person.name.split(" ")[0])}.</mark></h1>
        <div class="actions"><a class="btn" href="call.html?booking=${esc(next.booking.id)}">Open the call</a></div>`;
    } else {
      hero = `<p class="eyebrow">Parker</p>
        <h1><span class="up">Nothing waiting.</span>Ask <mark class="hl">Parker.</mark></h1>
        <div class="actions"><a class="btn" href="request-new.html">Ask a question</a></div>`;
    }
    const calls = state.bookings.slice(0, 4).map(callCard).join("") || `<p class="sub">No calls yet.</p>`;
    return `${hero}<section style="margin-top:36px"><p class="fine">Your calls</p><div class="layout" style="margin-top:8px"><div class="stack">${calls}</div>
      <div class="ledger"><h5>A call</h5><div class="row"><span>30 minutes</span><span>flat</span></div><div class="row us"><span>You pay</span><span>${money(C.pricePerCallUsd)}</span></div></div></div></section>`;
  }

  function requestNew() {
    const b = TL.agents.SAMPLE_BRIEF;
    const opt = (list, cur) => list.map((o) => `<option ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("");
    return `<p class="eyebrow">To Parker</p>
      <h1><span class="up">One question.</span>What do you need to <mark class="hl">understand?</mark></h1>
      <p class="sub">Parker will find two people. You only have to say what the call should decide. The rest is already filled in.</p>
      <form data-act="request" style="max-width:640px">
        <label class="field">The question<span>In your words</span><textarea class="in" name="title" required>${esc(b.title)}</textarea></label>
        <label class="field">What decision will this call inform?<span>Required. Parker repeats it.</span><textarea class="in" name="decision" required>${esc(b.decision)}</textarea></label>
        <details>
          <summary>More, if you want to change the defaults</summary>
          <label class="field">Who<span>Role</span><input class="in" name="role" value="${esc(b.role)}"></label>
          <label class="field">Function<select class="in" name="fn">${opt(["Finance", "Operations", "Compliance", "Product", "Sales", "Other"], b.fn)}</select></label>
          <label class="field">Industry<select class="in" name="industry">${opt(["Financial services", "Fintech", "Payments", "Accounting", "Software", "Healthcare", "Manufacturing", "Other"], b.industry)}</select></label>
          <label class="field">Company type<input class="in" name="companyType" value="${esc(b.companyType)}"></label>
          <label class="field">Company size<input class="in" name="companySize" value="${esc(b.companySize)}"></label>
          <label class="field">Years in the role<input class="in" name="years" value="${esc(b.years)}"></label>
          <label class="field">Geography<input class="in" name="geography" value="${esc(b.geography)}"></label>
          <label class="field">Start with<input class="in" name="targetCompanies" value="${esc(b.targetCompanies)}"></label>
          <label class="field">Companies to avoid<input class="in" name="avoid" value="${esc(b.avoidCompanies.join(", "))}"></label>
          <label class="field">If they’ve left, how recently<input class="in" name="formerWithin" value="${esc(b.formerWithin)}"></label>
          <label class="field">How many calls<input class="in" name="calls" type="number" min="1" max="10" value="${esc(b.calls)}"></label>
          <label class="field">By when<input class="in" name="timeline" value="${esc(b.timeline)}"></label>
          <label class="field">Questions for them<span>One per line</span><textarea class="in" name="screening">${esc(b.screening.join("\n"))}</textarea></label>
          <label class="field">What “good” means<input class="in" name="qualify" value="${esc(b.qualify)}"></label>
          <label class="field">Send profiles to<input class="in" name="profilesTo" value="${esc(b.profilesTo)}"></label>
          <label class="field">Put the invite on<input class="in" name="calendarTo" value="${esc(b.calendarTo)}"></label>
          <label class="field">Updates<select class="in" name="updates"><option value="rolling" selected>As they’re ready</option><option value="digest">Morning and end of day</option></select></label>
        </details>
        <div class="actions"><button class="btn" type="submit">Send to Parker</button></div>
      </form>`;
  }

  function requestPage() {
    const req = TL.store.request(qs("id"));
    if (!req) return `<h1><span class="up">Missing.</span>That question <mark class="hl">isn’t here.</mark></h1><a class="btn" href="index.html">Back to calls</a>`;
    const next = nextFor(req);
    const state = TL.store.get();
    let button = "";
    if (next.kind === "approve") button = `<button class="btn" type="button" id="primary" data-act="primary" data-request="${esc(req.id)}">Book ${esc(next.person.name.split(" ")[0])}</button>`;
    else if (next.kind === "book") button = `<a class="btn" href="book.html?invite=${esc(next.invite.id)}">Book ${esc(next.person.name.split(" ")[0])}</a>`;
    else if (next.kind === "wait") button = `<a class="btn" href="inbox.html">See ${esc(next.person.name.split(" ")[0])}’s reply</a>`;
    else if (next.kind === "join") button = `<a class="btn" href="call.html?booking=${esc(next.booking.id)}">Open the call</a>`;
    const similar = qs("similar") ? person(qs("similar")) : null;
    const how = req.matches.map((m) => {
      const p = person(m.personId);
      const out = req.outreach.find((o) => o.personId === m.personId);
      return `<article class="pc"><div class="top"><div class="av" style="${avStyle(p.name)}">${esc(initials(p.name))}</div><div><h3>${esc(p.name)} <span class="fine">${esc(m.excluded ? "skipped" : m.grade)}</span></h3><p>${esc(p.role)} · ${esc(p.yearsLabel)}</p></div></div><p>${m.reasons.map(esc).join(" ")}</p>${out && out.status === "draft" ? `<div class="actions"><button class="btn ghost" type="button" data-act="approve" data-request="${esc(req.id)}" data-outreach="${esc(out.id)}">Ask ${esc(p.name.split(" ")[0])}</button><button class="link" type="button" data-act="skip" data-request="${esc(req.id)}" data-outreach="${esc(out.id)}">Skip</button></div>` : `<p class="fine" style="margin-top:8px">${esc(out ? out.status : "")}</p>`}</article>`;
    }).join("");
    const calls = state.bookings.filter((b) => b.requestId === req.id).map(callCard).join("");
    return `<p class="eyebrow">Parker · ${esc(req.title)}</p>
      <h1><span class="up">${esc(req.decision)}</span>${next.person ? `Book <mark class="hl">${esc(next.person.name.split(" ")[0])}.</mark>` : `That’s the <mark class="hl">question.</mark>`}</h1>
      ${similar ? `<p class="sub">Looking for someone like ${esc(similar.name)}.</p>` : ""}
      <article class="msg"><div class="who"><span class="av" style="background:#ffe36e;color:#151513;width:32px;height:32px">P</span>Parker <span>also in your email</span></div>
        <p>${esc(parkerLine(req))}</p>
        <p class="fine" style="margin-top:10px">Same conversation if you reply to the email.</p>
      </article>
      <div class="actions">${button}<a class="link" href="#how">How Parker chose</a></div>
      ${calls ? `<section style="margin-top:28px"><p class="fine">Calls on this question</p>${calls}</section>` : ""}
      <details id="how" ${qs("how") ? "open" : ""}>
        <summary>How Parker chose</summary>
        <p class="sub" style="margin:8px 0 12px">${esc(req.icp.text)}</p>
        ${how}
        <form data-act="rules" style="max-width:420px">
          <input type="hidden" name="request" value="${esc(req.id)}">
          <label class="check"><input type="checkbox" name="stop" ${req.rules.stopWhenBooked ? "checked" : ""}> Stop once ${esc(String(req.calls))} ${req.calls === 1 ? "is" : "are"} booked</label>
          <label class="field">LinkedIn a day<input class="in" name="li" type="number" value="${esc(req.rules.linkedinDailyCap)}"></label>
          <label class="field">Email a day<input class="in" name="em" type="number" value="${esc(req.rules.emailDailyCap)}"></label>
          <label class="field">Don’t contact<input class="in" name="dnc" value="${esc(req.rules.dnc.join(", "))}"></label>
          <div class="actions"><button class="btn ghost" type="submit">Save those rules</button></div>
        </form>
      </details>`;
  }

  function bookPage() {
    const state = TL.store.get();
    const inv = state.invitations.find((i) => i.id === qs("invite"));
    if (!inv) return `<h1><span class="up">No time picked.</span>Go back to <mark class="hl">Parker.</mark></h1><a class="btn" href="index.html">Calls</a>`;
    const who = person(inv.personId);
    const req = TL.store.request(inv.requestId);
    const existing = state.bookings.find((b) => b.inviteId === inv.id && b.status !== "cancelled");
    if (existing) return `<h1><span class="up">Already booked.</span>${esc(when(existing.slot))}</h1><a class="btn" href="call.html?booking=${esc(existing.id)}">Open it</a>`;
    const slots = TL.store.slots(who.id).filter((s) => !s.taken).slice(0, 4);
    const radios = slots.map((s, i) => `<label class="check"><input type="radio" name="slot" value="${esc(s.iso)}" ${i === 0 ? "checked" : ""} required> ${esc(when(s.iso))}</label>`).join("");
    return `<p class="eyebrow">${esc(req ? req.title : "Call")}</p>
      <h1><span class="up">${esc(who.name)}</span>Pick a <mark class="hl">time.</mark></h1>
      <p class="sub">${money(C.pricePerCallUsd)} for half an hour. One example credit. Nothing is charged.</p>
      <form data-act="book" class="layout">
        <div>
          <input type="hidden" name="invite" value="${esc(inv.id)}">
          ${radios || "<p>No open times.</p>"}
          <div class="actions"><button class="btn" type="submit" ${state.credits.balance < 1 ? "disabled" : ""}>Confirm</button>
          ${state.credits.balance < 1 ? '<button class="btn ghost" type="button" data-act="credits">Add example credits</button>' : ""}</div>
        </div>
        <div class="ledger"><h5>This call</h5><div class="row"><span>${esc(who.name.split(" ")[0])}</span><span>30 min</span></div><div class="row us"><span>You pay</span><span>${money(C.pricePerCallUsd)}</span></div><div class="row"><span>Credits left</span><span>${state.credits.balance}</span></div></div>
      </form>`;
  }

  function callPage() {
    const state = TL.store.get();
    const b = state.bookings.find((x) => x.id === qs("booking"));
    if (!b) return `<h1>No call.</h1><a class="btn" href="index.html">Calls</a>`;
    const who = person(b.personId);
    const req = TL.store.request(b.requestId);
    if (b.status !== "confirmed") {
      const pay = TL.store.payoutInfo(b);
      return `<p class="eyebrow">${esc(b.status)}</p>
        <h1><span class="up">${esc(who ? who.name : "Call")}</span>${esc(b.requestTitle)}</h1>
        <div class="layout">
          <article class="msg"><p>${esc(b.summary || b.notes || "No note yet.")}</p><p class="fine" style="margin-top:12px">${esc(b.notes && b.summary ? b.notes : "")}</p></article>
          <div>
            <div class="ledger"><h5>After</h5><div class="row"><span>Rating</span><span>${b.rating || "—"}</span></div><div class="row"><span>Recording</span><span>${b.recording ? "both said yes" : "off"}</span></div><div class="row us"><span>Practitioner</span><span>${money(pay.amount)}</span></div></div>
            ${req ? `<div class="actions"><a class="btn" href="request.html?id=${esc(req.id)}&similar=${esc(who.id)}">Book another like ${esc(who.name.split(" ")[0])}</a></div>` : ""}
          </div>
        </div>`;
    }
    return `<p class="eyebrow">${esc(when(b.slot))}</p>
      <h1><span class="up">You’re booked</span>with <mark class="hl">${esc(who ? who.name.split(" ")[0] : "them")}.</mark></h1>
      <p class="sub">When you’ve talked, leave a note. Parker will turn it into a short brief.</p>
      <form data-act="log" style="max-width:640px">
        <input type="hidden" name="booking" value="${esc(b.id)}">
        <label class="field">How it ended<select class="in" name="outcome" id="outcome"><option value="completed">We talked</option><option value="no-show">Nobody showed</option><option value="compliance-ended">They stopped to keep a confidence</option></select></label>
        <label class="field">Minutes<input class="in" name="minutes" id="minutes" type="number" min="1" max="180" value="${C.callMinutes}"></label>
        <p class="fine" id="preview" style="margin-top:8px"></p>
        <label class="field">What you heard<textarea class="in" name="notes" id="notes" placeholder="A few sentences."></textarea></label>
        <label class="field">Parker’s brief<textarea class="in" name="summary" id="summary"></textarea></label>
        <button class="link" type="button" data-act="draft" style="margin-top:8px">Draft the brief</button>
        <label class="check"><input type="checkbox" name="recording"> Ask for a recording</label>
        <label class="check"><input type="checkbox" name="expertOptIn"> They agreed too</label>
        <label class="field">Rating<select class="in" name="rating"><option value="">Skip</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
        <div class="actions"><button class="btn" type="submit">Save the note</button></div>
      </form>`;
  }

  function inbox() {
    TL.store.setRole("expert");
    const state = TL.store.get();
    const who = TL.store.self();
    const mine = state.invitations.filter((i) => i.personId === state.expertId);
    const pending = mine.filter((i) => i.status === "pending");
    const first = pending[0];
    let hero = `<h1><span class="up">Nothing new.</span>You’re <mark class="hl">clear.</mark></h1>`;
    if (first) {
      const req = TL.store.request(first.requestId);
      const left = Math.max(0, C.inviteResponseHours * 3600000 - (Date.now() - Date.parse(first.sentAt)));
      const hrs = Math.floor(left / 3600000);
      hero = `<p class="eyebrow">${hrs}h left to answer</p>
        <h1><span class="up">${esc(req ? req.title : "A call")}</span>Can you <mark class="hl">talk?</mark></h1>
        <p class="sub">${esc(req ? req.decision : "")} Not about ${esc(who.employer)}. Half an hour. ${money(C.expertPayoutUsd)} if it happens.</p>
        <div class="actions"><button class="btn" type="button" data-act="accept" data-invite="${esc(first.id)}">Yes. I won’t share anything confidential.</button>
        <button class="link" type="button" data-act="decline" data-invite="${esc(first.id)}">No</button></div>`;
    }
    const rest = mine.filter((i) => i !== first).map((i) => {
      const req = TL.store.request(i.requestId);
      return `<article class="pc"><h3>${esc(req ? req.title : "Call")}</h3><p>${esc(i.status)}</p>${i.status === "accepted" ? `<a class="link" href="book.html?invite=${esc(i.id)}">Times</a>` : ""}</article>`;
    }).join("");
    return `${hero}<p style="margin-top:18px"><a class="link" href="consent.html">Employer consent, if you want it</a> · <a class="link" href="payouts.html">What you’ll be paid</a> · <a class="link" href="expert.html">Your profile</a></p>${rest ? `<section style="margin-top:24px"><p class="fine">Other invites</p>${rest}</section>` : ""}`;
  }

  function expertPage() {
    const who = TL.store.self();
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const times = ["09:00", "12:00", "16:00", "16:30"];
    const chips = [];
    days.forEach((d) => times.forEach((t) => {
      const slot = d + " " + t;
      chips.push(`<label class="check"><input type="checkbox" name="availability" value="${esc(slot)}" ${(who.availability || []).indexOf(slot) >= 0 ? "checked" : ""}>${esc(slot)}</label>`);
    }));
    return `<p class="eyebrow">Your profile · example</p>
      <h1><span class="up">${esc(who.name)}</span>Keep it <mark class="hl">fictional.</mark></h1>
      <form data-act="expert" style="max-width:640px">
        <label class="field">Name<input class="in" name="name" value="${esc(who.name)}"></label>
        <label class="field">Role<input class="in" name="role" value="${esc(who.role)}"></label>
        <label class="field">Years<input class="in" name="years" type="number" step="0.5" value="${esc(who.years)}"></label>
        <label class="field">How it should read<input class="in" name="yearsLabel" value="${esc(who.yearsLabel)}"></label>
        <label class="field">Function<input class="in" name="fn" value="${esc(who.fn)}"></label>
        <label class="field">Industry<input class="in" name="industry" value="${esc(who.industry)}"></label>
        <label class="field">Employer<span>Calls are not about them</span><input class="in" name="employer" value="${esc(who.employer)}"></label>
        <label class="field">What kind of company<input class="in" name="employerType" value="${esc(who.employerType)}"></label>
        <label class="field">Where<input class="in" name="geography" value="${esc(who.geography)}"></label>
        <label class="field">Topics<input class="in" name="topics" value="${esc((who.topics || []).join(", "))}"></label>
        <label class="field">A line about the work<textarea class="in" name="bio">${esc(who.bio)}</textarea></label>
        <label class="field">What you won’t discuss<textarea class="in" name="wont">${esc(who.wont)}</textarea></label>
        <p class="fine" style="margin-top:16px">Times you can talk</p>
        ${chips.join("")}
        <label class="check"><input type="checkbox" name="confidential" checked required> I won’t share confidential information.</label>
        <label class="check"><input type="checkbox" name="mnpi" checked required> I won’t share material non-public information.</label>
        <label class="check"><input type="checkbox" name="employerOk" checked required> I won’t discuss my employer or a direct competitor.</label>
        <div class="actions"><button class="btn" type="submit">Save</button></div>
      </form>`;
  }

  function payouts() {
    const state = TL.store.get();
    const rows = state.bookings.filter((b) => b.personId === state.expertId).map((b) => {
      const pay = TL.store.payoutInfo(b);
      return `<tr><td>${esc(b.requestTitle)}</td><td>${esc(b.status)}</td><td>${esc(String(b.minutes || 0))}</td><td>${money(pay.amount)}</td><td>${esc(pay.status)}</td></tr>`;
    }).join("");
    const due = state.bookings.filter((b) => b.personId === state.expertId).reduce((s, b) => s + TL.store.payoutInfo(b).amount, 0);
    return `<p class="eyebrow">Payouts · example</p>
      <h1><span class="up">For the minutes</span>you <mark class="hl">talked.</mark></h1>
      <p class="sub">Nothing if nobody shows. The full ${money(C.expertPayoutUsd)} if you stop the call to keep a confidence. About ${C.payoutDays} days later. No money moves.</p>
      <div class="ledger" style="max-width:360px"><h5>On the example ledger</h5><div class="row us"><span>Shown here</span><span>${money(due)}</span></div></div>
      <table style="margin-top:18px"><thead><tr><th>Call</th><th>Status</th><th>Min</th><th>Pay</th><th>When</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function admin() {
    const state = TL.store.get();
    const m = TL.store.metrics();
    const rate = m.rate == null ? "—" : Math.round(m.rate * 100) + "%";
    return `<p class="eyebrow">Ops</p>
      <h1><span class="up">A light look</span>at the <mark class="hl">book.</mark></h1>
      <div class="layout">
        <div class="ledger"><h5>Now</h5>
          <div class="row"><span>Questions</span><span>${m.requests}</span></div>
          <div class="row"><span>Calls booked</span><span>${m.booked}</span></div>
          <div class="row"><span>Replies</span><span>${rate}</span></div>
          <div class="row us"><span>Spent</span><span>${money(m.spend)}</span></div>
          <div class="row"><span>Credits left</span><span>${m.credits}</span></div>
        </div>
        <div class="actions" style="margin-top:0"><button class="btn ghost" type="button" data-act="credits">Add 4 example credits</button></div>
      </div>
      <table style="margin-top:22px"><thead><tr><th>Question</th><th>Where it is</th></tr></thead><tbody>
        ${state.requests.map((r) => `<tr><td><a href="request.html?id=${esc(r.id)}">${esc(r.title)}</a></td><td>${esc(TL.store.status(r))}</td></tr>`).join("")}
      </tbody></table>`;
  }

  function signup() {
    const b = TL.store.get().buyer;
    return `<p class="eyebrow">Company · example</p>
      <h1><span class="up">${esc(b.company)}</span>Keep it <mark class="hl">fake.</mark></h1>
      <form data-act="buyer" style="max-width:560px">
        <label class="field">Company<input class="in" name="company" value="${esc(b.company)}"></label>
        <label class="field">Your name<input class="in" name="name" value="${esc(b.name)}"></label>
        <label class="field">Role<input class="in" name="role" value="${esc(b.role)}"></label>
        <label class="field">Stage<input class="in" name="stage" value="${esc(b.stage)}"></label>
        <label class="field">Size<input class="in" name="size" value="${esc(b.size)}"></label>
        <label class="field">Industry<input class="in" name="industry" value="${esc(b.industry)}"></label>
        <label class="field">What you sell<textarea class="in" name="sells">${esc(b.sells)}</textarea></label>
        <div class="actions"><button class="btn" type="submit">Save</button></div>
      </form>`;
  }

  function consent() {
    return `<article class="sheet">
      <p class="fine">Example form · not sent</p>
      <h1><span class="up">Employer consent</span>If you want <mark class="hl">to ask.</mark></h1>
      <p>Someone on your team may take occasional paid calls about how a kind of work gets done. The calls are not about your company.</p>
      <p>They last about ${C.callMinutes} minutes, outside working hours. They are voluntary. The person is paid for the minutes they complete, and paid in full if they end a call rather than share something confidential.</p>
      <p>They may not share confidential information, material non-public information, or talk about their employer or a direct competitor.</p>
      <div class="sign"><div><p class="fine">Company</p><div class="line"></div></div><div><p class="fine">Employee</p><div class="line"></div></div><div><p class="fine">Name</p><div class="line"></div></div><div><p class="fine">Date</p><div class="line"></div></div></div>
      <div class="actions"><button class="btn" type="button" data-act="print">Print</button><a class="btn ghost" href="inbox.html">Back</a></div>
    </article>`;
  }

  const views = { home, dashboard: home, requestNew, request: requestPage, book: bookPage, call: callPage, inbox, expert: expertPage, payouts, admin, signup, consent };

  function paint() {
    const root = document.getElementById("app");
    if (!root) return;
    const page = root.dataset.page || "home";
    document.title = "Trenchline";
    const view = views[page] || home;
    root.innerHTML = page === "consent" ? `<div class="bg-lines"></div><div class="stage">${consent()}</div>` : shell(page, view());
    const preview = document.getElementById("preview");
    if (preview) preview.textContent = payLine("completed", C.callMinutes);
  }

  function show(text, bad) { banner = { text, bad: !!bad }; paint(); }

  function doPrimary(requestId) {
    const req = TL.store.request(requestId);
    const next = nextFor(req);
    if (!next || next.kind !== "approve") return show("Nothing to book.", true);
    const res = TL.store.approveOutreach(req.id, next.outreach.id);
    if (!res.ok) return show(res.error, true);
    const inv = TL.store.inviteFor(req.id, next.person.id);
    if (inv && inv.status === "accepted" && inv.complianceAt) return go("book.html?invite=" + inv.id, "Parker booked it in this browser. Pick a time.");
    return go("inbox.html", "Parker wrote to " + next.person.name.split(" ")[0] + ". They still have to say yes. Nothing was emailed.");
  }

  function payLine(outcome, minutes) {
    if (outcome === "no-show") return "No payout. The call didn’t happen.";
    if (outcome === "compliance-ended") return "Paid in full, " + money(C.expertPayoutUsd) + ", because they protected a confidence.";
    const amount = Math.round(C.expertPayoutUsd * (Number(minutes) / C.callMinutes) * 100) / 100;
    return "About " + money(amount) + " for " + minutes + " minutes. You still pay a flat " + money(C.pricePerCallUsd) + ".";
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.type === "submit") return;
    const act = b.dataset.act;
    if (act === "reset") { TL.store.reset(); go("index.html", "Example restored."); return; }
    if (act === "primary") return doPrimary(b.dataset.request);
    if (act === "approve") {
      const res = TL.store.approveOutreach(b.dataset.request, b.dataset.outreach);
      return show(res.ok ? "Asked, inside this browser only." : res.error, !res.ok);
    }
    if (act === "skip") {
      const res = TL.store.skipOutreach(b.dataset.request, b.dataset.outreach);
      return show(res.ok ? "Skipped." : res.error, !res.ok);
    }
    if (act === "accept") {
      const res = TL.store.respondInvite(b.dataset.invite, true, true);
      if (!res.ok) return show(res.error, true);
      return go("index.html", "You said yes. The buyer can book a time.");
    }
    if (act === "decline") {
      const res = TL.store.respondInvite(b.dataset.invite, false, false);
      return show(res.ok ? "Declined." : res.error, !res.ok);
    }
    if (act === "credits") {
      const res = TL.store.addCredits(4);
      return show(res.ok ? "Added 4 example credits. No payment." : res.error, !res.ok);
    }
    if (act === "draft") {
      const notes = document.getElementById("notes");
      const summary = document.getElementById("summary");
      const booking = TL.store.get().bookings.find((x) => x.id === qs("booking"));
      const req = booking && TL.store.request(booking.requestId);
      if (summary) summary.value = TL.agents.draftSummary(notes ? notes.value : "", req);
      return;
    }
    if (act === "print") window.print();
  });

  document.addEventListener("change", (e) => {
    if (e.target && (e.target.id === "outcome" || e.target.id === "minutes")) {
      const out = document.getElementById("preview");
      if (out) out.textContent = payLine(document.getElementById("outcome").value, document.getElementById("minutes").value);
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("form[data-act]");
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    const act = form.dataset.act;
    if (act === "request") {
      const res = TL.store.createRequest({
        title: fd.get("title"),
        decision: fd.get("decision"),
        role: fd.get("role"),
        fn: fd.get("fn"),
        industry: fd.get("industry"),
        companyType: fd.get("companyType"),
        companySize: fd.get("companySize"),
        years: fd.get("years"),
        geography: fd.get("geography"),
        targetCompanies: fd.get("targetCompanies"),
        avoidCompanies: String(fd.get("avoid") || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        formerWithin: fd.get("formerWithin"),
        calls: fd.get("calls"),
        timeline: fd.get("timeline"),
        screening: String(fd.get("screening") || "").split(/\n/).map((s) => s.trim()).filter(Boolean),
        qualify: fd.get("qualify"),
        profilesTo: fd.get("profilesTo"),
        calendarTo: fd.get("calendarTo"),
        updates: fd.get("updates"),
      });
      if (!res.ok) return show(res.error, true);
      return go("request.html?id=" + res.id, "Parker read it. Nothing was sent.");
    }
    if (act === "book") {
      const res = TL.store.book(fd.get("invite"), fd.get("slot"));
      if (!res.ok) return show(res.error, true);
      return go("call.html?booking=" + res.id, "Booked. One example credit. No card was charged.");
    }
    if (act === "log") {
      const res = TL.store.completeCall(fd.get("booking"), {
        outcome: fd.get("outcome"),
        minutes: fd.get("minutes"),
        notes: fd.get("notes"),
        summary: fd.get("summary"),
        recording: fd.get("recording") === "on",
        expertOptIn: fd.get("expertOptIn") === "on",
        rating: fd.get("rating"),
      });
      if (!res.ok) return show(res.error, true);
      return go("call.html?booking=" + fd.get("booking"), "Note saved.");
    }
    if (act === "rules") {
      const res = TL.store.saveRules(fd.get("request"), {
        stopWhenBooked: fd.get("stop") === "on",
        linkedinDailyCap: fd.get("li"),
        emailDailyCap: fd.get("em"),
        dnc: fd.get("dnc"),
      });
      return show(res.ok ? "Rules saved." : res.error, !res.ok);
    }
    if (act === "expert") {
      const res = TL.store.saveExpert({
        name: fd.get("name"), role: fd.get("role"), years: fd.get("years"), yearsLabel: fd.get("yearsLabel"),
        fn: fd.get("fn"), industry: fd.get("industry"), employer: fd.get("employer"), employerType: fd.get("employerType"),
        geography: fd.get("geography"), topics: fd.get("topics"), bio: fd.get("bio"), wont: fd.get("wont"),
        availability: fd.getAll("availability"), channel: "email",
        confidential: true, mnpi: true, employerOk: true,
      });
      return show(res.ok ? "Saved in this browser." : res.error, !res.ok);
    }
    if (act === "buyer") {
      const res = TL.store.saveBuyer(Object.fromEntries(fd.entries()));
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
