/* Deterministic stand-ins for the AI project manager.
   No network calls and no API keys.

   LLM_HOOK: replace these three functions with model calls.
   Keep the arguments and the return shapes stable so store.js does not change.
     draftIcp(request) -> { source, text, must, nice, disqualify }
     matchRequest(request, pool) -> [{ personId, grade, score, reasons, excluded }]
     draftOutreach(request, person, buyer) -> { channel, subject, body, step2Subject, step2Body }
   draftSummary is the post-call hook and is optional. */
(function () {
  const TL = (window.TL = window.TL || {});

  const STOP = new Set("the and for with from that this into over per any who job are was how not but you your our".split(" "));
  const GENERIC_ROLE = new Set("associate analyst junior senior manager coordinator specialist lead director vp svp officer head or".split(" "));
  const GENERIC_TARGET = new Set("regional national company companies group services financial market mid small large current other north south east west".split(" "));

  function clip(s, n) {
    return String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  }

  function tokens(s) {
    return new Set(
      String(s || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
    );
  }

  function has(set, word) {
    return set.has(word);
  }

  function yearsFit(band, years) {
    if (!band || band === "Any") return true;
    if (band === "0–1 year") return years <= 1;
    if (band === "0–4 years") return years <= 4;
    if (band === "2–4 years") return years >= 2 && years <= 4;
    if (band === "5–8 years") return years >= 5 && years <= 8;
    if (band === "9+ years") return years >= 9;
    return true;
  }

  function juniorBand(band) {
    return band === "0–1 year" || band === "0–4 years" || band === "2–4 years";
  }

  function industryPoints(requested, actual) {
    const a = String(requested || "").toLowerCase();
    const b = String(actual || "").toLowerCase();
    if (!a || !b) return 0;
    if (a === b || a.includes(b) || b.includes(a)) return 16;
    const fin = ["financial", "fintech", "payment", "accounting", "bank", "credit"];
    const aFin = fin.some((k) => a.includes(k));
    const bFin = fin.some((k) => b.includes(k));
    if (aFin && bFin) return 10;
    return 0;
  }

  function typePoints(requested, person) {
    const t = String(requested || "").toLowerCase();
    if (!t) return 0;
    if (t.includes("former")) return person.former ? 10 : 0;
    if (t.includes("current") && !person.former) return 8;
    if (t.includes("different") && !person.former) return 8;
    if (t.includes("competitor") && !person.former) return 6;
    if (t.includes("customer")) return 4;
    return 0;
  }

  function geographyPoints(requested, personGeo) {
    const g = String(requested || "").toLowerCase();
    const p = String(personGeo || "").toLowerCase();
    if (!g || !p) return 0;
    if (g.includes(p)) return 4;
    const north = /united states|canada|north america|u\.s\.|usa/.test(g);
    if (north && /canada|united states|u\.s\.|usa/.test(p)) return 4;
    return 0;
  }

  function gradeFromScore(score) {
    if (score >= 78) return "A";
    if (score >= 62) return "B";
    if (score >= 46) return "C";
    return "D";
  }

  function excludedBy(person, request) {
    const names = []
      .concat(request.who.avoidCompanies || [], request.rules && request.rules.dnc || [])
      .map((s) => String(s || "").trim().toLowerCase())
      .filter((s) => s.length > 2);
    const emp = String(person.employer || "").toLowerCase();
    return names.find((name) => emp.includes(name) || name.includes(emp)) || "";
  }

  /* LLM_HOOK: draftIcp */
  function draftIcp(request) {
    const w = request.who;
    const avoid = (w.avoidCompanies || []).filter(Boolean);
    const calls = request.calls === 1 ? "1 call" : request.calls + " calls";
    const text = [
      "Find " + calls + " in the next " + request.timeline + " with a " + w.role + ".",
      "Function: " + w.fn + ". Industry: " + w.industry + ". Company: " + w.companyType + ", about " + w.companySize + ".",
      "Tenure: " + w.years + (w.geography ? ". Geography: " + w.geography + "." : "."),
      w.targetCompanies ? "Prefer people around " + w.targetCompanies + "." : "",
      avoid.length ? "Do not contact current employees of " + avoid.join(", ") + "." : "",
      w.formerWithin ? "If they have left a company, they should have left within " + w.formerWithin + "." : "",
      "The call has to inform this decision: " + request.decision,
      request.qualify ? "Qualifying bar: " + request.qualify : "",
      "Screening: " + (request.screening || []).join(" / "),
    ]
      .filter(Boolean)
      .join(" ");

    return {
      source: "template",
      text: text,
      must: [
        w.role,
        w.years + " in the role",
        "Works in " + w.industry,
        request.qualify || (request.screening && request.screening[0]) || "Can talk about the work, not the employer",
      ].filter(Boolean),
      nice: [
        w.targetCompanies ? "Close to " + w.targetCompanies : "Has done the work in the last 12 months",
        w.geography ? "Based in " + w.geography : "Time zone overlap with the buyer",
      ],
      disqualify: avoid.map((name) => "Current employee of " + name).concat([
        "Would have to discuss their own employer or a direct competitor",
        "Would have to share confidential information or MNPI",
      ]),
    };
  }

  /* LLM_HOOK: matchRequest */
  function matchRequest(request, pool) {
    return pool
      .map((person) => {
        const banned = excludedBy(person, request);
        if (banned) {
          return {
            personId: person.id,
            grade: "X",
            score: 0,
            excluded: true,
            reasons: [
              "Current employer (" + person.employer + ") is on the do-not-contact list (" + banned + ").",
              "Left out of outreach. Rules of engagement beat a good grade.",
            ],
          };
        }

        let score = 18;
        const reasons = [];
        const roleWords = [...tokens(request.who.role)].filter((w) => !GENERIC_ROLE.has(w));
        const hay = tokens(person.role + " " + (person.topics || []).join(" "));
        const hits = roleWords.filter((w) => has(hay, w));
        if (hits.length) {
          score += 24 + Math.min(8, (hits.length - 1) * 4);
          reasons.push("Role lines up on " + hits.join(", ") + ". They are a " + person.role + " (" + person.yearsLabel + ").");
        } else {
          reasons.push("Role is adjacent. They are a " + person.role + ", not a direct " + request.who.role + ".");
        }

        if (String(person.fn).toLowerCase() === String(request.who.fn).toLowerCase()) {
          score += 16;
          reasons.push("Same function (" + person.fn + ").");
        } else {
          score -= 6;
          reasons.push("Function is " + person.fn + ". The brief asked for " + request.who.fn + ".");
        }

        const ind = industryPoints(request.who.industry, person.industry);
        score += ind;
        if (ind >= 16) reasons.push("Industry matches (" + person.industry + ").");
        else if (ind > 0) reasons.push(person.industry + " sits next to " + request.who.industry + ", not on top of it.");
        else reasons.push(person.industry + " is outside " + request.who.industry + ". Fine for a horizontal comparison, weaker for this brief.");

        if (yearsFit(request.who.years, person.years)) {
          score += 14;
          reasons.push(person.yearsLabel + " in role, inside " + request.who.years + ".");
        } else if (juniorBand(request.who.years) && person.years >= 8) {
          score -= person.years >= 10 ? 24 : 8;
          reasons.push(person.yearsLabel + " in role. More senior than the 0–4 year core. Allowed, and a step removed from the daily work.");
        } else {
          reasons.push("Tenure (" + person.yearsLabel + ") sits outside " + request.who.years + ".");
        }

        const typed = typePoints(request.who.companyType, person);
        score += typed;
        if (typed) reasons.push((person.former ? "Former employee. " : "Current practitioner. ") + person.employerType + ".");

        const targetHit = tokens(request.who.targetCompanies);
        const empHit = tokens(person.employer + " " + person.employerType);
        const targetOverlap = [...targetHit].filter((w) => empHit.has(w) && w.length > 3 && !GENERIC_ROLE.has(w) && !GENERIC_TARGET.has(w) && !STOP.has(w));
        if (targetOverlap.length) {
          score += 6;
          reasons.push("Company context overlaps the target list (" + targetOverlap.join(", ") + ").");
        }

        score += geographyPoints(request.who.geography, person.geography);
        score = Math.max(0, Math.min(100, score));
        if (person.example) reasons.push("Example profile. Not a real person.");

        return {
          personId: person.id,
          grade: gradeFromScore(score),
          score: score,
          excluded: false,
          reasons: reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /* LLM_HOOK: draftOutreach */
  function draftOutreach(request, person, buyer) {
    const first = String(person.name || "there").split(" ")[0];
    const subject = "30 minutes on " + request.title;
    const body = [
      "Hi " + first + " — I'm " + buyer.name + " at " + buyer.company + ", a " + String(buyer.stage || "small").toLowerCase() + " " + String(buyer.industry || "company").toLowerCase() + " company.",
      "We need to decide: " + request.decision,
      "We're looking for a " + request.who.role + " (" + request.who.years + ") who does this work day to day. The call is 30 minutes, paid for the minutes completed, and it is not about " + person.employer + ".",
      "Please don't share confidential information, MNPI, or anything about your employer or a direct competitor. You can decline in one click, and a yes needs a reply within 24 hours.",
      "Would you be open to it?",
    ].join("\n\n");
    const step2Body = [
      "Hi " + first + " — one follow-up on “" + request.title + "”.",
      "If a 30-minute call is not a fit, ignore this. If it is, the invite stays open for 24 hours after we send it. Same rules: nothing confidential, and not about your employer.",
    ].join("\n\n");
    return {
      channel: person.channel === "linkedin" ? "linkedin" : "email",
      subject: clip(subject, 140),
      body: body,
      step2Subject: "Re: " + clip(subject, 120),
      step2Body: step2Body,
    };
  }

  function simulateReply(person, request) {
    return (
      "Happy to do 30 minutes on how this work actually runs. I won't discuss " +
      person.employer +
      ", a competitor, or anything confidential. The decision I can help with is: " +
      clip(request.decision, 180)
    );
  }

  /* LLM_HOOK: draftSummary */
  function draftSummary(notes, request) {
    const clean = clip(notes, 500);
    const heard = clean || "No notes were added.";
    const decision = request && request.decision ? request.decision : "the decision on the brief";
    const role = request && request.who ? request.who.role : "practitioner";
    return (
      "Decision this call was meant to inform: " +
      decision +
      " What we heard: " +
      heard +
      " This is one conversation. Book another " +
      role +
      " before treating it as a pattern."
    );
  }

  const SAMPLE_BRIEF = {
    title: "How do freight brokers find new carriers?",
    decision: "How do freight brokers find new carriers?",
    role: "Freight coordinator",
    fn: "Operations",
    industry: "Logistics",
    companyType: "Current practitioner at a company in the industry",
    companySize: "11–200",
    years: "0–4 years",
    geography: "United States or Canada",
    targetCompanies: "",
    avoidCompanies: [],
    formerWithin: "",
    calls: 3,
    timeline: "2 weeks",
    screening: [
      "Walk me through the last time you looked for a carrier.",
      "What slowed that down?",
      "What did you still do by hand?",
    ],
    qualify: "Has personally reconciled payroll in the last 12 months.",
    profilesTo: "Jamie L.",
    calendarTo: "Jamie L.",
    updates: "rolling",
  };

  TL.agents = {
    draftIcp: draftIcp,
    matchRequest: matchRequest,
    draftOutreach: draftOutreach,
    simulateReply: simulateReply,
    draftSummary: draftSummary,
    SAMPLE_BRIEF: SAMPLE_BRIEF,
    gradeFromScore: gradeFromScore,
  };
})();
