/* Screens. All reads and writes go through TL.store. */
(function () {
  const TL = (window.TL = window.TL || {});
  const C = TL.CONFIG;

  const NAV = {
    buyer: [
      ["dashboard.html", "Requests", "dashboard"],
      ["request-new.html", "New request", "requestNew"],
      ["signup.html", "Company", "signup"],
    ],
    expert: [
      ["inbox.html", "Inbox", "inbox"],
      ["expert.html", "Profile", "expert"],
      ["payouts.html", "Payouts", "payouts"],
      ["consent.html", "Consent form", "consent"],
    ],
    admin: [
      ["admin.html", "Overview", "admin"],
    ],
  };

  const FNS = ["Finance", "Operations", "Compliance", "Product", "Sales", "Marketing", "Engineering", "Customer support", "Other"];
  const INDUSTRIES = ["Financial services", "Fintech", "Payments", "Accounting", "Software", "Healthcare", "Manufacturing", "Other"];
  const TYPES = [
    "Current practitioner at a company in the industry",
    "Same role at a different company",
    "Former employee",
    "Competitor practitioner",
    "Customer of a named company",
  ];
  const YEARS = ["0–1 year", "0–4 years", "2–4 years", "5–8 years", "9+ years", "Any"];
  const SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];
  const STAGES = ["Early-stage", "SMB", "Mid-market"];
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const TIMES = ["09:00", "12:00", "16:00", "16:30"];
  const STAGE_LABEL = {
    sourced: "Sourced",
    contacted: "Contacted",
    replied: "Replied",
    screened: "Screened",
    scheduled: "Scheduled",
    completed: "Completed",
    excluded: "Do not contact",
    skipped: "Skipped",
    declined: "Declined",
    expired: "Expired",
  };

  let banner = null;
  let stageFilter = "all";
  let editing = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function money(n) {
    const v = Math.round(Number(n) * 100) / 100;
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }
  function hue(name) {
    let h = 0;
    for (let i = 0; i < String(name).length; i += 1) h = (h + name.charCodeAt(i)) % 6;
    return "c" + (h + 1);
  }
  function when(iso, time) {
    if (!iso) return "—";
    const d = new Date(iso);
    const opts = { month: "short", day: "numeric" };
    if (time) {
      opts.hour = "numeric";
      opts.minute = "2-digit";
    }
    return d.toLocaleString("en-US", opts);
  }
  function flash(msg) {
    sessionStorage.setItem("tl.flash.app-mvp", msg);
  }
  function takeFlash() {
    const msg = sessionStorage.getItem("tl.flash.app-mvp");
    sessionStorage.removeItem("tl.flash.app-mvp");
    return msg;
  }
  function go(url, msg) {
    if (msg) flash(msg);
    location.href = url;
  }
  function show(kind, text) {
    banner = { kind: kind, text: text };
    paint();
  }
  function field(label, hint, control) {
    return `<label class="f">${label}${hint ? `<span class="hint">${hint}</span>` : ""}${control}</label>`;
  }
  function select(name, options, current, attrs) {
    return `<select class="in" name="${esc(name)}" ${attrs || ""}>${options
      .map((o) => {
        const val = Array.isArray(o) ? o[0] : o;
        const label = Array.isArray(o) ? o[1] : o;
        return `<option value="${esc(val)}"${val === current ? " selected" : ""}>${esc(label)}</option>`;
      })
      .join("")}</select>`;
  }
  function personBy(state, id) {
    return state.pool.find((p) => p.id === id);
  }

  function shell(page, body) {
    const state = TL.store.get();
    const role = state.session.role;
    const open = TL.store.openInvites().length;
    const items = NAV[role] || NAV.buyer;
    const me = role === "expert" ? TL.store.self() : null;
    const who = role === "expert" ? me.name : role === "admin" ? "Ops" : state.buyer.name;
    const sub = role === "expert" ? me.role : role === "admin" ? "Local demo" : state.buyer.company;
    const nav = items
      .map(([href, label, id]) => {
        const badge = id === "inbox" && open ? `<span class="n">${open}</span>` : "";
        return `<a class="nav${page === id ? " on" : ""}" href="${href}"${page === id ? ' aria-current="page"' : ""}>${esc(label)}${badge}</a>`;
      })
      .join("");
    const tbar = items
      .slice(0, 4)
      .map(([href, label, id]) => `<a class="${page === id ? "on" : ""}" href="${href}"><i></i>${esc(label)}</a>`)
      .join("");
    const roles = ["buyer", "expert", "admin"]
      .map((r) => {
        const label = r === "buyer" ? "Buyer" : r === "expert" ? "Practitioner" : "Ops";
        return `<button type="button" class="${role === r ? "on" : ""}" data-act="role" data-role="${r}" aria-pressed="${role === r}">${label}</button>`;
      })
      .join("");
    const note = banner;
    banner = null;
    const flashed = takeFlash();
    const flashHtml = note
      ? `<div class="notice ${note.kind === "bad" ? "bad" : "ok"}" role="status">${esc(note.text)}</div>`
      : flashed
        ? `<div class="notice ok" role="status">${esc(flashed)}</div>`
        : "";
    return `<div class="app">
      <aside class="side"><div class="sin">
        <a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="28" height="28">Trenchline</a>
        <div class="switch" role="group" aria-label="Which side of the demo you are viewing">${roles}</div>
        <div class="lbl">${role === "buyer" ? "Buyer" : role === "expert" ? "Practitioner" : "Ops"}</div>
        ${nav}
        <a class="nav" href="../index.html">Marketing site</a>
        <div class="me"><div class="av ${hue(who)}">${esc(initials(who))}</div><div>${esc(who)}<small>${esc(sub)}</small></div></div>
      </div></aside>
      <div class="main" id="main">
        <div class="top">
          <a class="menu" href="index.html"><img src="assets/logo.svg" alt="" width="26" height="26">Trenchline</a>
          <div class="switch-m" role="group" aria-label="Which side of the demo you are viewing">${roles}</div>
          <div class="crumbs">Demo · <b>nothing is sent or paid</b></div>
        </div>
        ${flashHtml}
        ${body}
        <p class="fine">Flat ${money(C.pricePerCallUsd)} per ${C.callMinutes}-minute call. Practitioner payout ${money(C.expertPayoutUsd)} for a full call, prorated to the minute. Both numbers live in <span class="mono">app-mvp/assets/config.js</span>. State stays in this browser.</p>
      </div>
      <nav class="tbar" aria-label="Sections">${tbar}</nav>
    </div>`;
  }

  function home() {
    return `<div class="head"><div>
      <div class="pills"><span class="pill y">Example data</span><span class="pill">Fintech is the sample vertical</span></div>
      <h1>The network, <em>without the project manager.</em></h1>
      <p class="sub">Trenchline books expert calls for small and mid-market companies and early-stage founders. ${money(C.pricePerCallUsd)} flat. You write a request, an agent drafts who to call and what to send, and you approve every message before it exists even as a simulation.</p>
    </div></div>
    <div class="grid3">
      <a class="card door" href="dashboard.html"><span class="pill k">Buyer</span><h2>Run a request</h2><p>Company profile, a new brief, grades, and an outreach queue that waits for you.</p><span class="btn bp">Open requests</span></a>
      <a class="card door" href="inbox.html"><span class="pill k">Practitioner</span><h2>Take a call</h2><p>Profile, availability, a 24-hour invite, and the compliance box on every accept.</p><span class="btn bg">Open inbox</span></a>
      <a class="card door" href="admin.html"><span class="pill k">Ops</span><h2>See the book</h2><p>Requests, example credits, calls, and response rate. Same data, one screen.</p><span class="btn bg">Open ops</span></a>
    </div>
    <section class="card">
      <h2>Walk the loop</h2>
      <ol class="steps">
        <li>Create a request. The payroll brief is filled in, and it is labeled as an example.</li>
        <li>Approve Priya N.’s draft. That is the only “send,” and it never leaves this browser.</li>
        <li>Switch to Practitioner. Accept within 24 hours and tick the attestation.</li>
        <li>Switch back to Buyer and book a slot. One example credit is used. No card is charged.</li>
        <li>Log the call: minutes, notes, an optional transcript, a rating, and someone like her.</li>
      </ol>
      <div class="actions"><a class="btn bp" href="request-new.html">Start with a new request</a></div>
    </section>
    <section class="card">
      <h2>What is real here</h2>
      <div class="grid2">
        <div><h3>Stored, on this browser</h3><p class="sub">Company, requests, approvals, accepts, bookings, notes, and the example credit balance. Reload and they are still there. Reset lives on the ops screen.</p></div>
        <div><h3>Simulated</h3><p class="sub">ICP, grades, outreach copy, other practitioners’ replies, screening, credits, and payouts. The hooks are <code>TL.agents.draftIcp</code>, <code>matchRequest</code>, <code>draftOutreach</code>, and <code>draftSummary</code>.</p></div>
      </div>
    </section>`;
  }

  function signup() {
    const b = TL.store.get().buyer;
    return `<div class="head"><div><h1>Company <em>profile</em></h1><p class="sub">Use the example company or invent one. This is not an account. Don’t enter a real person’s details.</p></div></div>
    <form class="card" data-act="buyer" autocomplete="off">
      <div class="f2">
        ${field("Company", "", `<input class="in" name="company" required value="${esc(b.company)}">`)}
        ${field("Your name", "Example name is fine", `<input class="in" name="name" required value="${esc(b.name)}">`)}
      </div>
      <div class="f2">
        ${field("Your role", "", `<input class="in" name="role" value="${esc(b.role)}">`)}
        ${field("Stage", "", select("stage", STAGES, b.stage))}
      </div>
      <div class="f2">
        ${field("Company size", "", select("size", SIZES, b.size))}
        ${field("Industry", "", `<input class="in" name="industry" value="${esc(b.industry)}">`)}
      </div>
      ${field("Website", "Not opened, not checked", `<input class="in" name="website" value="${esc(b.website)}">`)}
      ${field("Work email", "Use a .example address", `<input class="in" name="email" value="${esc(b.email)}">`)}
      ${field("What you sell", "", `<textarea class="in" name="sells">${esc(b.sells)}</textarea>`)}
      <div class="actions"><button class="btn bp" type="submit">Save profile</button></div>
    </form>`;
  }

  function dashboard() {
    const state = TL.store.get();
    const m = TL.store.metrics();
    const cards = state.requests
      .map((req) => {
        const counts = TL.store.counts(req);
        const bits = TL.store.PIPELINE.map((s) => `<span>${esc(STAGE_LABEL[s])} <b>${counts[s] || 0}</b></span>`).join("");
        return `<a class="req" href="request.html?id=${esc(req.id)}">
          <div class="pills">${req.example ? '<span class="pill y">Example</span>' : '<span class="pill g">Yours</span>'}<span class="pill">${esc(TL.store.status(req))}</span><span class="pill">${esc(req.who.industry)}</span></div>
          <h3>${esc(req.title)}</h3>
          <p>${esc(req.decision)}</p>
          <div class="mini">${bits}</div>
        </a>`;
      })
      .join("");
    const calls = state.bookings
      .slice(0, 5)
      .map((b) => {
        const who = personBy(state, b.personId);
        return `<div class="row"><span><b>${esc(b.requestTitle)}</b><br><span class="fine">${esc(who ? who.name : "")} · ${esc(when(b.slot, true))} · ${esc(b.status)}</span></span><a class="btn bg bs" href="call.html?booking=${esc(b.id)}">Open</a></div>`;
      })
      .join("");
    return `<div class="head"><div><h1>Requests</h1><p class="sub">${esc(state.buyer.company)} · ${esc(state.buyer.name)}. Featured vertical on the marketing page is fintech. A request can name any industry.</p></div><a class="btn bp" href="request-new.html">New request</a></div>
    <div class="stats">
      <div class="stat"><div class="k">Open requests</div><div class="v">${m.requests}</div><div class="d">${state.requests.filter((r) => TL.store.status(r) === "Needs approval").length} waiting on approval</div></div>
      <div class="stat"><div class="k">Example credits</div><div class="v">${m.credits}</div><div class="d">${money(m.creditValue)} at ${money(C.pricePerCallUsd)} a call</div></div>
      <div class="stat"><div class="k">Calls booked</div><div class="v">${m.booked}</div><div class="d">${m.completed} logged</div></div>
      <div class="stat"><div class="k">Spend</div><div class="v">${money(m.spend)}</div><div class="d">Example ledger, no card charged</div></div>
    </div>
    ${cards || '<div class="card"><p>No requests yet.</p></div>'}
    <section class="card"><h2>Recent calls</h2>${calls || "<p class='sub'>None yet.</p>"}</section>`;
  }

  function requestNew() {
    const b = TL.agents.SAMPLE_BRIEF;
    return `<div class="head"><div><h1>New <em>request</em></h1><p class="sub">The same checklist a human project manager asks for, plus the decision the call has to inform. The payroll copy is an example. Edit it or submit it as-is.</p></div></div>
    <form data-act="request" autocomplete="off">
      <fieldset class="card"><legend>1 · The decision</legend>
        ${field("Title", "", `<input class="in" name="title" required value="${esc(b.title)}">`)}
        ${field("What decision will this call inform?", "Required. The agent repeats this in the ICP and the outreach.", `<textarea class="in" name="decision" required>${esc(b.decision)}</textarea>`)}
      </fieldset>
      <fieldset class="card"><legend>2 · Who to talk to</legend>
        ${field("Role", "Title you want on the other end of the call", `<input class="in" name="role" required value="${esc(b.role)}">`)}
        <div class="f2">
          ${field("Function", "", select("fn", FNS, b.fn))}
          ${field("Industry", "Fintech is the example, not a limit", select("industry", INDUSTRIES, b.industry))}
        </div>
        <div class="f2">
          ${field("Company type", "", select("companyType", TYPES, b.companyType))}
          ${field("Company size", "", select("companySize", SIZES, b.companySize))}
        </div>
        <div class="f2">
          ${field("Years in role", "Core supply is 0–4 years. Senior is allowed.", select("years", YEARS, b.years))}
          ${field("Geography", "", `<input class="in" name="geography" value="${esc(b.geography)}">`)}
        </div>
        ${field("Companies to start with", "Optional", `<input class="in" name="targetCompanies" value="${esc(b.targetCompanies)}">`)}
        ${field("Companies to avoid", "Current employees of these are not contacted", `<input class="in" name="avoid" value="${esc(b.avoidCompanies.join(", "))}">`)}
        ${field("If you need former employees, how recently should they have left?", "Optional", `<input class="in" name="formerWithin" placeholder="e.g. within 24 months" value="${esc(b.formerWithin)}">`)}
      </fieldset>
      <fieldset class="card"><legend>3 · How many, and by when</legend>
        <div class="f2">
          ${field("Number of calls", "1 to 10", `<input class="in" name="calls" type="number" min="1" max="10" required value="${esc(b.calls)}">`)}
          ${field("Timeline", "", `<input class="in" name="timeline" required value="${esc(b.timeline)}">`)}
        </div>
      </fieldset>
      <fieldset class="card"><legend>4 · Screening</legend>
        ${field("Screening questions", "One per line. The practitioner sees these on the invite.", `<textarea class="in" name="screening" required>${esc(b.screening.join("\n"))}</textarea>`)}
        ${field("Qualifying bar", "What “good enough” means", `<input class="in" name="qualify" value="${esc(b.qualify)}">`)}
      </fieldset>
      <fieldset class="card"><legend>5 · Who gets the invite</legend>
        <div class="f2">
          ${field("Profiles and updates go to", "", `<input class="in" name="profilesTo" required value="${esc(b.profilesTo)}">`)}
          ${field("Calendar invite goes to", "", `<input class="in" name="calendarTo" required value="${esc(b.calendarTo)}">`)}
        </div>
        ${field("Updates", "", select("updates", [["rolling", "Rolling, as people are ready"], ["digest", "Morning and end-of-day only"]], b.updates))}
        <p class="fine">Rolling means as soon as a profile is ready. Digest means a morning and end-of-day bundle. Either way, nothing is emailed in this demo.</p>
      </fieldset>
      <div class="actions"><button class="btn bp" type="submit">Create request and run the agent</button></div>
    </form>`;
  }

  function updatesLabel(value) {
    return value === "digest" ? "Morning and end-of-day digest" : "Rolling, as people are ready";
  }

  function requestPage() {
    const state = TL.store.get();
    const req = TL.store.request(qs("id"));
    if (!req) {
      return `<div class="card"><h1>Request not found</h1><p class="sub">It may have been cleared with the demo data.</p><a class="btn bg" href="dashboard.html">Back to requests</a></div>`;
    }
    const counts = TL.store.counts(req);
    const similar = personBy(state, qs("similar"));
    const pipes = TL.store.PIPELINE.map((s) => `<button type="button" class="${stageFilter === s ? "on" : ""}" data-act="filter" data-stage="${s}"><b>${counts[s] || 0}</b><span>${esc(STAGE_LABEL[s])}</span></button>`).join("");
    const people = req.matches
      .filter((m) => stageFilter === "all" || TL.store.stage(req, m.personId) === stageFilter)
      .map((m) => candidateCard(state, req, m, similar))
      .join("");
    const queue = req.outreach
      .slice()
      .sort((a, b) => (a.status === "draft" ? 0 : 1) - (b.status === "draft" ? 0 : 1))
      .map((o) => queueCard(state, req, o))
      .join("");
    const usedL = TL.store.sentToday("linkedin");
    const usedE = TL.store.sentToday("email");
    const activity = req.activity
      .slice(0, 6)
      .map((a) => `<li><time>${esc(when(a.at, true))} · ${esc(a.agent)}</time>${esc(a.text)}</li>`)
      .join("");
    return `<a class="back" href="dashboard.html">← Requests</a>
    <div class="head"><div>
      <div class="pills">${req.example ? '<span class="pill y">Example</span>' : '<span class="pill g">Yours</span>'}<span class="pill">${esc(TL.store.status(req))}</span><span class="pill">${esc(req.calls)} calls · ${esc(req.timeline)}</span></div>
      <h1>${esc(req.title)}</h1>
      <p class="sub"><b style="color:var(--ink)">Decision. </b>${esc(req.decision)}</p>
    </div><div class="stat"><div class="k">Price</div><div class="v">${money(C.pricePerCallUsd)}</div><div class="d">flat · ${C.callMinutes} min</div></div></div>
    ${similar ? `<div class="notice">Showing this request with ${esc(similar.name)}’s function highlighted, so you can book another practitioner like them.</div>` : ""}
    <div class="pipe" aria-label="Pipeline"><button type="button" class="${stageFilter === "all" ? "on" : ""}" data-act="filter" data-stage="all"><b>${req.matches.length}</b><span>All</span></button>${pipes}</div>
    <p class="hook"><b>Simulated agent.</b> The ICP, grades, and drafts come from <code>TL.agents.draftIcp</code>, <code>TL.agents.matchRequest</code>, and <code>TL.agents.draftOutreach</code>. Each one is marked <code>LLM_HOOK</code> in <code>app-mvp/assets/agents.js</code>. A production app replaces those three functions with a model call and keeps the same return shape. No API key, no network.</p>
    <div class="split">
      <div>
        <section class="card" id="icp">
          <h2>Who we’re looking for</h2>
          <p>${esc(req.icp.text)}</p>
          <div class="grid3" style="margin-top:14px">
            ${listBlock("Must", req.icp.must)}
            ${listBlock("Nice", req.icp.nice)}
            ${listBlock("Disqualify", req.icp.disqualify)}
          </div>
        </section>
        <section class="card" id="people">
          <h2>Candidates</h2>
          <p class="fine">Grades are A to D. X means the do-not-contact list removed them before a grade mattered.</p>
          ${people || "<p class='sub'>Nobody in this stage.</p>"}
        </section>
        <section class="card" id="queue">
          <h2>Outreach, waiting on you</h2>
          <p class="fine">Approving marks a message sent inside this demo. It is not delivered. Step 2 stays held until you would have had a no-reply, and it is cancelled once the call target is booked.</p>
          ${queue || "<p class='sub'>Nothing queued. D grades and do-not-contact names are left out on purpose.</p>"}
        </section>
      </div>
      <aside>
        <form class="card sticky" data-act="rules" id="rules">
          <h2>Rules of engagement</h2>
          <input type="hidden" name="request" value="${esc(req.id)}">
          <label class="check"><input type="checkbox" name="stopWhenBooked" ${req.rules.stopWhenBooked ? "checked" : ""}> Stop when ${esc(String(req.calls))} call${req.calls === 1 ? "" : "s"} ${req.calls === 1 ? "is" : "are"} booked</label>
          ${field("LinkedIn sends per day", `${usedL} marked sent today`, `<input class="in" name="linkedinDailyCap" type="number" min="0" max="200" value="${esc(req.rules.linkedinDailyCap)}">`)}
          ${field("Email sends per day", `${usedE} marked sent today`, `<input class="in" name="emailDailyCap" type="number" min="0" max="500" value="${esc(req.rules.emailDailyCap)}">`)}
          ${field("Do-not-contact employers", "One per line, added on top of the brief", `<textarea class="in" name="dnc">${esc(req.rules.dnc.join("\n"))}</textarea>`)}
          <p class="fine">From the brief: ${esc(req.who.avoidCompanies.join(", ") || "none")}.</p>
          <div class="actions"><button class="btn bg" type="submit">Save rules</button></div>
        </form>
        <section class="card">
          <h2>Routing</h2>
          <div class="row"><span>Profiles</span><b>${esc(req.routing.profilesTo)}</b></div>
          <div class="row"><span>Calendar</span><b>${esc(req.routing.calendarTo)}</b></div>
          <div class="row"><span>Updates</span><b>${esc(updatesLabel(req.routing.updates))}</b></div>
          <h3 style="margin-top:16px">Screening</h3>
          <ol class="reasons">${req.screening.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
          <p class="fine">${esc(req.qualify)}</p>
        </section>
        <section class="card"><h2>Agent log</h2><ul class="activity">${activity}</ul></section>
      </aside>
    </div>`;
  }

  function listBlock(title, items) {
    return `<div><h3>${esc(title)}</h3><ul class="reasons">${(items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`;
  }

  function candidateCard(state, req, match, similar) {
    const person = personBy(state, match.personId);
    const stage = TL.store.stage(req, match.personId);
    const invite = TL.store.inviteFor(req.id, person.id);
    const booking = TL.store.bookingFor(req.id, person.id);
    const like = similar && person.fn === similar.fn && !match.excluded;
    let action = "";
    if (stage === "screened" && invite) action = `<a class="btn bp bs" href="book.html?invite=${esc(invite.id)}">Book</a>`;
    else if (booking) action = `<a class="btn bg bs" href="call.html?booking=${esc(booking.id)}">${booking.status === "confirmed" ? "Open booking" : "Open notes"}</a>`;
    else if (stage === "replied" && invite && !invite.complianceAt) action = `<button class="btn bg bs" type="button" data-act="screen" data-invite="${esc(invite.id)}">Mark screened (simulated)</button>`;
    else if (stage === "contacted" && person.id === state.expertId) action = `<a class="btn bg bs" href="inbox.html">Accept in the inbox</a>`;
    return `<article class="person${like ? " similar" : ""}">
      <div class="who">
        <span class="grade ${esc(match.grade)}" aria-label="Grade ${esc(match.grade)}">${esc(match.grade)}</span>
        <div class="av ${hue(person.name)}">${esc(initials(person.name))}</div>
        <div class="grow">
          <h3>${esc(person.name)} ${person.id === state.expertId ? '<span class="pill k">You</span>' : ""} ${person.example ? '<span class="pill y">Example</span>' : ""}</h3>
          <p class="meta">${esc(person.role)} · ${esc(person.yearsLabel)} · ${esc(person.employerType)}</p>
        </div>
        <span class="pill ${stage === "completed" || stage === "screened" ? "g" : stage === "excluded" || stage === "declined" ? "r" : "y"}">${esc(STAGE_LABEL[stage] || stage)}</span>
      </div>
      <ul class="reasons">${match.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      ${action ? `<div class="actions">${action}</div>` : ""}
    </article>`;
  }

  function queueCard(state, req, item) {
    const person = personBy(state, item.personId);
    if (editing === item.id && item.status === "draft") {
      return `<form class="queue" data-act="save-outreach">
        <input type="hidden" name="request" value="${esc(req.id)}">
        <input type="hidden" name="outreach" value="${esc(item.id)}">
        <header><h3>Edit · ${esc(person.name)}</h3><span class="pill">${esc(item.channel)}</span></header>
        ${field("Channel", "", select("channel", ["email", "linkedin"], item.channel))}
        ${field("Subject", "", `<input class="in" name="subject" value="${esc(item.subject)}">`)}
        ${field("Message", "", `<textarea class="in" name="body">${esc(item.body)}</textarea>`)}
        <div class="actions"><button class="btn bp bs" type="submit">Save draft</button><button class="btn bg bs" type="button" data-act="cancel-edit">Cancel</button></div>
      </form>`;
    }
    const buttons =
      item.status === "draft"
        ? `<button class="btn bp bs" type="button" data-act="approve" data-request="${esc(req.id)}" data-outreach="${esc(item.id)}">Approve send</button>
           <button class="btn bg bs" type="button" data-act="edit" data-outreach="${esc(item.id)}">Edit</button>
           <button class="btn bd bs" type="button" data-act="skip" data-request="${esc(req.id)}" data-outreach="${esc(item.id)}">Skip</button>`
        : "";
    return `<article class="queue${item.status === "skipped" ? " muted" : ""}">
      <header>
        <div><h3>${esc(person.name)} ${person.id === state.expertId ? '<span class="pill k">You</span>' : ""}</h3><p class="fine">${esc(item.channel)} · step 1 of 2 · ${esc(item.status)}${item.skipReason ? " · " + esc(item.skipReason) : ""}</p></div>
        <span class="pill">${esc(item.status)}</span>
      </header>
      <div class="letter"><b>${esc(item.subject)}</b>\n\n${esc(item.body)}</div>
      <details class="sum"><summary>Step 2 · ${esc(item.step2Status || "held")}</summary><div class="letter">${esc(item.step2Body)}</div></details>
      ${buttons ? `<div class="actions">${buttons}<span class="fine">Stays in this browser.</span></div>` : ""}
    </article>`;
  }

  function expertPage() {
    const state = TL.store.get();
    const who = TL.store.self();
    const force = state.session.forceOnboarding || !who.onboarded;
    const slots = [];
    DAYS.forEach((d) => TIMES.forEach((t) => slots.push(d + " " + t)));
    const chips = slots
      .map((slot) => {
        const on = (who.availability || []).indexOf(slot) >= 0;
        return `<label class="chip"><input type="checkbox" name="availability" value="${esc(slot)}" ${on ? "checked" : ""}>${esc(slot)}</label>`;
      })
      .join("");
    return `<div class="head"><div>
      <div class="pills">${force && !who.onboarded ? '<span class="pill r">Onboarding</span>' : '<span class="pill g">On file</span>'}<span class="pill y">Example profile</span></div>
      <h1>${esc(who.name.split(" ")[0])}’s <em>profile</em></h1>
      <p class="sub">Practitioners are people who do the work. Most are 0–4 years in. More senior profiles stay in the pool and usually grade lower. Keep this fictional.</p>
    </div></div>
    <form class="card" data-act="expert" autocomplete="off">
      <div class="f2">
        ${field("Name", "", `<input class="in" name="name" required value="${esc(who.name)}">`)}
        ${field("Role", "", `<input class="in" name="role" required value="${esc(who.role)}">`)}
      </div>
      <div class="f2">
        ${field("Years in role", "A number, used when new requests are graded", `<input class="in" name="years" type="number" min="0" max="40" step="0.5" value="${esc(who.years)}">`)}
        ${field("How it should read", "", `<input class="in" name="yearsLabel" value="${esc(who.yearsLabel)}">`)}
      </div>
      <div class="f2">
        ${field("Function", "", select("fn", FNS, who.fn))}
        ${field("Industry", "", `<input class="in" name="industry" value="${esc(who.industry)}">`)}
      </div>
      <div class="f2">
        ${field("Employer", "Example only. Calls are not about this company.", `<input class="in" name="employer" value="${esc(who.employer)}">`)}
        ${field("What kind of company", "", `<input class="in" name="employerType" value="${esc(who.employerType)}">`)}
      </div>
      <div class="f2">
        ${field("Geography", "", `<input class="in" name="geography" value="${esc(who.geography)}">`)}
        ${field("Preferred channel", "Used for the daily cap", select("channel", ["email", "linkedin"], who.channel))}
      </div>
      ${field("Topics you can talk about", "Comma separated", `<input class="in" name="topics" value="${esc((who.topics || []).join(", "))}">`)}
      ${field("Short bio", "", `<textarea class="in" name="bio">${esc(who.bio)}</textarea>`)}
      ${field("What you won’t discuss", "", `<textarea class="in" name="wont">${esc(who.wont)}</textarea>`)}
      <h2 style="margin-top:8px">Availability</h2>
      <p class="fine">Times are labels. Booked slots show in your local timezone.</p>
      <div class="chips">${chips}</div>
      <h2 style="margin-top:18px">Before you take calls</h2>
      <label class="check"><input type="checkbox" name="confidential" ${who.onboarded ? "checked" : ""} required> I will not share confidential or proprietary information.</label>
      <label class="check"><input type="checkbox" name="mnpi" ${who.onboarded ? "checked" : ""} required> I will not share material non-public information.</label>
      <label class="check"><input type="checkbox" name="employerOk" ${who.onboarded ? "checked" : ""} required> I will not discuss my own employer or a direct competitor.</label>
      <p class="fine">You still attest again on every invite. An employer consent form is optional. <a href="consent.html">Read it</a>.</p>
      <div class="actions"><button class="btn bp" type="submit">${force && !who.onboarded ? "Finish onboarding" : "Save profile"}</button></div>
    </form>`;
  }

  function windowLabel(inv) {
    if (inv.status !== "pending") return inv.status;
    const left = Date.parse(inv.sentAt) + C.inviteResponseHours * 3600000 - Date.now();
    if (left <= 0) return "Expired";
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    return h + "h " + m + "m left";
  }

  function inbox() {
    const state = TL.store.get();
    const who = TL.store.self();
    const mine = state.invitations
      .filter((i) => i.personId === state.expertId)
      .slice()
      .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || Date.parse(b.sentAt) - Date.parse(a.sentAt));
    const cards = mine
      .map((inv) => {
        const req = TL.store.request(inv.requestId);
        const title = req ? req.title : "Call";
        const decision = req ? req.decision : "";
        const questions = req ? req.screening : [];
        const open = inv.status === "pending";
        const form = !who.onboarded
          ? `<p class="notice">Finish <a href="expert.html">onboarding</a> before you accept.</p>`
          : open
            ? `<form data-act="accept">
                <input type="hidden" name="invite" value="${esc(inv.id)}">
                <label class="check"><input type="checkbox" name="attest" required> On this call I will not share employer confidential information or MNPI, and I will not discuss my own employer or a direct competitor.</label>
                <div class="actions"><button class="btn bp bs" type="submit">Accept</button><button class="btn bd bs" type="button" data-act="decline" data-invite="${esc(inv.id)}">Decline</button></div>
              </form>`
            : inv.status === "accepted"
              ? `<div class="actions"><a class="btn bp bs" href="book.html?invite=${esc(inv.id)}">Book a time</a></div>`
              : "";
        return `<article class="card">
          <div class="pills"><span class="pill ${open ? "y" : inv.status === "accepted" ? "g" : "r"}">${esc(windowLabel(inv))}</span>${req && req.example ? '<span class="pill y">Example</span>' : ""}</div>
          <h2>${esc(title)}</h2>
          <p class="sub">${esc(decision)}</p>
          ${questions.length ? `<ol class="reasons">${questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>` : ""}
          <p class="fine">Reply window is ${C.inviteResponseHours} hours. Pay is for minutes completed, nothing for a no-show, and the full ${money(C.expertPayoutUsd)} if you end the call because you were pushed past the rules. Payout is modeled at about ${C.payoutDays} days. <a href="consent.html">Employer consent form</a>, optional.</p>
          ${form}
        </article>`;
      })
      .join("");
    return `<div class="head"><div><h1>Inbox</h1><p class="sub">${esc(who.name)} · invites for you only. Other example profiles reply on their own when a buyer approves them.</p></div></div>
    ${cards || '<div class="card"><p>No invitations. Approve your own draft on a request, then come back.</p></div>'}`;
  }

  function bookPage() {
    const state = TL.store.get();
    const inv = state.invitations.find((i) => i.id === qs("invite"));
    if (!inv) return `<div class="card"><h1>No invite selected</h1><p class="sub">Open a screened practitioner from a request.</p><a class="btn bg" href="dashboard.html">Requests</a></div>`;
    const person = personBy(state, inv.personId);
    const req = TL.store.request(inv.requestId);
    if (inv.status !== "accepted" || !inv.complianceAt) {
      return `<div class="card"><h1>Not ready to book</h1><p class="sub">${esc(person.name)} still needs to accept and attest.</p><a class="btn bg" href="request.html?id=${esc(inv.requestId)}">Back to the request</a></div>`;
    }
    const existing = state.bookings.find((b) => b.inviteId === inv.id && b.status !== "cancelled");
    if (existing) {
      return `<div class="card"><h1>Already booked</h1><p class="sub">${esc(when(existing.slot, true))}</p><a class="btn bp" href="call.html?booking=${esc(existing.id)}">Open the call</a></div>`;
    }
    return `<a class="back" href="request.html?id=${esc(inv.requestId)}">← ${esc(req ? req.title : "Request")}</a>
    <div class="head"><div><h1>Book ${esc(person.name.split(" ")[0])}</h1><p class="sub">${esc(person.role)} · ${esc(person.yearsLabel)} · ${money(C.pricePerCallUsd)} flat, one example credit. Balance: ${state.credits.balance}.</p></div></div>
    <div class="split">
      <form class="card" data-act="book">
        <input type="hidden" name="invite" value="${esc(inv.id)}">
        <h2>Pick a slot</h2>
        <p class="fine">Shown in your timezone. Taken slots are already on the example calendar.</p>
        ${slotGrid(TL.store.slots(person.id))}
        <div class="actions"><button class="btn bp" type="submit" ${state.credits.balance < 1 ? "disabled" : ""}>Confirm booking</button>
        <button class="btn bg" type="button" data-act="credits">Add 4 example credits</button></div>
        ${state.credits.balance < 1 ? '<p class="notice bad">No credits left. Adding credits does not take a payment.</p>' : ""}
      </form>
      <aside class="card sticky">
        <h2>This call</h2>
        <div class="row"><span>Decision</span></div>
        <p>${esc(req ? req.decision : "")}</p>
        <div class="row"><span>Buyer pays</span><b>${money(C.pricePerCallUsd)}</b></div>
        <div class="row"><span>Practitioner, if completed</span><b>${money(C.expertPayoutUsd)}</b></div>
        <p class="fine">${inv.simulated ? "This acceptance was simulated." : "They attested when they accepted."} Recording is off unless both sides opt in after the call.</p>
      </aside>
    </div>`;
  }

  function slotGrid(slots) {
    const days = [];
    slots.forEach((s) => {
      const d = new Date(s.iso);
      const key = d.toDateString();
      let group = days.find((x) => x.key === key);
      if (!group) {
        group = { key: key, title: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), items: [] };
        days.push(group);
      }
      group.items.push(s);
    });
    if (!days.length) return `<p class="sub">No open times in the next two weeks.</p>`;
    return `<div class="slots">${days
      .map((group) => {
        const items = group.items
          .map((s) => {
            const t = new Date(s.iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            if (s.taken) return `<div class="slot off">${esc(t)} taken</div>`;
            return `<label class="slot"><input type="radio" name="slot" value="${esc(s.iso)}" required> ${esc(t)}</label>`;
          })
          .join("");
        return `<div><div class="day">${esc(group.title)}</div>${items}</div>`;
      })
      .join("")}</div>`;
  }

  function payPreview(outcome, minutes) {
    if (outcome === "no-show") return "Practitioner payout $0. The " + money(C.pricePerCallUsd) + " booking credit stays spent in this demo.";
    if (outcome === "compliance-ended") return "Practitioner is paid in full (" + money(C.expertPayoutUsd) + ") even though the call stopped at " + minutes + " min.";
    const amount = Math.round(C.expertPayoutUsd * (Number(minutes) / C.callMinutes) * 100) / 100;
    return "Practitioner payout " + money(amount) + " for " + minutes + " min. The buyer price stays a flat " + money(C.pricePerCallUsd) + ".";
  }

  function callPage() {
    const state = TL.store.get();
    const booking = state.bookings.find((b) => b.id === qs("booking"));
    if (!booking) return `<div class="card"><h1>No call selected</h1><a class="btn bg" href="dashboard.html">Requests</a></div>`;
    const person = personBy(state, booking.personId);
    const req = TL.store.request(booking.requestId);
    const pay = TL.store.payoutInfo(booking);
    if (booking.status !== "confirmed") {
      return `<a class="back" href="${req ? "request.html?id=" + esc(req.id) : "dashboard.html"}">← Back</a>
      <div class="head"><div>
        <div class="pills"><span class="pill g">${esc(booking.status)}</span>${booking.example ? '<span class="pill y">Example</span>' : ""}</div>
        <h1>${esc(booking.requestTitle)}</h1>
        <p class="sub">${esc(person ? person.name : "")} · ${esc(when(booking.slot, true))} · ${esc(String(booking.minutes))} min</p>
      </div></div>
      <div class="grid2">
        <section class="card"><h2>Summary</h2><p>${esc(booking.summary || "No summary.")}</p><h3 style="margin-top:14px">Notes</h3><p>${esc(booking.notes || "No notes.")}</p></section>
        <section class="card">
          <h2>After the call</h2>
          <div class="row"><span>Rating</span><b>${booking.rating ? esc(String(booking.rating)) + " / 5" : "—"}</b></div>
          <div class="row"><span>Recording</span><b>${booking.recording ? "Opted in, both sides" : "Off"}</b></div>
          <div class="row"><span>Practitioner payout</span><b>${money(pay.amount)}</b></div>
          <p class="fine">${esc(pay.label)} ${pay.due ? "Due " + esc(when(pay.due)) + "." : ""}</p>
          ${req ? `<div class="actions"><a class="btn bp" href="request.html?id=${esc(req.id)}&similar=${esc(person.id)}">Book another like ${esc(person.name.split(" ")[0])}</a></div>` : ""}
        </section>
      </div>`;
    }
    return `<a class="back" href="${req ? "request.html?id=" + esc(req.id) : "dashboard.html"}">← Back</a>
    <div class="head"><div>
      <div class="pills"><span class="pill g">Booked</span></div>
      <h1>You’re on the <em>calendar.</em></h1>
      <p class="sub">${esc(person ? person.name : "")} · ${esc(person ? person.role : "")} · ${esc(when(booking.slot, true))}. ${money(booking.chargedUsd)} example credit used. For the demo, log the call now instead of waiting for the slot.</p>
    </div></div>
    <form class="card" data-act="log" id="log-form">
      <input type="hidden" name="booking" value="${esc(booking.id)}">
      <div class="f2">
        ${field("How it ended", "", `<select class="in" name="outcome" id="outcome">
          <option value="completed">Completed</option>
          <option value="no-show">No-show</option>
          <option value="compliance-ended">Ended to keep confidentiality</option>
        </select>`)}
        ${field("Minutes completed", "Ignored for a no-show. A compliance stop is still paid in full.", `<input class="in" name="minutes" id="minutes" type="number" min="1" max="180" value="${C.callMinutes}">`)}
      </div>
      <p class="fine" id="pay-preview">${esc(payPreview("completed", C.callMinutes))}</p>
      ${field("Notes", "What you actually heard", `<textarea class="in" name="notes" id="notes" placeholder="Example notes stay in this browser."></textarea>`)}
      ${field("Summary", "", `<textarea class="in" name="summary" id="summary"></textarea>`)}
      <div class="actions"><button class="btn bg bs" type="button" data-act="draft-summary">Draft summary</button><span class="fine">Template in TL.agents.draftSummary. LLM_HOOK.</span></div>
      <label class="check"><input type="checkbox" name="recording"> Request a recording and transcript.</label>
      <label class="check"><input type="checkbox" name="expertOptIn"> Practitioner opt-in. Required as well, or the recording stays off.</label>
      <fieldset>
        <legend>Rating</legend>
        <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="rating" value="${n}"> ${n}</label>`).join("")}</div>
      </fieldset>
      <div class="actions"><button class="btn bp" type="submit">Save the call</button></div>
    </form>`;
  }

  function payouts() {
    const state = TL.store.get();
    const rows = state.bookings
      .filter((b) => b.personId === state.expertId)
      .map((b) => {
        const pay = TL.store.payoutInfo(b);
        return `<tr><td>${esc(b.requestTitle)}<div class="fine">${esc(when(b.completedAt || b.slot, true))}</div></td><td>${esc(b.status)}</td><td>${esc(String(b.minutes || 0))}</td><td>${money(pay.amount)}</td><td>${esc(pay.status)}${pay.due ? "<div class='fine'>" + esc(when(pay.due)) + "</div>" : ""}</td></tr>`;
      })
      .join("");
    return `<div class="head"><div><h1>Payouts</h1><p class="sub">A ledger, not a bank. Full call is ${money(C.expertPayoutUsd)}. Minutes are prorated. No-shows are zero. Ending a call to protect confidentiality pays the full amount. Timing is about ${C.payoutDays} days.</p></div></div>
    <div class="card policy">
      <div><i>✓</i><span>Paid for the minutes completed, at ${money(C.expertPayoutUsd)} per ${C.callMinutes} minutes.</span></div>
      <div><i>✓</i><span>No pay if the call does not take place.</span></div>
      <div><i>✓</i><span>Paid in full if you end the call because you were pushed to break confidentiality.</span></div>
      <div><i>✓</i><span>Modeled payout about ${C.payoutDays} days after the call. Nothing is transferred.</span></div>
    </div>
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Call</th><th>Status</th><th>Min</th><th>Payout</th><th>When</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No calls yet.</td></tr>"}</tbody></table></div></section>`;
  }

  function admin() {
    const state = TL.store.get();
    const m = TL.store.metrics();
    const rate = m.rate == null ? "—" : Math.round(m.rate * 100) + "%";
    const requests = state.requests
      .map((req) => `<tr><td><a href="request.html?id=${esc(req.id)}">${esc(req.title)}</a>${req.example ? " <span class='pill y'>Example</span>" : ""}</td><td>${esc(TL.store.status(req))}</td><td>${esc(req.who.industry)}</td><td>${(TL.store.counts(req).contacted || 0) + " contacted"}</td></tr>`)
      .join("");
    const calls = state.bookings
      .map((b) => {
        const who = personBy(state, b.personId);
        return `<tr><td>${esc(b.requestTitle)}</td><td>${esc(who ? who.name : "")}</td><td>${esc(b.status)}</td><td>${money(b.chargedUsd || 0)}</td><td>${esc(when(b.slot, true))}</td></tr>`;
      })
      .join("");
    const ledger = state.credits.ledger
      .slice(0, 8)
      .map((row) => `<div class="row"><span>${esc(row.label)}<span class="fine"> ${esc(when(row.at, true))}</span></span><b>${row.delta > 0 ? "+" : ""}${esc(String(row.delta))}</b></div>`)
      .join("");
    return `<div class="head"><div><h1>Ops</h1><p class="sub">One browser’s book. Response rate is replies divided by people who were marked contacted.</p></div>
      <div class="actions"><button class="btn bg" type="button" data-act="credits">Add 4 credits</button><button class="btn bd" type="button" data-act="reset">Reset demo data</button></div></div>
    <div class="stats">
      <div class="stat"><div class="k">Requests</div><div class="v">${m.requests}</div></div>
      <div class="stat"><div class="k">Credits left</div><div class="v">${m.credits}</div><div class="d">${money(m.creditValue)}</div></div>
      <div class="stat"><div class="k">Calls booked</div><div class="v">${m.booked}</div><div class="d">${money(m.spend)} spent</div></div>
      <div class="stat"><div class="k">Response rate</div><div class="v">${rate}</div><div class="d">${m.replied} replied / ${m.contacted} contacted</div></div>
    </div>
    <section class="card"><h2>Requests</h2><div class="table-wrap"><table><thead><tr><th>Request</th><th>Status</th><th>Industry</th><th>Pipeline</th></tr></thead><tbody>${requests}</tbody></table></div></section>
    <section class="card"><h2>Calls</h2><div class="table-wrap"><table><thead><tr><th>Request</th><th>Practitioner</th><th>Status</th><th>Charged</th><th>When</th></tr></thead><tbody>${calls}</tbody></table></div></section>
    <section class="card"><h2>Credit ledger</h2>${ledger}</section>`;
  }

  function consentPage() {
    return `<div class="letter-page">
      <div class="tools">
        <a class="btn bg bs" href="inbox.html">Back to the app</a>
        <button class="btn bg bs" type="button" data-act="print">Print</button>
        <button class="btn bp bs" type="button" data-act="download-consent">Download</button>
      </div>
      <article class="sheet">
        <p class="fine">Trenchline · example form · not sent anywhere</p>
        <h1>Employer consent</h1>
        <p>Dear employer,</p>
        <p>Someone on your team has asked to take occasional paid calls through Trenchline. Trenchline introduces small and mid-market companies, and early-stage founders, to practitioners who do a kind of work day to day. The calls are about the work. They are not about your company.</p>
        <h2>The calls</h2>
        <p>A call is usually ${C.callMinutes} minutes and is scheduled outside working hours. It is voluntary. The practitioner can decline any invite. They are paid for the minutes completed. If a caller pushes them to share confidential information, they are expected to end the call, and they are still paid in full.</p>
        <h2>What they may not do</h2>
        <ul class="reasons">
          <li>Disclose confidential or proprietary information, including trade secrets.</li>
          <li>Share material non-public information about any company or security.</li>
          <li>Discuss their own employer, or a direct competitor of that employer.</li>
          <li>Take a call if doing so would break an employment policy, an agreement, or the law.</li>
        </ul>
        <p>Please confirm that the employee may take these calls. You can withdraw that permission later in writing. This copy is a demo. It does not go to Trenchline, and the blanks below are for a printout, not a form we store.</p>
        <div class="sign">
          <div><div class="fine">Company</div><div class="line"></div></div>
          <div><div class="fine">Employee</div><div class="line"></div></div>
          <div><div class="fine">Signature</div><div class="line"></div></div>
          <div><div class="fine">Name</div><div class="line"></div></div>
          <div><div class="fine">Date</div><div class="line"></div></div>
          <div><div class="fine">Title</div><div class="line"></div></div>
          <div><div class="fine">Work phone</div><div class="line"></div></div>
          <div><div class="fine">Work email</div><div class="line"></div></div>
        </div>
        <p class="fine">Trenchline is not an investment adviser. Calls are general research. Practitioners speak for themselves, not for their employer.</p>
      </article>
    </div>`;
  }

  const VIEWS = {
    home: home,
    signup: signup,
    dashboard: dashboard,
    requestNew: requestNew,
    request: requestPage,
    expert: expertPage,
    inbox: inbox,
    book: bookPage,
    call: callPage,
    payouts: payouts,
    admin: admin,
  };

  const TITLES = {
    home: "Demo",
    signup: "Company",
    dashboard: "Requests",
    requestNew: "New request",
    request: "Request",
    expert: "Profile",
    inbox: "Inbox",
    book: "Book",
    call: "Call",
    payouts: "Payouts",
    admin: "Ops",
    consent: "Employer consent",
  };

  function paint() {
    const root = document.getElementById("app");
    if (!root) return;
    const page = root.dataset.page || "home";
    const forced = { signup: "buyer", dashboard: "buyer", requestNew: "buyer", expert: "expert", inbox: "expert", payouts: "expert", admin: "admin" }[page];
    if (forced && TL.store.get().session.role !== forced) TL.store.setRole(forced);
    document.title = (TITLES[page] || "Trenchline") + " — Trenchline";
    if (page === "consent") {
      root.innerHTML = consentPage();
      return;
    }
    const view = VIEWS[page] || home;
    root.innerHTML = shell(page, view());
    const preview = document.getElementById("pay-preview");
    if (preview) preview.textContent = payPreview("completed", C.callMinutes);
  }

  function readRequest(form) {
    const fd = new FormData(form);
    return {
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
    };
  }

  function onSubmit(form) {
    const act = form.dataset.act;
    const fd = new FormData(form);
    if (act === "buyer") {
      const res = TL.store.saveBuyer(Object.fromEntries(fd.entries()));
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Profile saved in this browser.");
    }
    if (act === "request") {
      const res = TL.store.createRequest(readRequest(form));
      if (!res.ok) return show("bad", res.error);
      return go("request.html?id=" + res.id, "Agent drafted an ICP and graded the example pool. Outreach is waiting. Nothing was sent.");
    }
    if (act === "save-outreach") {
      const res = TL.store.saveOutreach(fd.get("request"), fd.get("outreach"), {
        subject: fd.get("subject"),
        body: fd.get("body"),
        channel: fd.get("channel"),
      });
      editing = null;
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Draft updated. Still not sent.");
    }
    if (act === "rules") {
      const res = TL.store.saveRules(fd.get("request"), {
        stopWhenBooked: fd.get("stopWhenBooked") === "on",
        linkedinDailyCap: fd.get("linkedinDailyCap"),
        emailDailyCap: fd.get("emailDailyCap"),
        dnc: fd.get("dnc"),
      });
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Rules saved. The pool was graded again.");
    }
    if (act === "expert") {
      const res = TL.store.saveExpert({
        name: fd.get("name"),
        role: fd.get("role"),
        years: fd.get("years"),
        yearsLabel: fd.get("yearsLabel"),
        fn: fd.get("fn"),
        industry: fd.get("industry"),
        employer: fd.get("employer"),
        employerType: fd.get("employerType"),
        geography: fd.get("geography"),
        channel: fd.get("channel"),
        topics: fd.get("topics"),
        bio: fd.get("bio"),
        wont: fd.get("wont"),
        availability: fd.getAll("availability"),
        confidential: fd.get("confidential") === "on",
        mnpi: fd.get("mnpi") === "on",
        employerOk: fd.get("employerOk") === "on",
      });
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Profile saved. New requests will use it. Example requests already graded stay as they are.");
    }
    if (act === "accept") {
      const res = TL.store.respondInvite(fd.get("invite"), true, fd.get("attest") === "on");
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Accepted. Switch to Buyer and book a slot.");
    }
    if (act === "book") {
      const res = TL.store.book(fd.get("invite"), fd.get("slot"));
      if (!res.ok) return show("bad", res.error);
      return go("call.html?booking=" + res.id, "Booked. One example credit was used. No payment was taken.");
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
      if (!res.ok) return show("bad", res.error);
      return go("call.html?booking=" + fd.get("booking"), "Call logged.");
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || !form.dataset || !form.dataset.act) return;
    event.preventDefault();
    onSubmit(form);
  });

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn || btn.tagName === "FORM") return;
    const act = btn.dataset.act;
    if (act === "role") {
      TL.store.setRole(btn.dataset.role);
      const dest = { buyer: "dashboard.html", expert: "inbox.html", admin: "admin.html" };
      location.href = dest[btn.dataset.role] || "index.html";
      return;
    }
    if (act === "filter") {
      stageFilter = btn.dataset.stage || "all";
      paint();
      return;
    }
    if (act === "edit") {
      editing = btn.dataset.outreach;
      paint();
      return;
    }
    if (act === "cancel-edit") {
      editing = null;
      paint();
      return;
    }
    if (act === "approve") {
      const res = TL.store.approveOutreach(btn.dataset.request, btn.dataset.outreach);
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Approved inside this browser. Nothing was delivered.");
    }
    if (act === "skip") {
      const res = TL.store.skipOutreach(btn.dataset.request, btn.dataset.outreach);
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Skipped. Nothing was sent.");
    }
    if (act === "screen") {
      const res = TL.store.screenInvite(btn.dataset.invite);
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Simulated screening pass recorded. You can book them.");
    }
    if (act === "decline") {
      const res = TL.store.respondInvite(btn.dataset.invite, false, false);
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Declined.");
    }
    if (act === "credits") {
      const res = TL.store.addCredits(4);
      if (!res.ok) return show("bad", res.error);
      return show("ok", "Added 4 example credits. No payment was taken. Balance is " + res.balance + ".");
    }
    if (act === "reset") {
      if (!confirm("Clear this browser’s Trenchline demo and restore the example data?")) return;
      TL.store.reset();
      go("index.html", "Demo data restored.");
      return;
    }
    if (act === "draft-summary") {
      const notes = document.getElementById("notes");
      const summary = document.getElementById("summary");
      const booking = TL.store.get().bookings.find((b) => b.id === qs("booking"));
      const req = booking && TL.store.request(booking.requestId);
      if (summary) summary.value = TL.agents.draftSummary(notes ? notes.value : "", req);
      return;
    }
    if (act === "print") {
      window.print();
      return;
    }
    if (act === "download-consent") {
      const sheet = document.querySelector(".sheet");
      if (!sheet) return;
      const html = "<!doctype html><html><head><meta charset='utf-8'><title>Trenchline employer consent</title><style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#151513;line-height:1.5}h1{font-weight:400;font-style:italic}ul{padding-left:18px}.line{border-bottom:1px solid #151513;height:28px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:16px}</style></head><body>" + sheet.innerHTML + "</body></html>";
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "trenchline-employer-consent.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  });

  document.addEventListener("change", (event) => {
    const t = event.target;
    if (!t) return;
    if (t.name === "slot") {
      document.querySelectorAll(".slot").forEach((el) => el.classList.toggle("on", el.contains(t) && t.checked));
    }
    if (t.id === "outcome" || t.id === "minutes") {
      const out = document.getElementById("pay-preview");
      const outcome = document.getElementById("outcome");
      const minutes = document.getElementById("minutes");
      if (out && outcome && minutes) out.textContent = payPreview(outcome.value, minutes.value);
    }
  });

  function boot() {
    if (document.body.dataset.tlBoot) return;
    document.body.dataset.tlBoot = "1";
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
