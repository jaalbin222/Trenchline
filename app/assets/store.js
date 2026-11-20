/* Persistence boundary.
   UI and agents talk to TL.store. localStorage is the only side effect.
   Swap this file for an API client with the same method names and return
   shapes ({ ok, error } or a state snapshot) when a backend exists. */
(function () {
  const TL = (window.TL = window.TL || {});
  const memory = { raw: null };

  function dbRead() {
    try {
      return localStorage.getItem(TL.CONFIG.storageKey);
    } catch (e) {
      return memory.raw;
    }
  }
  function dbWrite(value) {
    memory.raw = value;
    try {
      localStorage.setItem(TL.CONFIG.storageKey, value);
    } catch (e) {
      /* private mode: memory copy still works for this tab */
    }
  }
  function dbClear() {
    memory.raw = null;
    try {
      localStorage.removeItem(TL.CONFIG.storageKey);
    } catch (e) {}
  }

  function clip(s, n) {
    return String(s == null ? "" : s).trim().slice(0, n);
  }
  function nid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }
  function iso(ms) {
    return new Date(ms).toISOString();
  }

  function pool() {
    const avail = ["Tue 12:00", "Tue 16:00", "Thu 12:00", "Thu 16:30", "Fri 09:00"];
    const people = [
      ["ex_priya", "Priya N.", "Payroll associate", 2, "2 yrs", "Finance", "Financial services", "Harbor Credit Union", "Regional credit union", "201–1,000", false, "Canada", "email", ["payroll reconciliation", "off-cycle runs", "ledger exceptions"], "Does the payroll-to-ledger tie-out a few times a month.", true],
      ["ex_marcus", "Marcus T.", "Payroll accountant", 3, "3 yrs", "Finance", "Financial services", "Lakeshore Credit Union", "Regional credit union", "51–200", false, "United States", "linkedin", ["payroll reconciliation", "tax filings", "exceptions"], "Reconciles payroll for a credit union with a few dozen business members.", false],
      ["ex_sofia", "Sofia M.", "KYC analyst", 2, "1.5 yrs", "Compliance", "Financial services", "Field & Pine Bank", "Retail bank", "1,000+", false, "United States", "email", ["KYC refresh", "periodic review", "evidence chase"], "Works the periodic KYC queue at a retail bank.", false],
      ["ex_lena", "Lena K.", "Ops analyst", 1, "1 yr", "Operations", "Payments", "Northline Payments", "Payments company", "51–200", false, "Canada", "email", ["merchant onboarding", "KYB", "exceptions"], "Onboards merchants and clears KYB exceptions.", false],
      ["ex_maya", "Maya L.", "Freight coordinator", 3, "3 yrs", "Operations", "Logistics", "Harbor Freight Desk", "Freight brokerage", "51–200", false, "United States", "email", ["carriers", "lanes", "capacity"], "Maya spends her week finding trucks for shippers who already have freight and no carrier. She keeps a short list of carriers who ran a lane before, then calls down the list when a new load appears. Most of the yeses still come back by text.", true],
      ["ex_sam", "Sam K.", "Carrier sales", 2, "2 yrs", "Sales", "Logistics", "Redlane", "Freight brokerage", "11–50", false, "United States", "email", ["carriers", "new lanes"], "Sam sells capacity for a small brokerage. When a lane is empty he calls carriers he has used, then the ones who asked for freight last month. He writes the rate on a pad before it goes into the system.", false],
      ["ex_noah", "Noah P.", "Dispatcher", 2, "2 yrs", "Operations", "Logistics", "Northline", "Freight brokerage", "51–200", false, "United States", "email", ["cancellations", "loads", "drivers"], "Noah watches the board for loads that fall off in the afternoon. He calls the driver first, then a backup carrier, and notes the new truck on a sheet until morning dispatch. A cancellation after 3pm usually means the load sits overnight.", false],
      ["ex_elena", "Elena V.", "Shipping manager", 4, "4 yrs", "Operations", "Logistics", "Fieldstone Goods", "Shipper", "201–1,000", false, "United States", "email", ["quotes", "lanes", "brokers"], "Elena moves freight for a shipper with a few dozen lanes. She asks two or three brokers for a quote and compares them in a spreadsheet. She does not trust a rate that leaves out the extra fees.", false],
      ["ex_dev", "Dev R.", "Accountant", 2, "2 yrs", "Finance", "Accounting", "Hart & Co.", "Accounting firm", "11–50", false, "Canada", "linkedin", ["month-end close", "bank recs", "client chase"], "Closes the books for small business clients.", false],
      ["ex_luis", "Luis G.", "Chargeback analyst", 4, "4 yrs", "Operations", "Fintech", "Pebble Neobank", "Neobank", "201–1,000", false, "United States", "email", ["chargebacks", "disputes", "evidence"], "Handles card disputes at a neobank.", false],
      ["ex_nina", "Nina V.", "Finance ops intern", 0.5, "<1 yr", "Finance", "Software", "Paperlane", "B2B SaaS", "11–50", false, "Canada", "linkedin", ["invoices", "collections", "CRM"], "Spent a co-op in finance ops at a software company.", false],
      ["ex_hana", "Hana S.", "AP coordinator", 1, "1 yr", "Finance", "Manufacturing", "Brightmill", "Mid-market manufacturer", "201–1,000", false, "United States", "email", ["accounts payable", "PO match", "vendor setup"], "Matches invoices to POs at a manufacturer. Horizontal example, not fintech.", false],
      ["ex_owen", "Owen P.", "Payments operations manager", 9, "9 yrs", "Operations", "Payments", "Relay Bank", "Bank", "1,000+", false, "United States", "linkedin", ["wires", "ACH", "ops reviews"], "Runs a payments ops team. Senior supply, allowed, not the core.", false],
      ["ex_chris", "Chris A.", "Controller", 12, "12 yrs", "Finance", "Financial services", "Northwind Bancorp", "Regional bank", "1,000+", false, "United States", "email", ["close", "controls", "audit"], "Owns the close. An executive profile, included to show seniority is allowed and usually a weak fit.", false],
      ["ex_jordan", "Jordan P.", "Payroll specialist", 2, "2 yrs", "Finance", "Financial services", "MegaBank National", "National bank", "1,000+", false, "United States", "linkedin", ["payroll", "reconciliations", "funding"], "Would match a payroll brief, and is blocked when MegaBank National is on the do-not-contact list.", false],
    ];
    return people.map((p) => ({
      id: p[0],
      example: true,
      self: p[15] === true,
      name: p[1],
      role: p[2],
      years: p[3],
      yearsLabel: p[4],
      fn: p[5],
      industry: p[6],
      employer: p[7],
      employerType: p[8],
      companySize: p[9],
      former: p[10],
      geography: p[11],
      channel: p[12],
      topics: p[13],
      wont: "Employer name, customers, internal systems, pricing, and anything confidential or non-public.",
      bio: p[14],
      availability: avail.slice(),
      timezone: "America/Toronto",
      onboarded: true,
      complianceAcceptedAt: iso(Date.now()),
    }));
  }

  function buyerSeed() {
    return {
      id: "buyer_northpaper",
      example: true,
      company: "Northpaper",
      website: "northpaper.example",
      size: "11–50",
      stage: "Early-stage",
      industry: "Fintech",
      name: "Jamie L.",
      role: "Founder",
      email: "jamie@northpaper.example",
      sells: "Software for small-business finance teams. Example company, not a real one.",
    };
  }

  function blankRequest(input, buyer, people, createdAt) {
    const request = {
      id: nid("req"),
      example: false,
      createdAt: createdAt || new Date().toISOString(),
      title: clip(input.title, 140),
      decision: clip(input.decision, 600),
      calls: Math.max(1, Math.min(10, Number(input.calls) || 1)),
      timeline: clip(input.timeline, 80),
      who: {
        role: clip(input.role, 160),
        fn: clip(input.fn, 80),
        industry: clip(input.industry, 80),
        companyType: clip(input.companyType, 160),
        companySize: clip(input.companySize, 40),
        years: clip(input.years, 40),
        geography: clip(input.geography, 80),
        targetCompanies: clip(input.targetCompanies, 200),
        avoidCompanies: (input.avoidCompanies || []).map((s) => clip(s, 80)).filter(Boolean).slice(0, 20),
        formerWithin: clip(input.formerWithin, 80),
      },
      screening: (input.screening || []).map((s) => clip(s, 300)).filter(Boolean).slice(0, 12),
      qualify: clip(input.qualify, 300),
      routing: {
        profilesTo: clip(input.profilesTo, 120),
        calendarTo: clip(input.calendarTo, 120),
        updates: input.updates === "digest" ? "digest" : "rolling",
      },
      rules: {
        stopWhenBooked: true,
        linkedinDailyCap: TL.CONFIG.linkedinDailyCap,
        emailDailyCap: TL.CONFIG.emailDailyCap,
        dnc: [],
      },
      matches: [],
      outreach: [],
      activity: [],
    };
    refillAgents(request, buyer, people, true);
    return request;
  }

  function refillAgents(request, buyer, people, initial) {
    request.icp = TL.agents.draftIcp(request);
    request.matches = TL.agents.matchRequest(request, people);
    const keep = {};
    request.outreach.forEach((o) => {
      keep[o.personId] = o;
    });
    request.outreach = request.matches
      .filter((m) => !m.excluded && m.grade !== "D" && m.grade !== "X")
      .map((m) => {
        if (keep[m.personId] && keep[m.personId].status !== "draft") return keep[m.personId];
        const person = people.find((p) => p.id === m.personId);
        const draft = TL.agents.draftOutreach(request, person, buyer);
        return {
          id: (keep[m.personId] && keep[m.personId].id) || "out_" + request.id + "_" + person.id,
          personId: person.id,
          step: 1,
          status: "draft",
          channel: draft.channel,
          subject: draft.subject,
          body: draft.body,
          step2Subject: draft.step2Subject,
          step2Body: draft.step2Body,
          step2Status: "held",
          sentAt: null,
          skipReason: "",
        };
      });
    const at = new Date().toISOString();
    request.activity.unshift({
      at: at,
      agent: "icp",
      text: initial
        ? "Drafted a plain-language ICP from the brief. Template, not a model."
        : "Re-drafted the ICP and grades from the current brief. Template, not a model.",
    });
    request.activity.unshift({
      at: at,
      agent: "match",
      text: "Graded " + people.length + " example practitioners. LLM_HOOK: TL.agents.matchRequest.",
    });
  }

  function sampleAnswer(person, question) {
    const q = String(question || "").toLowerCase();
    const place = person.employerType || "a freight company";
    if (/slow|hard|trust/.test(q)) return "The slow part is waiting on a callback. I keep a short list until someone confirms a truck.";
    if (/hand|board|sheet|compare|paper/.test(q)) return "I still write it on a sheet, then copy the yes into the system at the end of the day.";
    if (/who|call first/.test(q)) return "I call the driver I used last week, then the two carriers who run that lane.";
    if (/quote|rate|fee/.test(q)) return "A quote that leaves out the extra fees is the one I do not trust. I ask them to resend it in one line.";
    return "Last time I did this at " + place + ", it took most of an afternoon. I still had to check one truck by phone. I work as a " + person.role + ".";
  }

  function fillAnswers(request, pool) {
    request.answers = request.answers || {};
    request.passed = request.passed || [];
    const questions = (request.screening || []).slice(0, 3);
    (request.matches || []).filter((m) => !m.excluded && m.grade !== "X").slice(0, 6).forEach((m) => {
      if (request.answers[m.personId]) return;
      const who = pool.find((p) => p.id === m.personId);
      if (!who || who.id === "ct_self") return;
      request.answers[m.personId] = questions.map((s) => sampleAnswer(who, s));
    });
  }

  function takerMatches(request, taker) {
    const blob = ((taker.role || "") + " " + (taker.background || "")).toLowerCase();
    if (/freight|broker|dispatch|ship|carrier|load|truck|logistic/.test(blob)) return true;
    const words = blob.split(/\W+/).filter((w) => w.length > 3);
    const hay = (request.title + " " + (request.who && request.who.role) + " " + (request.who && request.who.industry)).toLowerCase();
    return words.some((w) => hay.indexOf(w) >= 0);
  }

  function attachTaker(state, request) {
    const taker = state.callTaker;
    if (!taker || !takerMatches(request, taker)) return;
    const who = state.pool.find((p) => p.id === "ct_self");
    if (!who) return;
    if (!request.matches.some((m) => m.personId === "ct_self")) {
      request.matches.unshift({ personId: "ct_self", grade: "B", score: 70, excluded: false, reasons: ["Signed up in this browser."] });
    }
  }

  function seed() {
    const now = Date.now();
    const day = 86400000;
    const people = pool();
    const buyer = buyerSeed();
    const price = TL.CONFIG.pricePerCallUsd;

    function story(id, input, createdAt) {
      const req = blankRequest(input, buyer, people, createdAt);
      req.id = id;
      req.example = true;
      req.outreach.forEach((o) => {
        o.id = "out_" + id + "_" + o.personId;
      });
      return req;
    }

    const shared = {
      companyType: "Current practitioner at a company in the industry",
      companySize: "11–200",
      years: "0–4 years",
      geography: "United States or Canada",
      targetCompanies: "",
      avoidCompanies: [],
      formerWithin: "",
      calls: 3,
      timeline: "2 weeks",
      profilesTo: "You",
      calendarTo: "You",
      updates: "rolling",
    };

    const freight = story(
      "req_freight",
      Object.assign({}, shared, {
        title: "How do freight brokers find new carriers?",
        decision: "How do freight brokers find new carriers?",
        role: "Freight coordinator",
        fn: "Operations",
        industry: "Logistics",
        screening: [
          "Walk me through the last time you looked for a carrier.",
          "What slowed that down?",
          "What did you still do by hand?",
        ],
        qualify: "Has looked for a carrier in the last year.",
      }),
      iso(now - 12 * day)
    );

    const cancel = story(
      "req_cancel",
      Object.assign({}, shared, {
        title: "How do dispatchers handle last-minute load cancellations?",
        decision: "How do dispatchers handle last-minute load cancellations?",
        role: "Dispatcher",
        fn: "Operations",
        industry: "Logistics",
        screening: [
          "Walk me through the last load that cancelled.",
          "Who did you call first?",
          "What did you still track on a board or a sheet?",
        ],
        qualify: "Has covered a cancelled load in the last year.",
      }),
      iso(now - 4 * day)
    );

    const quotes = story(
      "req_quotes",
      Object.assign({}, shared, {
        title: "What do shippers hate about getting freight quotes?",
        decision: "What do shippers hate about getting freight quotes?",
        role: "Shipping manager",
        fn: "Operations",
        industry: "Logistics",
        screening: [
          "Walk me through the last quote you asked for.",
          "What made a quote hard to trust?",
          "What did you still compare by hand?",
        ],
        qualify: "Asks brokers for freight rates.",
      }),
      iso(now - 1 * day)
    );

    function outreach(req, personId) {
      return req.outreach.find((o) => o.personId === personId);
    }
    function markSent(req, personId, status, sentAt) {
      const o = outreach(req, personId);
      if (!o) return;
      o.status = status;
      o.sentAt = sentAt;
    }

    const tFreight = iso(now - 10 * day);
    markSent(freight, "ex_maya", "replied", tFreight);
    markSent(cancel, "ex_noah", "sent", iso(now - 2 * day));

    const invitations = [
      { id: "inv_freight_maya", example: true, requestId: "req_freight", personId: "ex_maya", status: "accepted", sentAt: tFreight, respondedAt: tFreight, complianceAt: tFreight },
      { id: "inv_cancel_maya", example: true, requestId: "req_cancel", personId: "ex_maya", status: "pending", sentAt: iso(now - 2 * day), respondedAt: null, complianceAt: null },
    ];

    function booking(partial) {
      return Object.assign(
        {
          example: true,
          recording: false,
          rating: null,
          notes: "",
          summary: "",
          minutes: 0,
          chargedUsd: price,
        },
        partial
      );
    }

    const bookings = [
      booking({
        id: "book_freight_maya",
        requestId: "req_freight",
        requestTitle: freight.title,
        personId: "ex_maya",
        inviteId: "inv_freight_maya",
        slot: iso(now - 5 * day),
        status: "completed",
        minutes: 30,
        rating: 5,
        notes: "New carriers come from a text thread and a spreadsheet. The slow part is checking who actually has a truck that week.",
        summary: "New carriers come from a text thread and a spreadsheet. The slow part is checking who actually has a truck that week.",
        createdAt: iso(now - 6 * day),
        completedAt: iso(now - 5 * day),
      }),
    ];

    [freight, cancel, quotes].forEach((req) => fillAnswers(req, people));

    const state = {
      version: 4,
      session: { role: "buyer", forceOnboarding: false },
      buyer: buyer,
      expertId: "ex_maya",
      pool: people,
      requests: [quotes, cancel, freight],
      invitations: invitations,
      bookings: bookings,
      credits: {
        balance: 6,
        ledger: [
          { at: iso(now - 20 * day), label: "Example starting balance", delta: 10 },
          { at: iso(now - 6 * day), label: "Booked · How do freight brokers find new carriers?", delta: -1 },
        ],
      },
    };
    return state;
  }

  let cached = null;

  function persist(state) {
    cached = state;
    dbWrite(JSON.stringify(state));
    return state;
  }

  function expire(state) {
    const limit = TL.CONFIG.inviteResponseHours * 3600000;
    let changed = false;
    state.invitations.forEach((inv) => {
      if (inv.status === "pending" && Date.now() - Date.parse(inv.sentAt) > limit) {
        inv.status = "expired";
        changed = true;
      }
    });
    if (changed) persist(state);
    return state;
  }

  function load() {
    if (cached) return cached;
    const raw = dbRead();
    if (!raw) return persist(seed());
    try {
      const state = JSON.parse(raw);
      if (!state || state.version !== 4 || !state.buyer || !state.pool) return persist(seed());
      cached = state;
      return expire(state);
    } catch (e) {
      return persist(seed());
    }
  }

  function person(state, id) {
    return state.pool.find((p) => p.id === id) || null;
  }
  function requestById(state, id) {
    return state.requests.find((r) => r.id === id) || null;
  }
  function self(state) {
    return person(state, state.expertId);
  }

  function validate(input) {
    if (!input || !clip(input.title, 200)) return "Add a title for the request.";
    if (!clip(input.decision, 800)) return "Add the decision this call will inform.";
    if (!clip(input.role, 200)) return "Say who you want to talk to.";
    if (!clip(input.fn, 80)) return "Pick a function.";
    if (!clip(input.industry, 80)) return "Add an industry. Fintech is the example, not the limit.";
    if (!clip(input.companyType, 200)) return "Say what kind of company they should work at.";
    if (!clip(input.years, 40)) return "Say how many years they should have been in the role.";
    const calls = Number(input.calls);
    if (!Number.isFinite(calls) || calls < 1 || calls > 10) return "Ask for between 1 and 10 calls.";
    if (!clip(input.timeline, 80)) return "Add a timeline.";
    const questions = (input.screening || []).map((s) => clip(s, 300)).filter(Boolean);
    if (!questions.length) return "Add at least one screening question.";
    if (!clip(input.calendarTo, 120)) return "Say who should get the calendar invite.";
    if (!clip(input.profilesTo, 120)) return "Say who should receive new profiles.";
    return "";
  }

  function sentToday(state, channel) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let n = 0;
    state.requests.forEach((req) => {
      req.outreach.forEach((o) => {
        if (o.channel !== channel || !o.sentAt) return;
        if (o.status !== "sent" && o.status !== "replied") return;
        if (Date.parse(o.sentAt) >= start.getTime()) n += 1;
      });
    });
    return n;
  }

  function capFor(request, channel) {
    return channel === "linkedin" ? Number(request.rules.linkedinDailyCap) : Number(request.rules.emailDailyCap);
  }

  function bookedCount(state, requestId) {
    return state.bookings.filter((b) => b.requestId === requestId && b.status !== "cancelled").length;
  }

  function applyStop(state, request) {
    if (!request.rules.stopWhenBooked) return false;
    if (bookedCount(state, request.id) < request.calls) return false;
    let changed = false;
    request.outreach.forEach((o) => {
      if (o.status === "draft") {
        o.status = "skipped";
        o.skipReason = "Stopped. The call target is already booked.";
        changed = true;
      }
      if (o.step2Status === "held") {
        o.step2Status = "cancelled";
        changed = true;
      }
    });
    if (changed) {
      request.activity.unshift({
        at: new Date().toISOString(),
        agent: "rules",
        text: "Stop-when-booked fired. Remaining drafts were skipped and step 2 was cancelled. Nothing was sent.",
      });
    }
    return changed;
  }

  function stage(state, request, personId) {
    const match = request.matches.find((m) => m.personId === personId);
    if (!match) return "none";
    if (match.excluded) return "excluded";
    const booking = state.bookings.find((b) => b.requestId === request.id && b.personId === personId && b.status !== "cancelled");
    if (booking && booking.status !== "confirmed") return "completed";
    if (booking) return "scheduled";
    const inv = state.invitations.find((i) => i.requestId === request.id && i.personId === personId);
    if (inv && inv.status === "accepted" && inv.complianceAt) return "screened";
    if (inv && inv.status === "accepted") return "replied";
    if (inv && inv.status === "declined") return "declined";
    if (inv && inv.status === "expired") return "expired";
    const out = request.outreach.find((o) => o.personId === personId);
    if (out && out.status === "replied") return "replied";
    if (out && out.status === "sent") return "contacted";
    if (out && out.status === "skipped") return "skipped";
    return "sourced";
  }

  const PIPELINE = ["sourced", "contacted", "replied", "screened", "scheduled", "completed"];

  function pipelineCounts(state, request) {
    const counts = { sourced: 0, contacted: 0, replied: 0, screened: 0, scheduled: 0, completed: 0, excluded: 0, skipped: 0, declined: 0, expired: 0 };
    request.matches.forEach((m) => {
      const s = stage(state, request, m.personId);
      if (counts[s] == null) counts[s] = 0;
      counts[s] += 1;
    });
    return counts;
  }

  function requestStatus(state, request) {
    const drafts = request.outreach.filter((o) => o.status === "draft").length;
    const booked = bookedCount(state, request.id);
    if (request.rules.stopWhenBooked && booked >= request.calls) return "Target met";
    if (drafts) return "Needs approval";
    if (booked) return "In progress";
    return "Sourcing";
  }

  function payoutAmount(booking) {
    const full = TL.CONFIG.expertPayoutUsd;
    if (!booking || booking.status === "confirmed" || booking.status === "no-show") return 0;
    if (booking.status === "compliance-ended") return full;
    if (booking.status === "completed") {
      const minutes = Math.max(0, Number(booking.minutes) || 0);
      return Math.round(full * (minutes / TL.CONFIG.callMinutes) * 100) / 100;
    }
    return 0;
  }

  function payoutInfo(booking) {
    const amount = payoutAmount(booking);
    if (!booking || booking.status === "confirmed") {
      return { amount: 0, status: "unearned", due: null, label: "Pays after the call, for the minutes completed." };
    }
    if (booking.status === "no-show" || amount === 0) {
      return { amount: 0, status: "none", due: null, label: "No payout. The call did not take place." };
    }
    const dueMs = Date.parse(booking.completedAt) + TL.CONFIG.payoutDays * 86400000;
    const paid = Date.now() >= dueMs;
    return {
      amount: amount,
      status: paid ? "paid" : "scheduled",
      due: new Date(dueMs).toISOString(),
      label: paid ? "Marked paid in the example ledger. No money moved." : "Scheduled about " + TL.CONFIG.payoutDays + " days after the call. No money moves in this demo.",
    };
  }

  function metrics(state) {
    let contacted = 0;
    let replied = 0;
    state.requests.forEach((req) => {
      req.matches.forEach((m) => {
        const s = stage(state, req, m.personId);
        if (["contacted", "replied", "screened", "scheduled", "completed"].indexOf(s) >= 0) contacted += 1;
        if (["replied", "screened", "scheduled", "completed"].indexOf(s) >= 0) replied += 1;
      });
    });
    const spend = state.bookings.reduce((sum, b) => sum + (Number(b.chargedUsd) || 0), 0);
    return {
      requests: state.requests.length,
      contacted: contacted,
      replied: replied,
      rate: contacted ? replied / contacted : null,
      booked: state.bookings.length,
      completed: state.bookings.filter((b) => b.status !== "confirmed").length,
      spend: spend,
      credits: state.credits.balance,
      creditValue: state.credits.balance * TL.CONFIG.pricePerCallUsd,
    };
  }

  function upcomingSlots(state, personId) {
    const who = person(state, personId);
    if (!who) return [];
    const taken = new Set(
      state.bookings.filter((b) => b.personId === personId && b.status !== "cancelled").map((b) => b.slot)
    );
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const wanted = new Set(who.availability || []);
    const out = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let d = 1; d <= 16 && out.length < 12; d += 1) {
      const day = new Date(start.getTime() + d * 86400000);
      const name = days[day.getDay()];
      (who.availability || []).forEach((slot) => {
        if (!wanted.has(slot)) return;
        const parts = slot.split(" ");
        if (parts[0] !== name) return;
        const hm = (parts[1] || "09:00").split(":");
        const at = new Date(day.getTime());
        at.setHours(Number(hm[0]), Number(hm[1]) || 0, 0, 0);
        if (at.getTime() < Date.now()) return;
        out.push({ iso: at.toISOString(), taken: taken.has(at.toISOString()) });
      });
    }
    return out;
  }

  function fail(error) {
    return { ok: false, error: error };
  }

  TL.store = {
    PIPELINE: PIPELINE,
    get: load,
    reset: function () {
      cached = null;
      dbClear();
      return persist(seed());
    },
    person: function (id) {
      return person(load(), id);
    },
    self: function () {
      return self(load());
    },
    request: function (id) {
      return requestById(load(), id);
    },
    stage: function (request, personId) {
      return stage(load(), request, personId);
    },
    counts: function (request) {
      return pipelineCounts(load(), request);
    },
    status: function (request) {
      return requestStatus(load(), request);
    },
    metrics: function () {
      return metrics(load());
    },
    payoutInfo: payoutInfo,
    payoutAmount: payoutAmount,
    slots: function (personId) {
      return upcomingSlots(load(), personId);
    },
    sentToday: function (channel) {
      return sentToday(load(), channel);
    },
    setRole: function (role) {
      const state = load();
      if (["buyer", "expert", "admin"].indexOf(role) < 0) return fail("Unknown role.");
      state.session.role = role;
      persist(state);
      return { ok: true };
    },
    setForceOnboarding: function (on) {
      const state = load();
      state.session.forceOnboarding = !!on;
      persist(state);
      return { ok: true };
    },
    saveBuyer: function (input) {
      const state = load();
      if (!clip(input.company, 80) || !clip(input.name, 80)) return fail("Add a company and your name. Use example details.");
      state.buyer = {
        id: state.buyer.id || "buyer_local",
        example: true,
        company: clip(input.company, 80),
        website: clip(input.website, 120),
        size: clip(input.size, 40),
        stage: clip(input.stage, 40),
        industry: clip(input.industry, 80),
        name: clip(input.name, 80),
        role: clip(input.role, 80),
        email: clip(input.email, 120),
        sells: clip(input.sells, 240),
      };
      persist(state);
      return { ok: true };
    },
    saveExpert: function (input) {
      const state = load();
      const who = self(state);
      if (!who) return fail("No practitioner profile on this browser.");
      if (!input.confidential || !input.mnpi || !input.employerOk) return fail("Accept the three compliance statements to finish onboarding.");
      const availability = (input.availability || []).filter(Boolean);
      if (!availability.length) return fail("Pick at least one time you can take a call.");
      who.name = clip(input.name, 80) || who.name;
      who.role = clip(input.role, 80) || who.role;
      if (input.years != null && input.years !== "") {
        const y = Number(input.years);
        if (Number.isFinite(y) && y >= 0 && y <= 40) who.years = y;
      }
      who.yearsLabel = clip(input.yearsLabel, 40) || who.yearsLabel;
      who.fn = clip(input.fn, 40) || who.fn;
      who.industry = clip(input.industry, 80) || who.industry;
      who.employer = clip(input.employer, 80) || who.employer;
      who.employerType = clip(input.employerType, 80) || who.employerType;
      who.geography = clip(input.geography, 40) || who.geography;
      who.bio = clip(input.bio, 400) || who.bio;
      who.wont = clip(input.wont, 240) || who.wont;
      who.topics = clip(input.topics, 200)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
      who.availability = availability;
      who.channel = input.channel === "linkedin" ? "linkedin" : "email";
      who.onboarded = true;
      who.complianceAcceptedAt = who.complianceAcceptedAt || new Date().toISOString();
      state.session.forceOnboarding = false;
      persist(state);
      return { ok: true };
    },
    createRequest: function (input) {
      const error = validate(input);
      if (error) return fail(error);
      const state = load();
      const request = blankRequest(input, state.buyer, state.pool);
      request.screening = (request.screening || []).slice(0, 3);
      fillAnswers(request, state.pool);
      attachTaker(state, request);
      state.requests.unshift(request);
      persist(state);
      return { ok: true, id: request.id };
    },
    saveAccount: function (input) {
      const state = load();
      const name = clip(input.name, 80);
      const email = clip(input.email, 120);
      if (!name || !email) return fail("Add your name and email.");
      state.buyer.name = name;
      state.buyer.email = email;
      persist(state);
      return { ok: true };
    },
    saveCallTaker: function (input) {
      const state = load();
      const name = clip(input.name, 80);
      const email = clip(input.email, 120);
      const role = clip(input.role, 80);
      const background = clip(input.background, 400);
      if (!name || !email || !role) return fail("Add your name, email, and role.");
      state.callTaker = { name: name, email: email, role: role, background: background };
      let who = state.pool.find((p) => p.id === "ct_self");
      if (!who) {
        who = {
          id: "ct_self",
          example: true,
          self: true,
          name: name,
          role: role,
          years: 2,
          yearsLabel: "2 yrs",
          fn: "Operations",
          industry: "Logistics",
          employer: "Signed up here",
          employerType: "Freight",
          companySize: "",
          former: false,
          geography: "United States",
          channel: "email",
          topics: [],
          wont: "Employer secrets.",
          bio: background || role,
          availability: ["Tue 12:00", "Thu 12:00", "Fri 09:00"],
          timezone: "America/Toronto",
          onboarded: true,
          complianceAcceptedAt: new Date().toISOString(),
        };
        state.pool.push(who);
      } else {
        who.name = name;
        who.role = role;
        who.bio = background || role;
      }
      state.expertId = "ct_self";
      state.requests.forEach((req) => attachTaker(state, req));
      persist(state);
      return { ok: true };
    },
    saveAnswers: function (requestId, personId, answers, accept) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Project not found.");
      request.answers = request.answers || {};
      const clean = (answers || []).map((s) => clip(s, 400)).slice(0, 3);
      if (accept && !clean.filter(Boolean).length) return fail("Write an answer first.");
      request.answers[personId] = clean;
      attachTaker(state, request);
      const now = new Date().toISOString();
      let inv = state.invitations.find((i) => i.requestId === requestId && i.personId === personId);
      if (!inv) {
        inv = { id: nid("inv"), example: true, requestId: requestId, personId: personId, status: "pending", sentAt: now, respondedAt: null, complianceAt: null };
        state.invitations.push(inv);
      }
      if (accept) {
        inv.status = "accepted";
        inv.respondedAt = now;
        inv.complianceAt = now;
      }
      persist(state);
      return { ok: true };
    },
    passPerson: function (requestId, personId) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Project not found.");
      request.passed = request.passed || [];
      if (request.passed.indexOf(personId) < 0) request.passed.push(personId);
      persist(state);
      return { ok: true };
    },
    scheduleCall: function (requestId, personId, slotIso) {
      const state = load();
      const request = requestById(state, requestId);
      const who = person(state, personId);
      if (!request || !who) return fail("Pick a person on this project.");
      if (!slotIso) return fail("Pick a time.");
      const existing = state.bookings.find((b) => b.requestId === requestId && b.personId === personId && b.status !== "cancelled");
      if (existing) return { ok: true, id: existing.id };
      const now = new Date().toISOString();
      const booking = {
        id: nid("book"),
        example: true,
        requestId: requestId,
        requestTitle: request.title,
        personId: personId,
        inviteId: "",
        slot: slotIso,
        status: "confirmed",
        minutes: TL.CONFIG.callMinutes,
        recording: false,
        rating: null,
        notes: "",
        summary: "",
        chargedUsd: TL.CONFIG.pricePerCallUsd,
        createdAt: now,
        completedAt: null,
      };
      state.bookings.unshift(booking);
      persist(state);
      return { ok: true, id: booking.id };
    },
    saveOutreach: function (requestId, outreachId, patch) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Request not found.");
      const item = request.outreach.find((o) => o.id === outreachId);
      if (!item || item.status !== "draft") return fail("Only a draft can be edited.");
      item.subject = clip(patch.subject, 140) || item.subject;
      item.body = clip(patch.body, 2000) || item.body;
      if (patch.channel === "email" || patch.channel === "linkedin") item.channel = patch.channel;
      request.activity.unshift({ at: new Date().toISOString(), agent: "outreach", text: "Edited a draft. It is still waiting for approval." });
      persist(state);
      return { ok: true };
    },
    skipOutreach: function (requestId, outreachId) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Request not found.");
      const item = request.outreach.find((o) => o.id === outreachId);
      if (!item || item.status !== "draft") return fail("That draft is no longer waiting.");
      item.status = "skipped";
      item.skipReason = "Skipped before send.";
      item.step2Status = "cancelled";
      request.activity.unshift({ at: new Date().toISOString(), agent: "outreach", text: "Skipped a draft. Nothing was sent." });
      persist(state);
      return { ok: true };
    },
    approveOutreach: function (requestId, outreachId) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Request not found.");
      const item = request.outreach.find((o) => o.id === outreachId);
      if (!item || item.status !== "draft") return fail("That draft is no longer waiting.");
      const match = request.matches.find((m) => m.personId === item.personId);
      if (!match || match.excluded) return fail("Rules of engagement block this person.");
      if (request.rules.stopWhenBooked && bookedCount(state, request.id) >= request.calls) {
        return fail("The call target is already booked, so sending is stopped.");
      }
      const cap = capFor(request, item.channel);
      const used = sentToday(state, item.channel);
      if (used + 1 > cap) {
        return fail("Daily " + (item.channel === "linkedin" ? "LinkedIn" : "email") + " cap is " + cap + ". " + used + " already marked sent today. Raise the cap or wait.");
      }
      const who = person(state, item.personId);
      const now = new Date().toISOString();
      item.sentAt = now;
      if (who && who.id === state.expertId) {
        item.status = "sent";
        state.invitations.unshift({
          id: nid("inv"),
          example: false,
          requestId: request.id,
          personId: who.id,
          status: "pending",
          sentAt: now,
          respondedAt: null,
          complianceAt: null,
        });
        request.activity.unshift({
          at: now,
          agent: "outreach",
          text: "Approved " + who.name + ". Marked sent inside this browser. They still have to accept. Nothing left the machine.",
        });
      } else if (match.grade === "A") {
        item.status = "replied";
        state.invitations.unshift({
          id: nid("inv"),
          example: true,
          requestId: request.id,
          personId: item.personId,
          status: "accepted",
          sentAt: now,
          respondedAt: now,
          complianceAt: now,
          simulated: true,
          reply: TL.agents.simulateReply(who, request),
        });
        request.activity.unshift({
          at: now,
          agent: "outreach",
          text: "Approved " + who.name + ". Example profile auto-replied and passed screening. Simulated. No message was sent.",
        });
      } else if (match.grade === "B") {
        item.status = "replied";
        state.invitations.unshift({
          id: nid("inv"),
          example: true,
          requestId: request.id,
          personId: item.personId,
          status: "accepted",
          sentAt: now,
          respondedAt: now,
          complianceAt: null,
          simulated: true,
          reply: TL.agents.simulateReply(who, request),
        });
        request.activity.unshift({
          at: now,
          agent: "outreach",
          text: "Approved " + who.name + ". Example profile replied and still needs a screening pass. Simulated. No message was sent.",
        });
      } else {
        item.status = "sent";
        request.activity.unshift({
          at: now,
          agent: "outreach",
          text: "Approved " + who.name + ". Marked sent. This example profile does not reply. No message was sent.",
        });
      }
      persist(state);
      return { ok: true };
    },
    screenInvite: function (inviteId) {
      const state = load();
      const inv = state.invitations.find((i) => i.id === inviteId);
      if (!inv || inv.status !== "accepted") return fail("Nothing to screen.");
      if (inv.complianceAt) return { ok: true };
      inv.complianceAt = new Date().toISOString();
      const request = requestById(state, inv.requestId);
      if (request) {
        request.activity.unshift({
          at: inv.complianceAt,
          agent: "match",
          text: "Recorded a simulated screening pass. No one was contacted.",
        });
      }
      persist(state);
      return { ok: true };
    },
    saveRules: function (requestId, rules) {
      const state = load();
      const request = requestById(state, requestId);
      if (!request) return fail("Request not found.");
      const linkedin = Number(rules.linkedinDailyCap);
      const email = Number(rules.emailDailyCap);
      if (!Number.isFinite(linkedin) || linkedin < 0 || linkedin > 200) return fail("LinkedIn cap needs to be between 0 and 200.");
      if (!Number.isFinite(email) || email < 0 || email > 500) return fail("Email cap needs to be between 0 and 500.");
      request.rules.stopWhenBooked = !!rules.stopWhenBooked;
      request.rules.linkedinDailyCap = Math.round(linkedin);
      request.rules.emailDailyCap = Math.round(email);
      request.rules.dnc = String(rules.dnc || "")
        .split(/[\n,]/)
        .map((s) => clip(s, 80))
        .filter((s) => s.length > 2)
        .slice(0, 30);
      request.matches = TL.agents.matchRequest(request, state.pool);
      const blocked = new Set(request.matches.filter((m) => m.excluded).map((m) => m.personId));
      request.outreach.forEach((o) => {
        if (o.status === "draft" && blocked.has(o.personId)) {
          o.status = "skipped";
          o.skipReason = "Moved to the do-not-contact list before send.";
          o.step2Status = "cancelled";
        }
      });
      request.activity.unshift({
        at: new Date().toISOString(),
        agent: "rules",
        text: "Updated rules of engagement and re-graded the pool. Drafts to a blocked employer were skipped.",
      });
      applyStop(state, request);
      persist(state);
      return { ok: true };
    },
    respondInvite: function (inviteId, accept, attested) {
      const state = load();
      const inv = state.invitations.find((i) => i.id === inviteId);
      if (!inv) return fail("Invitation not found.");
      if (inv.personId !== state.expertId) return fail("This invitation belongs to another example profile.");
      expire(state);
      if (inv.status === "expired") return fail("The 24-hour window has closed.");
      if (inv.status !== "pending") return fail("This invitation is already " + inv.status + ".");
      const who = self(state);
      if (!who.onboarded) return fail("Finish onboarding before accepting a call.");
      const now = new Date().toISOString();
      if (!accept) {
        inv.status = "declined";
        inv.respondedAt = now;
        const request = requestById(state, inv.requestId);
        if (request) request.activity.unshift({ at: now, agent: "outreach", text: who.name + " declined. No call was booked." });
        persist(state);
        return { ok: true };
      }
      if (!attested) return fail("Tick the compliance attestation. It is required on every call.");
      inv.status = "accepted";
      inv.respondedAt = now;
      inv.complianceAt = now;
      const request = requestById(state, inv.requestId);
      const item = request && request.outreach.find((o) => o.personId === inv.personId);
      if (item && item.status === "sent") item.status = "replied";
      if (request) {
        request.activity.unshift({
          at: now,
          agent: "outreach",
          text: who.name + " accepted and attested. Screening is done. The buyer can book a slot.",
        });
      }
      persist(state);
      return { ok: true };
    },
    addCredits: function (n) {
      const state = load();
      const add = Math.max(1, Math.min(20, Number(n) || 4));
      state.credits.balance += add;
      state.credits.ledger.unshift({
        at: new Date().toISOString(),
        label: "Example credits added (no payment)",
        delta: add,
      });
      persist(state);
      return { ok: true, balance: state.credits.balance };
    },
    book: function (inviteId, slotIso) {
      const state = load();
      const inv = state.invitations.find((i) => i.id === inviteId);
      if (!inv) return fail("Invitation not found.");
      if (inv.status !== "accepted" || !inv.complianceAt) return fail("Book after they accept and pass screening.");
      if (!slotIso) return fail("Pick a time.");
      const open = upcomingSlots(state, inv.personId).find((s) => s.iso === slotIso);
      if (!open) return fail("That time is not on their calendar.");
      if (open.taken) return fail("That time is already taken.");
      if (state.bookings.some((b) => b.inviteId === inv.id && b.status !== "cancelled")) return fail("This invitation already has a call.");
      const request = requestById(state, inv.requestId);
      if (request && request.rules.stopWhenBooked && bookedCount(state, request.id) >= request.calls) {
        return fail("This request already has its calls booked.");
      }
      if (state.credits.balance < 1) return fail("No example credits left. Add credits on this page. No payment is taken.");
      const now = new Date().toISOString();
      const booking = {
        id: nid("book"),
        example: !!(person(state, inv.personId) && person(state, inv.personId).example),
        requestId: inv.requestId,
        requestTitle: request ? request.title : "Call",
        personId: inv.personId,
        inviteId: inv.id,
        slot: slotIso,
        status: "confirmed",
        minutes: TL.CONFIG.callMinutes,
        recording: false,
        rating: null,
        notes: "",
        summary: "",
        chargedUsd: TL.CONFIG.pricePerCallUsd,
        createdAt: now,
        completedAt: null,
      };
      state.bookings.unshift(booking);
      state.credits.balance -= 1;
      state.credits.ledger.unshift({ at: now, label: "Booked · " + booking.requestTitle, delta: -1 });
      if (request) {
        request.activity.unshift({
          at: now,
          agent: "rules",
          text: "Booked a " + TL.CONFIG.callMinutes + "-minute slot. Charged 1 example credit ($" + TL.CONFIG.pricePerCallUsd + "). No payment was taken.",
        });
        applyStop(state, request);
      }
      persist(state);
      return { ok: true, id: booking.id };
    },
    completeCall: function (bookingId, payload) {
      const state = load();
      const booking = state.bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("Call not found.");
      if (booking.status !== "confirmed") return fail("This call is already logged.");
      const outcome = payload.outcome;
      if (["completed", "no-show", "compliance-ended"].indexOf(outcome) < 0) return fail("Pick how the call ended.");
      let minutes = 0;
      if (outcome !== "no-show") {
        minutes = Number(payload.minutes);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return fail("Enter the minutes completed, between 1 and 180.");
        minutes = Math.round(minutes);
      }
      const rating = payload.rating == null || payload.rating === "" ? null : Number(payload.rating);
      if (rating != null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) return fail("Rate the call from 1 to 5, or leave it blank.");
      booking.status = outcome;
      booking.minutes = minutes;
      booking.notes = clip(payload.notes, 4000);
      booking.summary = clip(payload.summary, 4000);
      booking.recording = !!(payload.recording && payload.expertOptIn);
      booking.rating = rating;
      booking.completedAt = new Date().toISOString();
      const request = requestById(state, booking.requestId);
      if (request) {
        const pay = payoutInfo(booking);
        request.activity.unshift({
          at: booking.completedAt,
          agent: "icp",
          text:
            outcome === "no-show"
              ? "Logged a no-show. Practitioner payout is $0."
              : outcome === "compliance-ended"
                ? "Logged a compliance stop at " + minutes + " min. Practitioner is paid in full ($" + TL.CONFIG.expertPayoutUsd + ")."
                : "Logged " + minutes + " completed minutes. Practitioner payout " + pay.amount + " (prorated).",
        });
      }
      persist(state);
      return { ok: true };
    },
    inviteFor: function (requestId, personId) {
      return load().invitations.find((i) => i.requestId === requestId && i.personId === personId) || null;
    },
    bookingFor: function (requestId, personId) {
      return load().bookings.find((b) => b.requestId === requestId && b.personId === personId && b.status !== "cancelled") || null;
    },
    openInvites: function () {
      const state = load();
      return state.invitations.filter((i) => i.personId === state.expertId && i.status === "pending");
    },
  };
})();
