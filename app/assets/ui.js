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

  const uiState = { q: "", pq: "", listTab: "open", ptab: "open", onlyStar: false, panel: null, menu: null, desc: null, reqId: "", rename: null, apanel: null, ctab: "upcoming" };

  function shell(page, body) {
    const cal = page === "home" && qs("view") === "calendar";
    const item = (href, label, on) => `<a class="${on ? "on" : ""}" href="${href}">${label}</a>`;
    const taking = page === "inbox" || page === "expert" || page === "payouts" || page === "consent";
    const note = banner; banner = null;
    const flashed = takeFlash();
    const msg = note ? `<div class="notice ${note.bad ? "bad" : ""}">${esc(note.text)}</div>` : flashed ? `<div class="notice">${esc(flashed)}</div>` : "";
    return `<div class="app" id="main">
      <aside class="side">
        <a class="brand" href="index.html">trenchline</a>
        <nav>
          ${taking
            ? `<p class="side-label">Taking calls</p>
               ${item("inbox.html", "Requests", (qs("view") || "requests") === "requests")}
               ${item("inbox.html?view=calls", "My calls", qs("view") === "calls")}
               ${item("inbox.html?view=earnings", "Earnings", qs("view") === "earnings")}
               ${item("inbox.html?view=profile", "Profile", qs("view") === "profile")}
               <a class="switchlink" href="index.html">Switch to founder view</a>`
            : `${item("index.html", "Projects", (page === "home" || page === "request" || page === "requestNew" || page === "book" || page === "call") && !cal)}
               ${item("index.html?view=calendar", "Calendar", cal)}
               <a class="switchlink" href="inbox.html">Switch to taking calls</a>`}
        </nav>
        <p class="ex">Example data</p>
      </aside>
      <div class="maincol">
        ${taking ? "" : `<div class="topbar"><a class="btn" href="request-new.html">New project</a></div>`}
        ${msg}${body}
        <p class="foot">${money(taking ? C.expertPayoutUsd : C.pricePerCallUsd)} / ${C.callMinutes} min. <button type="button" data-act="reset">Restore example</button></p>
      </div>
    </div>`;
  }

  function peopleFor(req) {
    const passed = req.passed || [];
    return req.matches
      .filter((m) => {
        if (m.excluded || m.grade === "X" || passed.indexOf(m.personId) >= 0) return false;
        if (m.personId === "ct_self") return true;
        const who = person(m.personId);
        if (!who) return false;
        const blob = (who.role + " " + who.industry + " " + (who.employerType || "")).toLowerCase();
        return /freight|broker|dispatch|ship|carrier|owner-operator|logistic|truck/.test(blob);
      })
      .slice(0, 6)
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

  function daySlots(p) {
    if (!p || p.id === "ex_sam") return [];
    if (p.chosenSlots && p.chosenSlots.length) {
      const now = Date.now();
      return p.chosenSlots.map((s) => new Date(s)).filter((d) => d.getTime() > now + 20 * 60000);
    }
    const now = new Date();
    const out = [];
    const seed = String(p.id).split("").reduce((n, c) => n + c.charCodeAt(0), 0);
    function add(offset, hour, minute) {
      const at = new Date();
      at.setDate(at.getDate() + offset);
      at.setHours(hour, minute || 0, 0, 0);
      if (at.getTime() > now.getTime() + 20 * 60000) out.push(at);
    }
    let startH = now.getHours() + 1;
    if (startH < 15) startH = 15;
    if (startH <= 17) {
      add(0, startH, 0);
      add(0, startH + 2, 0);
    } else if (startH <= 19) {
      add(0, startH, 0);
    }
    add(1 + (seed % 2), 9 + (seed % 3), 0);
    const seen = new Set();
    return out.filter((at) => {
      const key = at.toISOString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function chipLabel(list) {
    if (!list.length) return "";
    const first = list[0];
    const now = new Date();
    const same = first.toDateString() === now.toDateString();
    const tmr = new Date();
    tmr.setDate(now.getDate() + 1);
    const head = same ? "Today" : first.toDateString() === tmr.toDateString() ? "Tomorrow" : first.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (list.length === 1) return head + " " + first.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const last = list[list.length - 1];
    return head + " " + first.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + "–" + last.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function availabilityChips(p) {
    const slots = daySlots(p);
    const groups = [];
    slots.forEach((at) => {
      const key = at.toDateString();
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key: key, list: [] }; groups.push(g); }
      g.list.push(at);
    });
    const soon = groups.filter((g) => g.list[0].getTime() < Date.now() + 3 * 86400000);
    if (!soon.length) return `<span class="chip off">No availability in next 3 days</span>`;
    return soon.slice(0, 2).map((g) => `<span class="chip">${esc(chipLabel(g.list))}</span>`).join("");
  }

  function sideOf(p) {
    const s = (p.role + " " + (p.employerType || "") + " " + (p.topics || []).join(" ")).toLowerCase();
    if (/shipper|shipping/.test(s)) return "Shipper side";
    if (/carrier sales|^carrier|owner-operator/.test(s)) return "Carrier side";
    if (/broker|coordinator|dispatch/.test(s)) return "Broker side";
    return "";
  }

  function projectCounts(req) {
    const state = TL.store.get();
    const booked = new Set(state.bookings.filter((b) => b.requestId === req.id && b.status !== "cancelled").map((b) => b.personId));
    const people = peopleFor(req);
    return {
      received: people.length + (req.passed || []).length,
      fresh: people.filter((x) => !booked.has(x.p.id)).length,
      scheduled: state.bookings.filter((b) => b.requestId === req.id && b.status === "confirmed").length,
      completed: state.bookings.filter((b) => b.requestId === req.id && b.status !== "confirmed" && b.status !== "cancelled").length,
    };
  }

  function projects() {
    if (qs("view") === "calendar") {
      const rows = TL.store.get().bookings.filter((b) => b.status === "confirmed" || b.status === "completed").map((b) => {
        const p = person(b.personId);
        return `<article class="card"><h2 class="who">${esc(b.requestTitle)}</h2><p class="role">${esc(p ? p.name : "")} · ${esc(when(b.slot))} · ${esc(b.status)}</p></article>`;
      }).join("");
      return `<h1>Calendar</h1>${rows || blankCopy("Booked calls show up here, with the person and the time.")}`;
    }
    const state = TL.store.get();
    const openOn = uiState.listTab !== "closed";
    const q = (uiState.q || "").toLowerCase();
    const rows = state.requests.filter((r) => {
      const paused = r.status === "paused";
      if (openOn ? paused : !paused) return false;
      return !q || ((r.title || "") + " " + (r.name || "")).toLowerCase().indexOf(q) >= 0;
    }).map((r) => {
      const c = projectCounts(r);
      const openDesc = uiState.desc === r.id;
      const menu = uiState.menu === r.id ? `<div class="menu"><button type="button" data-act="status" data-id="${esc(r.id)}" data-status="${r.status === "paused" ? "active" : "paused"}">${r.status === "paused" ? "Resume" : "Pause"}</button></div>` : "";
      return `<tr data-go="request.html?id=${esc(r.id)}">
        <td><a class="pname" href="request.html?id=${esc(r.id)}">${esc(r.name || r.title)}</a><button type="button" class="textbtn" data-act="desc" data-id="${esc(r.id)}">View description</button>${openDesc ? `<p class="sub">${esc(r.title)}</p>` : ""}</td>
        <td>${c.received}${c.fresh ? ` <span class="pill">${c.fresh} new</span>` : ""}</td>
        <td>${c.scheduled}</td>
        <td>${c.completed}</td>
        <td>${esc(r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "")}</td>
        <td class="status">${r.status === "paused" ? "Paused" : "Active"} <button type="button" class="textbtn" data-act="menu" data-id="${esc(r.id)}" aria-label="Project menu">···</button>${menu}</td>
      </tr>`;
    }).join("");
    const nOpen = state.requests.filter((r) => r.status !== "paused").length;
    const nClosed = state.requests.length - nOpen;
    const acct = state.buyer || {};
    return `<h1>Projects</h1>
      <div class="tabs">
        <button type="button" class="${openOn ? "on" : ""}" data-act="ptab" data-tab="open">Open (${nOpen})</button>
        <button type="button" class="${openOn ? "" : "on"}" data-act="ptab" data-tab="closed">Closed (${nClosed})</button>
        <input id="projSearch" type="text" placeholder="Search" value="${esc(uiState.q || "")}">
      </div>
      <table class="grid">
        <thead><tr><th>Project</th><th>People</th><th>Scheduled</th><th>Completed</th><th>Updated</th><th>Status</th></tr></thead>
        <tbody>${rows || blankRow(6, "Projects you start show up here, with the people, the calls, and the status.")}</tbody>
      </table>
      <form data-act="account" class="account">
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
    const presetName = (fromReq && (fromReq.name || fromReq.title)) || pre;
    return `<a class="back" href="index.html">Projects</a>
      <h1>New project</h1>
      <p class="sub">Name the project, write the question, who does the work, and up to three things to ask.</p>
      <form data-act="ask">
        <label class="field">Project name<input type="text" name="name" value="${esc(presetName)}" placeholder="Find carriers" required ${fromReq ? "data-lock=\"1\"" : ""}></label>
        <label class="field">What do you want to understand?<span>The question</span>
          <textarea name="q" required placeholder="How do freight brokers find new carriers?">${esc(pre)}</textarea>
        </label>
        <label class="field">Who do you want to talk to?<input type="text" name="who" value="${esc(who)}" placeholder="Freight coordinator"></label>
        ${fields}
        <div class="form-actions"><button class="btn" type="submit">Find people</button></div>
      </form>`;
  }

  function slotGroups(p) {
    const groups = [];
    daySlots(p).forEach((at) => {
      const key = at.toDateString();
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key: key, label: chipLabel([at]).replace(/\s+\d.*$/, ""), list: [] }; groups.push(g); }
      g.list.push(at);
    });
    return groups;
  }

  function profilePanel(req, p) {
    const pairs = pairsFor(req, p.id).map((x) => `<div class="qa"><p class="q">${esc(x.q)}</p><p>${esc(x.a || "No answer yet.")}</p></div>`).join("");
    return `<aside class="drawer"><button type="button" class="x" data-act="close-panel" aria-label="Close">×</button>
      <h2 class="who">${esc(p.name)}</h2>
      <p class="role">${esc(p.role)} · ${esc(p.employerType || "")} · ${esc(p.yearsLabel)}</p>
      <p class="bio">${esc(p.bio || "")}</p>
      ${pairs}</aside>`;
  }

  function timePanel(req, p) {
    const groups = [];
    daySlots(p).forEach((at) => {
      const key = at.toDateString();
      let g = groups.find((x) => x.key === key);
      if (!g) {
        const label = at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        g = { key: key, label: label, list: [] };
        groups.push(g);
      }
      g.list.push(at);
    });
    const body = groups.map((g) => `<div class="day"><h3>${esc(g.label)}</h3>${g.list.map((at) => `<button type="button" class="slot" data-act="confirm-slot" data-request="${esc(req.id)}" data-person="${esc(p.id)}" data-slot="${esc(at.toISOString())}">${esc(at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}</button>`).join("")}</div>`).join("");
    return `<aside class="drawer"><button type="button" class="x" data-act="close-panel" aria-label="Close">×</button>
      <h2>Pick a time</h2>
      <p class="sub">${esc(p.name)} · ${money(C.pricePerCallUsd)} / 30 min</p>
      ${body || "<p class='sub'>No open times.</p>"}</aside>`;
  }

  function project() {
    const req = TL.store.request(qs("id"));
    if (!req) return `<h1>That project isn’t here.</h1><a class="btn" href="index.html">Projects</a>`;
    if (uiState.reqId !== req.id) {
      uiState.reqId = req.id;
      uiState.ptab = "open";
      uiState.onlyStar = false;
      uiState.pq = "";
      uiState.panel = null;
    }
    const state = TL.store.get();
    const calls = state.bookings.filter((b) => b.requestId === req.id && b.status !== "cancelled");
    const scheduled = calls.filter((b) => b.status === "confirmed");
    const completed = calls.filter((b) => b.status !== "confirmed");
    const taken = new Set(calls.map((b) => b.personId));
    const stars = req.shortlist || [];
    let people = peopleFor(req).filter((x) => !taken.has(x.p.id));
    const declined = (req.passed || []).map(person).filter(Boolean);
    const q = (uiState.pq || "").toLowerCase();
    if (q) people = people.filter((x) => (x.p.name + " " + x.p.role).toLowerCase().indexOf(q) >= 0);
    if (uiState.onlyStar) people = people.filter((x) => stars.indexOf(x.p.id) >= 0);
    const tab = uiState.ptab || "open";
    const rows = people.map(({ p }) => {
      const side = sideOf(p);
      return `<tr>
        <td><button type="button" class="star ${stars.indexOf(p.id) >= 0 ? "on" : ""}" data-act="star" data-request="${esc(req.id)}" data-person="${esc(p.id)}" aria-label="Shortlist">${stars.indexOf(p.id) >= 0 ? "★" : "☆"}</button></td>
        <td><button type="button" class="pname" data-act="profile" data-request="${esc(req.id)}" data-person="${esc(p.id)}">${esc(p.name)}</button><div class="role">${esc(p.role)} · ${esc(p.yearsLabel)}</div></td>
        <td>${esc(p.employerType || "")}${side ? `<div><span class="tag">${esc(side)}</span></div>` : ""}</td>
        <td class="avails">${availabilityChips(p)}</td>
        <td class="act"><button type="button" class="btn" data-act="pick" data-request="${esc(req.id)}" data-person="${esc(p.id)}">Request</button><button type="button" class="xsmall" data-act="pass" data-request="${esc(req.id)}" data-person="${esc(p.id)}" aria-label="Not a fit">×</button><div class="price">${money(C.pricePerCallUsd)} / 30 min</div></td>
      </tr>`;
    }).join("");
    const schedRows = scheduled.map((b) => {
      const p = person(b.personId);
      return `<tr><td><button type="button" class="pname" data-act="profile" data-request="${esc(req.id)}" data-person="${esc(b.personId)}">${esc(p ? p.name : "Call")}</button><div class="role">${esc(when(b.slot))}</div></td><td>${money(C.pricePerCallUsd)} / 30 min</td><td><a class="btn" href="call.html?booking=${esc(b.id)}">Mark done</a></td></tr>`;
    }).join("");
    const doneRows = completed.map((b) => {
      const p = person(b.personId);
      const text = b.summary || b.notes || "No notes.";
      return `<tr><td><span class="pname">${esc(p ? p.name : "Call")}</span><div class="role">${esc(when(b.completedAt || b.slot))}</div><div class="note">${esc(text)}</div></td></tr>`;
    }).join("");
    const decRows = declined.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(p.employerType || "")}</td></tr>`).join("");
    let table = "";
    if (tab === "scheduled") table = `<table class="grid"><thead><tr><th>Call</th><th>Price</th><th></th></tr></thead><tbody>${schedRows || blankRow(3, "Calls you book show up here, with the time and the price.")}</tbody></table>`;
    else if (tab === "done") table = `<table class="grid"><tbody>${doneRows || blankRow(1, "Finished calls show up here, with the notes you saved.")}</tbody></table>`;
    else if (tab === "declined") table = `<table class="grid"><thead><tr><th>Name</th><th>Role</th><th>Company</th></tr></thead><tbody>${decRows || blankRow(3, "People you pass on show up here.")}</tbody></table>`;
    else table = `<table class="grid people"><thead><tr><th></th><th>Name</th><th>Company</th><th>Availability</th><th></th></tr></thead><tbody>${rows || blankRow(5, "People who can talk about this show up here.")}</tbody></table>`;
    const who = uiState.panel && uiState.panel.request === req.id ? person(uiState.panel.person) : null;
    const drawer = who ? (uiState.panel.kind === "time" ? timePanel(req, who) : profilePanel(req, who)) : "";
    const renaming = uiState.rename === req.id;
    return `<a class="back" href="index.html">Projects</a>
      <div class="titleline">${renaming
        ? `<form data-act="rename" class="rename"><input type="hidden" name="id" value="${esc(req.id)}"><input type="text" name="name" value="${esc(req.name || req.title)}" required><button class="btn" type="submit">Save</button></form>`
        : `<h1>${esc(req.name || req.title)}</h1><button type="button" class="textbtn" data-act="rename" data-id="${esc(req.id)}" aria-label="Rename">✎ Rename</button>`}
      </div>
      <p class="sub">${esc(req.title)}</p>
      <p class="more"><a class="btn secondary" href="request-new.html?q=${encodeURIComponent(req.title)}&from=${esc(req.id)}">Find more people</a></p>
      <div class="tabs">
        <button type="button" class="${tab === "open" ? "on" : ""}" data-act="stab" data-tab="open">Not scheduled (${peopleFor(req).filter((x) => !taken.has(x.p.id)).length})</button>
        <button type="button" class="${tab === "scheduled" ? "on" : ""}" data-act="stab" data-tab="scheduled">Scheduled (${scheduled.length})</button>
        <button type="button" class="${tab === "done" ? "on" : ""}" data-act="stab" data-tab="done">Completed (${completed.length})</button>
        <button type="button" class="${tab === "declined" ? "on" : ""}" data-act="stab" data-tab="declined">Declined (${declined.length})</button>
        <label class="switch"><input type="checkbox" data-act="onlystar" ${uiState.onlyStar ? "checked" : ""}><span>Only shortlisted</span></label>
        <input id="peopleSearch" type="text" placeholder="Search" value="${esc(uiState.pq || "")}">
      </div>
      ${table}
      ${drawer ? `<div class="shade" data-act="close-panel"></div>${drawer}` : ""}`;
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
        ${req ? `<div style="margin-top:16px"><a class="btn secondary" href="request.html?id=${esc(req.id)}">Back to the project</a></div>` : ""}`;
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

  function offerTimes() {
    const out = [];
    const now = new Date();
    for (let d = 0; d < 4 && out.length < 8; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      [9, 12, 15, 18].forEach((h) => {
        const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0);
        if (slot.getTime() > now.getTime() + 30 * 60000) out.push(slot);
      });
    }
    return out.slice(0, 8);
  }

  function answerPanel(req) {
    const mine = (req.answers && req.answers.ct_self) || [];
    const who = person("ct_self");
    const picked = (who && who.chosenSlots) || [];
    const fields = (req.screening || []).slice(0, 3).map((q, i) => `<label class="field">${esc(q)}<input type="text" name="s${i + 1}" value="${esc(mine[i] || "")}" required></label>`).join("");
    const times = offerTimes().map((d) => {
      const iso = d.toISOString();
      return `<label><input type="checkbox" name="slot" value="${esc(iso)}" ${picked.indexOf(iso) >= 0 ? "checked" : ""}> ${esc(when(iso))}</label>`;
    }).join("");
    return `<div class="shade" data-act="close-panel"></div>
      <aside class="drawer">
        <button type="button" class="x" data-act="close-panel" aria-label="Close">×</button>
        <h2>${esc(req.name || req.title)}</h2>
        <p class="sub">${esc(req.title)}</p>
        <form data-act="screen">
          <input type="hidden" name="request" value="${esc(req.id)}">
          <input type="hidden" name="choice" value="accept">
          ${fields || "<p class='sub'>No screener questions.</p>"}
          <p class="field">Times you can talk</p>
          <div class="checks">${times}</div>
          <div class="form-actions"><button class="btn" type="submit">Answer &amp; accept</button></div>
        </form>
      </aside>`;
  }

  function blankCopy(text) {
    return `<p class="sub">${text}</p><p class="more"><button type="button" class="btn secondary" data-act="reset">Restore example</button></p>`;
  }

  function blankRow(cols, text) {
    return `<tr><td colspan="${cols}">${blankCopy(text)}</td></tr>`;
  }

  function takerRequests() {
    const open = TL.store.openRequests();
    const rows = open.map((req) => {
      const answered = req.answers && req.answers.ct_self && req.answers.ct_self.filter(Boolean).length;
      return `<tr>
        <td>${esc(req.name || req.title)}</td>
        <td>${esc(req.title)}</td>
        <td>${esc((req.who && req.who.role) || "")}</td>
        <td>${money(C.expertPayoutUsd)} / ${C.callMinutes} min</td>
        <td class="acts">${answered ? "<span class='tag'>Answered</span>" : ""}<button type="button" class="btn" data-act="answer" data-id="${esc(req.id)}">Answer &amp; accept</button><button type="button" class="xsmall" data-act="taker-no" data-id="${esc(req.id)}" aria-label="Decline">×</button></td>
      </tr>`;
    }).join("");
    const panelReq = uiState.apanel && open.find((r) => r.id === uiState.apanel);
    return `<h1>Requests</h1>
      <p class="sub">Projects people want to talk about. ${money(C.expertPayoutUsd)} / ${C.callMinutes} min. Example only. Nothing is paid.</p>
      <table class="grid"><thead><tr><th>Project</th><th>Question</th><th>Who they want</th><th>Payout</th><th></th></tr></thead>
      <tbody>${rows || blankRow(5, "Requests show up here with the project, the question, and who they want to talk to.")}</tbody></table>
      ${panelReq ? answerPanel(panelReq) : ""}`;
  }

  function takerCalls(state) {
    const tab = uiState.ctab || "upcoming";
    const mine = (state.bookings || []).filter((b) => b.personId === "ct_self");
    const list = mine.filter((b) => tab === "completed" ? b.status !== "confirmed" : b.status === "confirmed");
    const empty = tab === "completed"
      ? "Finished calls show up here, with the day they happened."
      : "Calls you accept show up here, with the time.";
    const rows = list.map((b) => {
      const req = TL.store.request(b.requestId);
      return `<tr><td>${esc((req && (req.name || req.title)) || b.requestTitle)}</td><td>${esc(when(b.slot))}</td><td>${esc(b.status === "confirmed" ? "Upcoming" : "Completed")}</td></tr>`;
    }).join("");
    return `<h1>My calls</h1>
      <div class="tabs">
        <button type="button" class="${tab === "upcoming" ? "on" : ""}" data-act="ctab" data-tab="upcoming">Upcoming (${mine.filter((b) => b.status === "confirmed").length})</button>
        <button type="button" class="${tab === "completed" ? "on" : ""}" data-act="ctab" data-tab="completed">Completed (${mine.filter((b) => b.status !== "confirmed").length})</button>
      </div>
      <table class="grid"><thead><tr><th>Project</th><th>When</th><th></th></tr></thead><tbody>${rows || blankRow(3, empty)}</tbody></table>`;
  }

  function takerEarnings(state) {
    const mine = (state.bookings || []).filter((b) => b.personId === "ct_self");
    const done = mine.filter((b) => b.status === "completed");
    const upcoming = mine.filter((b) => b.status === "confirmed");
    const total = done.reduce((n, b) => n + TL.store.payoutInfo(b).amount, 0);
    const rows = mine.map((b) => {
      const pay = TL.store.payoutInfo(b);
      const req = TL.store.request(b.requestId);
      const amount = b.status === "completed" ? money(pay.amount) : "After the call";
      return `<tr><td>${esc((req && (req.name || req.title)) || b.requestTitle)}</td><td>${esc(b.status === "confirmed" ? "Upcoming" : "Completed")}</td><td>${amount}</td></tr>`;
    }).join("");
    return `<h1>Earnings</h1>
      <p class="sub">${money(C.expertPayoutUsd)} / ${C.callMinutes} min. Example only. Nothing is paid.</p>
      <div class="summary">
        <div><span>Upcoming</span><strong>${upcoming.length}</strong></div>
        <div><span>Completed</span><strong>${done.length}</strong></div>
        <div><span>Example total</span><strong>${money(total)}</strong></div>
      </div>
      <table class="grid"><thead><tr><th>Project</th><th>Status</th><th>Amount</th></tr></thead><tbody>${rows || blankRow(3, "Finished calls show up here at " + money(C.expertPayoutUsd) + " each. Nothing is paid in this example.")}</tbody></table>`;
  }

  function takerProfile(state) {
    const who = person("ct_self") || {};
    const taker = state.callTaker || {};
    const picked = who.chosenSlots || [];
    const times = offerTimes().map((d) => {
      const iso = d.toISOString();
      return `<label><input type="checkbox" name="slot" value="${esc(iso)}" ${picked.indexOf(iso) >= 0 ? "checked" : ""}> ${esc(when(iso))}</label>`;
    }).join("");
    return `<h1>Profile</h1>
      <p class="sub">${taker.example ? "Example profile. " : ""}This is what shows when someone looks at you.</p>
      <form data-act="profile">
        <label class="field">Name<input type="text" name="name" value="${esc(taker.name || "")}" required></label>
        <label class="field">Email<input type="text" name="email" value="${esc(taker.email || "")}" required></label>
        <label class="field">Role<input type="text" name="role" value="${esc(who.role || taker.role || "")}" required></label>
        <label class="field">Company type<input type="text" name="companyType" value="${esc(who.employerType || taker.companyType || "")}"></label>
        <label class="field">Years<input type="text" name="years" inputmode="numeric" value="${esc(String(who.years || taker.years || ""))}"></label>
        <label class="field">Short bio<textarea name="background">${esc(who.bio || taker.background || "")}</textarea></label>
        <p class="field">Availability</p>
        <div class="checks">${times}</div>
        <div class="form-actions"><button class="btn" type="submit">Save</button></div>
      </form>`;
  }

  function inbox() {
    const state = TL.store.get();
    const view = qs("view") || "requests";
    if (view === "calls") return takerCalls(state);
    if (view === "earnings") return takerEarnings(state);
    if (view === "profile") return takerProfile(state);
    return takerRequests(state);
  }

  function payouts() {
    const state = TL.store.get();
    const rows = state.bookings.filter((b) => b.personId === state.expertId).map((b) => {
      const pay = TL.store.payoutInfo(b);
      return `<tr><td>${esc(b.requestTitle)}</td><td>${esc(b.status)}</td><td>${money(pay.amount)}</td><td>${esc(pay.status)}</td></tr>`;
    }).join("");
    return `<h1>Payouts</h1><p class="sub">Paid for minutes completed, about ${C.payoutDays} days later. Example only. Nothing is transferred.</p>
      <table><thead><tr><th>Call</th><th>Status</th><th>Amount</th><th>Payout</th></tr></thead><tbody>${rows || blankRow(4, "Finished calls show up here after the minutes are logged.")}</tbody></table>`;
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
    const row = e.target.closest("tr[data-go]");
    if (row && !e.target.closest("a, button, input, label")) { location.href = row.dataset.go; return; }
    const b = e.target.closest("[data-act]");
    if (!b || b.type === "submit") return;
    if (b.dataset.act === "reset") {
      TL.store.reset();
      uiState.panel = null;
      uiState.apanel = null;
      const here = /inbox\.html|expert\.html/.test(location.pathname);
      return go(here ? "inbox.html" + location.search : "index.html", "Example restored.");
    }
    if (b.dataset.act === "ptab") { uiState.listTab = b.dataset.tab; uiState.menu = null; paint(); return; }
    if (b.dataset.act === "onlystar") { uiState.onlyStar = !!b.checked; paint(); return; }
    if (b.dataset.act === "stab") { uiState.ptab = b.dataset.tab; paint(); return; }
    if (b.dataset.act === "desc") { uiState.desc = uiState.desc === b.dataset.id ? null : b.dataset.id; paint(); return; }
    if (b.dataset.act === "menu") { uiState.menu = uiState.menu === b.dataset.id ? null : b.dataset.id; paint(); return; }
    if (b.dataset.act === "status") { TL.store.setStatus(b.dataset.id, b.dataset.status); uiState.menu = null; paint(); return; }
    if (b.dataset.act === "star") { TL.store.toggleShortlist(b.dataset.request, b.dataset.person); paint(); return; }
    if (b.dataset.act === "profile") { uiState.panel = { kind: "profile", request: b.dataset.request, person: b.dataset.person }; paint(); return; }
    if (b.dataset.act === "pick") { uiState.panel = { kind: "time", request: b.dataset.request, person: b.dataset.person }; paint(); return; }
    if (b.dataset.act === "close-panel") { uiState.panel = null; uiState.apanel = null; paint(); return; }
    if (b.dataset.act === "rename") { uiState.rename = b.dataset.id; paint(); return; }
    if (b.dataset.act === "answer") { uiState.apanel = b.dataset.id; paint(); return; }
    if (b.dataset.act === "ctab") { uiState.ctab = b.dataset.tab; paint(); return; }
    if (b.dataset.act === "taker-no") {
      const res = TL.store.passPerson(b.dataset.id, "ct_self");
      uiState.apanel = null;
      return show(res.ok ? "Declined." : res.error, !res.ok);
    }
    if (b.dataset.act === "confirm-slot") {
      const res = TL.store.scheduleCall(b.dataset.request, b.dataset.person, b.dataset.slot);
      if (!res.ok) return show(res.error, true);
      uiState.panel = null;
      uiState.ptab = "scheduled";
      return show("Call scheduled.");
    }
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

  document.addEventListener("input", (e) => {
    if (e.target.id === "projSearch") {
      uiState.q = e.target.value;
      paint();
      const el = document.getElementById("projSearch");
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
    if (e.target.name === "q" && e.target.form && e.target.form.dataset.act === "ask") {
      const name = e.target.form.querySelector("[name=name]");
      if (name && name.dataset.lock !== "1") name.value = e.target.value;
    }
    if (e.target.name === "name" && e.target.form && e.target.form.dataset.act === "ask" && e.isTrusted) e.target.dataset.lock = "1";
    if (e.target.id === "peopleSearch") {
      uiState.pq = e.target.value;
      paint();
      const el = document.getElementById("peopleSearch");
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
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
      const name = String(fd.get("name") || "").trim() || q;
      const res = TL.store.createRequest(Object.assign({}, base, { title: q, decision: q, name: name, role: who || base.role, screening: screening.length ? screening : base.screening.slice(0, 3) }));
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
      const res = TL.store.saveCallTaker({
        name: fd.get("name"),
        email: fd.get("email"),
        role: fd.get("role"),
        background: fd.get("background"),
        companyType: fd.get("companyType"),
        years: fd.get("years"),
      });
      return show(res.ok ? "Saved." : res.error, !res.ok);
    }
    if (form.dataset.act === "rename") {
      const res = TL.store.renameRequest(fd.get("id"), fd.get("name"));
      uiState.rename = null;
      return show(res.ok ? "Renamed." : res.error, !res.ok);
    }
    if (form.dataset.act === "screen") {
      const answers = [fd.get("s1"), fd.get("s2"), fd.get("s3")];
      const slots = fd.getAll("slot");
      if (!slots.length) return show("Pick a time you can talk.", true);
      const res = TL.store.saveAnswers(fd.get("request"), "ct_self", answers, true, slots);
      if (!res.ok) return show(res.error, true);
      uiState.apanel = null;
      return show("Answers saved. They show on the project.");
    }
    if (form.dataset.act === "profile") {
      const res = TL.store.saveCallTaker({
        name: fd.get("name"),
        email: fd.get("email"),
        role: fd.get("role"),
        background: fd.get("background"),
        companyType: fd.get("companyType"),
        years: fd.get("years"),
        slots: fd.getAll("slot"),
      });
      return show(res.ok ? "Saved." : res.error, !res.ok);
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
      <h1>${esc(req.name || req.title)}</h1>
      <p class="sub">${esc(req.title)}</p>
      <section class="section"><h2>People to talk to</h2>${people || blankCopy("People who can talk about this show up here.")}</section>`;
  }

  function startFromQuestion(root, q) {
    root.innerHTML = shell("home", `<h1>${esc(q)}</h1><p class="sub" id="finding">Finding people who do this work...</p>`);
    setTimeout(() => {
      const key = "tl.q." + q;
      let id = sessionStorage.getItem(key);
      let req = id && TL.store.request(id);
      if (!req) {
        const brief = TL.agents.SAMPLE_BRIEF;
        const res = TL.store.createRequest(Object.assign({}, brief, { title: q, decision: q, name: q, screening: (brief.screening || []).slice(0, 3) }));
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
