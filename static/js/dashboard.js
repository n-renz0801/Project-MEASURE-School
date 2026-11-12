/* Dashboard: one dedicated section each for EOPCRF 1, EOPCRF 2, SBM and AIP.
   Reads the same endpoints the report pages use (no new backend route):
     /irc/eopcrf1/data, /irc/eopcrf2/data, /sbm/data  (current year only)
   AIP is PLACEHOLDER data until its data-gathering form is fixed (see
   AIP_SAMPLE below; swap loadAip() to read /aip/data when ready).
   SBM / EOPCRF 2 form wording (indicators, competencies) is generated from
   sbm.js and eopcrf2.js so highest/lowest indicators can be named. */
(function () {
  "use strict";
  const root = document.querySelector(".db");
  if (!root) return;

  /* ── TEMPORARY: design switch (tinted | solid). Delete this block, the
     .db-design markup in dashboard.html and the .db-design CSS once the
     client has chosen. The choice is remembered in localStorage. ───────── */
  (function () {
    const buttons = root.querySelectorAll(".db-design button");
    const setDesign = (d) => {
      root.dataset.design = d;
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.design === d)),
      );
      try {
        localStorage.setItem("db-design", d);
      } catch (e) {}
    };
    let saved = null;
    try {
      saved = localStorage.getItem("db-design");
    } catch (e) {}
    setDesign(saved === "solid" ? "solid" : "tinted");
    buttons.forEach((b) =>
      b.addEventListener("click", () => setDesign(b.dataset.design)),
    );
  })();
  const YEAR = root.dataset.year;
  const URLS = {
    eopcrf1: root.dataset.urlEopcrf1,
    eopcrf2: root.dataset.urlEopcrf2,
    sbm: root.dataset.urlSbm,
    aip: root.dataset.urlAip,
  };
  const STRUCT = {
    SBM: [
      {
        name: "Curriculum and Teaching",
        short: "Curriculum",
        items: [
          {
            n: 1,
            text: "Grade 3 learners achieve the proficiency level for each cluster of early language, literacy, and numeracy skills",
          },
          {
            n: 2,
            text: "Grade 6,10, and 12 learners achieve the proficiency level in all 21st-century skills and core learning areas in the National Achievement Test (NAT)",
          },
          {
            n: 3,
            text: "School-based ALS learners attain certification as elementary and junior high school completers",
          },
          {
            n: 4,
            text: "Teachers prepare contextualized learning materials responsive to the needs of learners",
          },
          {
            n: 5,
            text: "Teachers conduct remediation activities to address learning gaps in reading and comprehension, science and technology, and mathematics",
          },
          {
            n: 6,
            text: "Teachers integrate topics promoting peace and DepEd core values",
          },
          {
            n: 7,
            text: "The school conducts test item analysis to inform its teaching and learning process",
          },
          {
            n: 8,
            text: "The school engages local industries to strengthen its TLE-TVL course offerings",
          },
        ],
      },
      {
        name: "Learning Environment",
        short: "Learning",
        items: [
          { n: 9, text: "The school has zero bullying incidence" },
          { n: 10, text: "The school has zero child abuse incidence" },
          { n: 11, text: "The school has reduced its drop-out incidence" },
          { n: 12, text: "The school conducts culture-sensitive activities" },
          {
            n: 13,
            text: "The school provides access to learning experiences for the disadvantaged, OSYs, and adult learners",
          },
          {
            n: 14,
            text: "The school has a functional school-based ALS program",
          },
          {
            n: 15,
            text: "The school has a functional child-protection committee",
          },
          { n: 16, text: "The school has a functional DRRM plan" },
          {
            n: 17,
            text: "The school has a functional support mechanism for mental wellness",
          },
          {
            n: 18,
            text: "The school has special education- and PWD-friendly facilities",
          },
        ],
      },
      {
        name: "Leadership",
        short: "Leadership",
        items: [
          { n: 19, text: "The school develops a strategic plan" },
          {
            n: 20,
            text: "The school has a functional school-community planning team",
          },
          {
            n: 21,
            text: "The school has a functional Supreme Student Government/Supreme Pupil Government",
          },
          {
            n: 22,
            text: "The school innovates in its provision of frontline services to stakeholders",
          },
        ],
      },
      {
        name: "Governance and Accountability",
        short: "Governance",
        items: [
          {
            n: 23,
            text: "The school’s strategic plan is operationalized an implementation plan",
          },
          {
            n: 24,
            text: "The school has a functional School Governance Council (SGC)",
          },
          {
            n: 25,
            text: "The school has a functional Parent-Teacher Association (PTA)",
          },
          {
            n: 26,
            text: "The school collaborates with stakeholders and other schools in strengthening partnerships",
          },
          {
            n: 27,
            text: "The school monitors and evaluates its programs, projects, and activities",
          },
          {
            n: 28,
            text: "The school maintains an average rating of satisfactory from its internal and external stakeholders",
          },
        ],
      },
      {
        name: "Human Resource and Team Development",
        short: "HR",
        items: [
          {
            n: 29,
            text: "School personnel achieve an average rating of very satisfactory in the individual performance commitment and review",
          },
          {
            n: 30,
            text: "The school achieves an average rating of very satisfactory in the office performance commitment and review",
          },
          {
            n: 31,
            text: "The school conducts needs-based Learning Action Cells and Learning & Development activities",
          },
          {
            n: 32,
            text: "The school facilitates the promotion and continuous professional development of its personnel",
          },
          {
            n: 33,
            text: "The school recognizes and rewards milestone achievements of its personnel",
          },
          {
            n: 34,
            text: "The school facilitates receipt of correct salaries, allowances, and other additional compensation in a timely manner",
          },
          {
            n: 35,
            text: "Teacher workload is distributed fairly and equitably",
          },
        ],
      },
      {
        name: "Finance and Resource Management and Mobilization",
        short: "Finance",
        items: [
          {
            n: 36,
            text: "The school inspects its infrastructure and facilities",
          },
          {
            n: 37,
            text: "The school initiates improvement of its infrastructure and facilities",
          },
          { n: 38, text: "The school has a functional library" },
          {
            n: 39,
            text: "The school has functional water, electric, and internet facilities",
          },
          {
            n: 40,
            text: "The school has a functional computer laboratory/classroom",
          },
          {
            n: 41,
            text: "The school achieves a 75-100% utilization rate of its Maintenance and Other Operating Expenses (MOOE)",
          },
          { n: 42, text: "The school liquidates 100% of its utilized MOOE" },
        ],
      },
    ],
    E2: [
      {
        key: "leadership",
        title: "Part II-A",
        subs: [
          {
            key: "leading_people",
            title: "Leading People",
            criteria: [
              "Uses basic persuasion techniques in a discussion or presentation e.g., staff mobilization, appeals to reason and/or emotions, uses data and examples, visual aids.",
              "Persuades, convinces or influences others, in order to have a specific impact or effect.",
              '"Sets a good example", is a credible and respected leader; and demonstrates desired behavior.',
              "Forwards personal, professional and work unit needs and interests in an issue.",
              "Assumes a pivotal role in promoting the development of an inspiring, relevant vision for the organization and influences others to share ownership of DepEd goals, in order to create an effective work environment.",
            ],
          },
          {
            key: "people_performance_management",
            title: "People Performance Management",
            criteria: [
              "Makes specific changes in the performance management system or in own work methods to improve performance (e.g. does something better, faster, at lower cost, more efficiently; improves quality, customer satisfaction, morale, revenues).",
              "Sets performance standards and measures progress of employees based on office and department targets.",
              "Provides feedback and technical assistance such as coaching for performance improvement and action planning.",
              "States performance expectations clearly and checks understanding and commitment.",
              "Performs all the stages of result-based performance management system supported by evidence and required documents/forms.",
            ],
          },
          {
            key: "people_development",
            title: "People Development",
            criteria: [
              "Improves the skills and effectiveness of individuals through employing a range of development strategies.",
              "Facilitates workforce effectiveness through coaching and motivating/developing people within a work environment that promotes mutual trust and respect.",
              "Conceptualizes and implements learning interventions to meet identified training needs.",
              "Does long-term coaching or training by arranging appropriate and helpful assignments, formal training, or other experiences for the purpose of supporting a person's learning and development.",
              "Cultivates a learning environment by structuring interactive experiences such as looking for future opportunities that are in support of achieving individual career goals.",
            ],
          },
        ],
      },
      {
        key: "cbc",
        title: "Part II-B",
        subs: [
          {
            key: "self_management",
            title: "Self-Management",
            criteria: [
              "Sets personal goals and direction, needs and development.",
              "Understands personal actions and behavior that are clear and purposive and takes into account personal goals and values congruent to that of the organization.",
              "Displays emotional maturity and enthusiasm for and is challenged by higher goals.",
              "Prioritize work tasks and schedules (through Gantt charts, checklists, etc.) to achieve goals.",
              "Sets high quality, challenging, realistic goals for self and others.",
            ],
          },
          {
            key: "professionalism_ethics",
            title: "Professionalism and Ethics",
            criteria: [
              "Demonstrate the values and behavior enshrined in the Norms of Conduct and Ethical Standards for Public Officials and Employees (RA 6713).",
              "Practice ethical and professional behavior and conduct taking into account the impact of his/her actions and decisions.",
              "Maintains a professional image: being trustworthy, regularity of attendance and punctuality, good grooming and communication.",
              "Makes personal sacrifices to meet the organization's needs.",
              "Act with a sense of urgency and responsibility to meet the organization's needs, improve system and help others improve their effectiveness.",
            ],
          },
          {
            key: "results_focus",
            title: "Results Focus",
            criteria: [
              "Achieves results with optimal use of time and resources most of the time.",
              "Avoids rework, mistakes and wastage through effective work methods by placing organizational needs before personal needs.",
              "Delivers error-free outputs most of the time by conforming to standard operating procedures correctly and consistently. Able to produce very satisfactory quality of work in terms of usefulness/acceptability and completeness with no supervision required.",
              "Expresses a desire to do better and may express frustration at waste or inefficiency. May focus on new or more precise ways of meeting goals set.",
              "Makes specific changes in the system or in own work methods to improve performance. Examples may include doing something better, faster, at a lower cost, more efficiently, or improving quality, customer satisfaction, morale, without setting any specific goal.",
            ],
          },
          {
            key: "teamwork",
            title: "Teamwork",
            criteria: [
              "Willingly does his/her share of responsibility.",
              "Promotes collaboration and removes barriers to teamwork and goal accomplishment across the organization.",
              "Applies negotiation principles in arriving at win-win agreements.",
              "Drives consensus and team ownership of decisions.",
              "Works constructively and collaboratively with others and across organizations to accomplish organizational goals and objectives.",
            ],
          },
          {
            key: "service_orientation",
            title: "Service Orientation",
            criteria: [
              "Can explain and articulate organizational directions, issues and problems.",
              "Takes personal responsibility for dealing with and/or correcting customer service issues and concerns.",
              "Initiates activities that promotes advocacy for men and women empowerment.",
              "Participates in updating office vision, mission, mandates and strategies based on DepEd strategies and directions.",
              "Develops and adopts service improvement program through simplified procedures that will further enhance service delivery.",
            ],
          },
          {
            key: "innovation",
            title: "Innovation",
            criteria: [
              "Examines the root cause of problems and suggests effective solutions. Foster new ideas, processes, and suggests better ways to do things (cost and/or operational efficiency).",
              'Demonstrates an ability to think "beyond the box". Continuously focuses on improving personal productivity to create higher value and results.',
              "Promotes a creative climate and inspires co-workers to develop original ideas or solutions.",
              "Translates creative thinking into tangible changes and solutions that improve the work unit and organization.",
              "Uses ingenious methods to accomplish responsibilities. Demonstrates resourcefulness and the ability to succeed with minimal resources.",
            ],
          },
        ],
      },
    ],
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const mean = (a) => {
    const v = a.filter((x) => x != null && !isNaN(x));
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const f1 = (n) => (n == null ? "–" : n.toFixed(1));
  const f2 = (n) => (n == null ? "–" : n.toFixed(2));
  const clip = (s, n) => (
    (s = String(s || "").trim()),
    s.length > n ? s.slice(0, n - 1) + "…" : s
  );
  const noParen = (s) => String(s || "").replace(/\s*\(.*\)\s*$/, "");
  const getJson = (url) =>
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");

  function extremes(items) {
    if (!items.length) return null;
    let hi = items[0],
      lo = items[0];
    items.forEach((x) => {
      if (x.v > hi.v) hi = x;
      if (x.v < lo.v) lo = x;
    });
    return { hi, lo, same: hi.v === lo.v };
  }
  const msg = (text, href, link) =>
    `<p class="db-msg">${esc(text)} ${href ? `<a href="${esc(href)}">${esc(link)}</a>` : ""}</p>`;

  function barRow(label, v, max, color, tip, valText) {
    return `<div class="db-row"${tip ? ` data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(label + ": " + valText + ". " + tip)}"` : ""}>
      <span title="${esc(label)}">${esc(label)}</span>
      <span class="db-trk"><span class="db-fill" style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%;background:${color}"></span></span>
      <span>${esc(valText)}</span></div>`;
  }
  function rangeRow(label, lo, hi, scaleMin, scaleMax) {
    const p = (v) => ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
    const dots =
      lo === hi
        ? `<i class="hi" style="left:${p(hi)}%"></i>`
        : `<b style="left:${p(lo)}%;width:${p(hi) - p(lo)}%"></b><i style="left:${p(lo)}%"></i><i class="hi" style="left:${p(hi)}%"></i>`;
    return `<div class="db-row db-row--range"><span title="${esc(label)}">${esc(label)}</span>
      <span class="db-line">${dots}</span>
      <span>${lo === hi ? f1(lo) : f1(lo) + " to " + f1(hi)}</span></div>`;
  }
  function kv(rows) {
    return `<dl class="db-kv">${rows
      .map(
        ([k, name, val]) =>
          `<div><dt>${esc(k)}</dt><dd>${esc(name)}${val != null ? `<em>${esc(val)}</em>` : ""}</dd></div>`,
      )
      .join("")}</dl>`;
  }
  function donut(segs, big, small, label) {
    const R = 44,
      C = 2 * Math.PI * R;
    const total = segs.reduce((s, x) => s + x.v, 0);
    let off = 0;
    const rings = segs
      .filter((s) => s.v > 0)
      .map((s) => {
        const len = (s.v / total) * C,
          dash = Math.max(len - 2, 0.5);
        const el = `<circle cx="64" cy="64" r="${R}" fill="none" stroke-width="16" style="stroke:${s.color}" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-off}" transform="rotate(-90 64 64)"/>`;
        off += len;
        return el;
      })
      .join("");
    return `<svg viewBox="0 0 128 128" role="img" aria-label="${esc(label)}">
      <circle cx="64" cy="64" r="${R}" fill="none" stroke-width="16" style="stroke:var(--off-white)"/>${rings}
      <text x="64" y="64" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--navy-deep)">${esc(big)}</text>
      <text x="64" y="82" text-anchor="middle" style="font-size:10px;fill:var(--text-light)">${esc(small)}</text></svg>`;
  }
  const key = (items) =>
    `<div class="db-key">${items.map(([c, t]) => `<span><i style="background:${c}"></i>${esc(t)}</span>`).join("")}</div>`;

  /* ── section shell: tinted header band (icon, title, pills, headline, link) + body ── */
  function shell(sec, o) {
    const open = sec.dataset.open === "1";
    sec.innerHTML = `
      <div class="db-sec__head">
        <h2 class="db-sec__title"><button type="button" class="db-tog" aria-expanded="${open}" aria-controls="${sec.id}-body">
          <span class="db-ico"><i class="ti ${o.icon}" aria-hidden="true"></i></span>
          <span class="db-sec__text"><span class="db-sec__name">${esc(o.title)}</span><span class="db-sec__sub">${esc(o.sub)}</span></span>
        </button></h2>
        <div class="db-sec__right"><div class="db-val" id="${sec.id}-val"></div>
          <a class="db-open" href="${esc(o.href)}">Open report <i class="ti ti-arrow-right" aria-hidden="true"></i></a>
          <button type="button" class="db-chev" aria-expanded="${open}" aria-controls="${sec.id}-body" aria-label="Toggle ${esc(o.title)} section"><i class="ti ti-chevron-down" aria-hidden="true"></i></button></div>
      </div>
      <div class="db-body" id="${sec.id}-body" ${open ? "" : "hidden"}></div>`;
    const btn = sec.querySelector(".db-tog");
    const toggle = () =>
      setOpen(sec, btn.getAttribute("aria-expanded") !== "true");
    btn.addEventListener("click", toggle);
    sec.querySelector(".db-chev").addEventListener("click", toggle);
    /* Clicking anywhere else on the header toggles too (the buttons and the
       Open report link keep their own behavior). */
    sec.querySelector(".db-sec__head").addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      toggle();
    });
    return {
      body: sec.querySelector(".db-body"),
      val: sec.querySelector(".db-val"),
    };
  }
  /* Smooth, subtle expand/collapse: height + padding + a light fade. A quick
     second click reverses from wherever the animation had got to. Falls back
     to an instant toggle with reduced motion. */
  function setOpen(sec, on) {
    const body = sec.querySelector(".db-body");
    sec.querySelector(".db-tog").setAttribute("aria-expanded", String(on));
    sec.querySelector(".db-chev").setAttribute("aria-expanded", String(on));
    if (
      !body.animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      body.hidden = !on;
      return;
    }
    if (on === !body.hidden && !body._anim) return;
    const h0 = body.hidden ? 0 : body.getBoundingClientRect().height;
    const o0 = body.hidden ? 0 : parseFloat(getComputedStyle(body).opacity);
    if (body._anim) body._anim.cancel();
    body.hidden = false;
    const cs = getComputedStyle(body);
    const full = body.offsetHeight;
    const pt = parseFloat(cs.paddingTop);
    const pb = parseFloat(cs.paddingBottom);
    const shape = (h, o) => {
      const f = full ? h / full : 0;
      return {
        height: h + "px",
        opacity: o,
        paddingTop: pt * f + "px",
        paddingBottom: pb * f + "px",
      };
    };
    body.style.overflow = "hidden";
    const anim = body.animate(
      on
        ? [shape(h0, o0), shape(full, 1)]
        : [shape(h0 || full, h0 ? o0 : 1), shape(0, 0)],
      {
        duration: on ? 280 : 220,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    body._anim = anim;
    anim.onfinish = () => {
      body._anim = null;
      if (!on) body.hidden = true;
      anim.cancel();
      body.style.overflow = "";
    };
  }
  const setVal = (el, v, small) =>
    (el.innerHTML = `${v}<small>${esc(small)}</small>`);

  /* ── EOPCRF 1 (Part I-A, I-B, I-C) ───────────────────────────────────── */
  const PARTS = [
    {
      k: "a",
      pill: "I-A",
      icon: "ti-flag",
      name: "Commitment to Organizational Outcomes",
    },
    {
      k: "b",
      pill: "I-B",
      icon: "ti-bulb",
      name: "Innovating and Intervening Accomplishments",
    },
    {
      k: "c",
      pill: "I-C",
      icon: "ti-building",
      name: "Organizational Effectiveness",
    },
  ];
  /* Same numbering as the EOPCRF 1 page: the "1.5" at the start of an
     objective's text, else KRA position in its part + objective position. */
  function splitObjectiveText(text, fallbackCode) {
    const m = /^\s*(\d+\.\d+)\.?\s+([\s\S]*)$/.exec(text || "");
    return m
      ? { code: m[1], title: m[2] }
      : { code: fallbackCode, title: text || "" };
  }
  /* pos = 0-based position of the KRA within its part (from .map). */
  function kraStats(kra, pos) {
    const objs = (kra.objectives || [])
      .map((o, i) => {
        const { code, title } = splitObjectiveText(
          o.text,
          `${pos + 1}.${i + 1}`,
        );
        return { code, text: title, v: o.average };
      })
      .filter((o) => o.v != null);
    const cat = (c) =>
      mean((kra.objectives || []).map((o) => o.ratings && o.ratings[c]));
    const q = cat("quality"),
      e = cat("efficiency"),
      t = cat("timeliness");
    return { name: noParen(kra.text), q, e, t, v: mean([q, e, t]), objs };
  }
  /* Rating bands (same cut-offs as the report). b drives the shade in CSS. */
  const BANDS = [
    { b: 5, min: 4.5, label: "Outstanding" },
    { b: 4, min: 3.5, label: "Very satisfactory" },
    { b: 3, min: 2.5, label: "Satisfactory" },
    { b: 2, min: 1.5, label: "Unsatisfactory" },
    { b: 1, min: -Infinity, label: "Poor" },
  ];
  const bandOf = (v) => BANDS.find((x) => v >= x.min);
  const qetBar = (letter, name, v) =>
    v == null
      ? `<div class="db-q db-q--na" title="${name}: not rated"><span class="db-q__l">${letter}</span><span class="db-trk"></span><b>–</b></div>`
      : `<div class="db-q" data-b="${bandOf(v).b}" title="${name} ${f1(v)} of 5"><span class="db-q__l">${letter}</span><span class="db-trk"><span class="db-q__f" style="width:${Math.max(0, Math.min(100, (v / 5) * 100))}%"></span></span><b>${f1(v)}</b></div>`;
  const objRow = (kind, o) => {
    const icon =
      kind === "lo" ? "arrow-down" : kind === "only" ? "minus" : "arrow-up";
    const lab =
      kind === "hi" ? "Highest" : kind === "lo" ? "Lowest" : "Objective";
    return `<div class="db-obj db-obj--${kind === "lo" ? "lo" : "hi"}"><span class="db-obj__ico"><i class="ti ti-${icon}" aria-hidden="true"></i></span><span class="db-obj__k">${lab}</span><span class="db-obj__t" title="${esc(o.text)}"><b>${esc(o.code)}</b>${esc(o.text)}</span><em>${f1(o.v)}</em></div>`;
  };
  const objBlock = (s) => {
    if (!s.objs.length)
      return `<div class="db-objs db-objs--none"><p class="db-obj__none">No objectives rated yet</p></div>`;
    const e = extremes(s.objs);
    if (e.same)
      return `<div class="db-objs${s.objs.length === 1 ? "" : " db-objs--none"}">${
        s.objs.length === 1
          ? objRow("only", e.hi)
          : `<p class="db-obj__none">All ${s.objs.length} objectives rated ${f1(e.hi.v)}</p>`
      }</div>`;
    return `<div class="db-objs">${objRow("hi", e.hi)}${objRow("lo", e.lo)}</div>`;
  };
  function renderE1(sec, data) {
    const kras = (data && data.kras) || [];
    const byPart = {};
    PARTS.forEach(
      (p) => (byPart[p.k] = kras.filter((k) => k.part === p.k).map(kraStats)),
    );
    const ratedOf = (k) => byPart[k].filter((s) => s.v != null);
    const partAvg = (k) => mean(ratedOf(k).map((s) => s.v));
    const countText = (k) => {
      const n = ratedOf(k).length;
      return n ? `${n} KRA${n === 1 ? "" : "s"}` : "No ratings yet";
    };
    let cur = "a";
    const { body, val } = shell(sec, {
      title: "EOPCRF 1",
      sub: "Key Result Areas and objectives, Part I",
      icon: "ti-clipboard-check",
      href: URLS.eopcrf1,
    });
    body.innerHTML = `<div class="db-parts" role="group" aria-label="EOPCRF 1 part">${PARTS.map(
      (p) =>
        `<button type="button" class="db-part" data-part="${p.k}" aria-pressed="${p.k === cur}"><span class="db-part__ico"><i class="ti ${p.icon}" aria-hidden="true"></i></span><span class="db-part__l"><b>Part ${p.pill}</b><span title="${esc(p.name)}">${esc(p.name)}</span></span><span class="db-part__r"><em>${f2(partAvg(p.k))}</em><small>${countText(p.k)}</small></span></button>`,
    ).join("")}</div>
      <div class="db-part-body"></div>`;
    const inner = body.querySelector(".db-part-body");
    function render() {
      const part = PARTS.find((p) => p.k === cur);
      const rated = ratedOf(cur);
      body
        .querySelectorAll(".db-part")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.part === cur)),
        );
      setVal(val, f2(partAvg(cur)), "Part " + part.pill + " average");
      if (!rated.length) {
        inner.innerHTML = msg(
          "No ratings yet for Part " + part.pill + ".",
          URLS.eopcrf1,
          "Rate objectives",
        );
        return;
      }
      /* One row per KRA in the same order as the EOPCRF 1 page. Highest/lowest
         KRA are marked on their rows (only when the averages differ). */
      const ex = extremes(rated.map((s, i) => ({ v: s.v, n: i })));
      const hiIdx = ex && !ex.same ? ex.hi.n : -1;
      const loIdx = ex && !ex.same ? ex.lo.n : -1;
      const ranked = rated.map((s, i) => ({ s, i }));
      const badge = (i) =>
        i === hiIdx
          ? `<span class="db-badge db-badge--hi"><i class="ti ti-trophy" aria-hidden="true"></i>Highest KRA</span>`
          : i === loIdx
            ? `<span class="db-badge db-badge--lo"><i class="ti ti-trending-down" aria-hidden="true"></i>Lowest KRA</span>`
            : "";
      inner.innerHTML = `<div class="db-kras">
        <div class="db-kras__head" aria-hidden="true"><span>#</span><span>Key Result Area</span><span>Highest and lowest objective</span><span>Quality · Efficiency · Timeliness</span><span>Average</span></div>${ranked
          .map(({ s, i }, r) => {
            const band = bandOf(s.v);
            return `
        <article class="db-kra${i === hiIdx ? " db-kra--hi" : i === loIdx ? " db-kra--lo" : ""}" aria-label="${esc(s.name)}">
          <span class="db-rank" title="KRA ${r + 1} of ${ranked.length}">${r + 1}</span>
          <div class="db-kra__id"><h4>${esc(s.name)}</h4>${badge(i)}</div>
          ${objBlock(s)}
          <div class="db-qet" role="group" aria-label="Quality ${f1(s.q)}, Efficiency ${f1(s.e)}, Timeliness ${f1(s.t)}">${qetBar("Q", "Quality", s.q)}${qetBar("E", "Efficiency", s.e)}${qetBar("T", "Timeliness", s.t)}</div>
          <div class="db-chip" data-b="${band.b}" title="Q.E.T. average"><b>${f2(s.v)}</b><span>${band.label}</span></div>
        </article>`;
          })
          .join("")}</div>`;
    }
    /* Switching parts: glide the list's height from the old size to the new
       one (with a light fade) instead of jumping. The first draw, a collapsed
       section and reduced motion skip it. */
    let first = true;
    function draw() {
      const animate =
        !first &&
        !body.hidden &&
        !body._anim &&
        !!inner.animate &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const h0 = animate ? inner.offsetHeight : 0;
      if (inner._anim) {
        inner._anim.cancel();
        inner._anim = null;
        inner.style.overflow = "";
      }
      render();
      first = false;
      if (!animate) return;
      const h1 = inner.offsetHeight;
      if (Math.abs(h1 - h0) < 2) return;
      inner.style.overflow = "hidden";
      const a = inner.animate(
        [
          { height: h0 + "px", opacity: 0.5 },
          { height: h1 + "px", opacity: 1 },
        ],
        { duration: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
      inner._anim = a;
      a.onfinish = () => {
        inner._anim = null;
        inner.style.overflow = "";
      };
    }
    body.querySelectorAll(".db-part").forEach((b) =>
      b.addEventListener("click", () => {
        cur = b.dataset.part;
        draw();
      }),
    );
    draw();
  }

  /* ── EOPCRF 2 (competencies) ─────────────────────────────────────────── */
  function renderE2(sec, data) {
    const ratings = (data && data.ratings) || {};
    const subs = [];
    STRUCT.E2.forEach((section) =>
      section.subs.forEach((s) => {
        const items = s.criteria
          .map((t, i) => ({
            v: ratings[s.key] && ratings[s.key][String(i)],
            n: i + 1,
            t,
          }))
          .filter((x) => x.v != null);
        subs.push({
          part: section.title,
          title: s.title,
          items,
          v: mean(items.map((x) => x.v)),
        });
      }),
    );
    const rated = subs.filter((s) => s.v != null);
    const { body, val } = shell(sec, {
      title: "EOPCRF 2",
      sub: "Leadership and Core Behavioural Competencies",
      icon: "ti-award",
      href: URLS.eopcrf2,
    });
    setVal(val, f2(mean(rated.map((s) => s.v))), "average rating");
    if (!rated.length) {
      body.innerHTML = msg(
        "No competency ratings yet.",
        URLS.eopcrf2,
        "Rate competencies",
      );
      return;
    }
    const ex = extremes(rated.map((s) => ({ v: s.v, n: s.title })));
    const rows = [];
    let lastPart = "";
    rated.forEach((s) => {
      if (s.part !== lastPart) {
        rows.push(
          `<p class="db-grp">${s.part === "Part II-A" ? "Part II-A, Leadership" : "Part II-B, Core Behavioural"}</p>`,
        );
        lastPart = s.part;
      }
      rows.push(barRow(s.title, s.v, 5, "var(--c)", "", f1(s.v)));
    });
    const details = rated
      .map((s) => {
        const e = extremes(s.items);
        const line = (lab, x) =>
          `<b>${lab}</b> Indicator ${x.n} (${x.v}): ${esc(clip(x.t, 120))}`;
        return `<div class="db-det__item"><h4>${esc(s.title)}</h4><p>${e.same ? `All rated indicators at ${e.hi.v}` : line("Highest", e.hi) + "<br>" + line("Lowest", e.lo)}</p></div>`;
      })
      .join("");
    body.innerHTML = `
      <div class="db-grid">
        <div class="db-col"><h3>Average rating per competency</h3>${rows.join("")}</div>
        <div class="db-col"><h3>Highest and lowest competency</h3>
          ${
            ex.same
              ? kv([["Only rated", ex.hi.n, f1(ex.hi.v)]])
              : kv([
                  ["Highest", ex.hi.n, f1(ex.hi.v)],
                  ["Lowest", ex.lo.n, f1(ex.lo.v)],
                ])
          }</div>
        <div class="db-col"><h3>Indicator range per competency</h3>
          ${rated.map((s) => rangeRow(s.title, Math.min(...s.items.map((x) => x.v)), Math.max(...s.items.map((x) => x.v)), 1, 5)).join("")}
          <p class="db-note">Lowest to highest indicator, scale 1 to 5.</p></div>
      </div>
      <details class="db-det"><summary>Highest and lowest indicator per competency</summary><div class="db-det__list">${details}</div></details>`;
  }

  /* ── SBM ─────────────────────────────────────────────────────────────── */
  const DEG = [
    { k: "not_yet", label: "Not yet", cls: "db-d1", score: 1 },
    { k: "rarely", label: "Rarely", cls: "db-d2", score: 2 },
    { k: "frequently", label: "Frequently", cls: "db-d3", score: 3 },
    { k: "always", label: "Always", cls: "db-d4", score: 4 },
  ];
  // Descriptive scale (assumption: standard four equal bands; edit if your office uses another).
  const levelOf = (v) =>
    v == null
      ? "–"
      : v <= 1.75
        ? "Not yet"
        : v <= 2.5
          ? "Rarely"
          : v <= 3.25
            ? "Frequently"
            : "Always";
  function renderSbm(sec, data) {
    const resp = (data && data.responses) || {};
    const pr = STRUCT.SBM.map((d) => {
      const counts = { not_yet: 0, rarely: 0, frequently: 0, always: 0 };
      const items = [];
      d.items.forEach((it) => {
        const r = resp[String(it.n)],
          deg = r && r.degree;
        const def = DEG.find((x) => x.k === deg);
        if (def) {
          counts[deg]++;
          items.push({ v: def.score, n: it.n, t: it.text, lab: def.label });
        }
      });
      return {
        name: d.name,
        short: d.short,
        counts,
        items,
        answered: items.length,
        total: d.items.length,
        v: mean(items.map((x) => x.v)),
      };
    });
    const rated = pr.filter((p) => p.v != null);
    const overall = mean(rated.map((p) => p.v));
    const { body, val } = shell(sec, {
      title: "SBM",
      sub: "Degree of manifestation across all principles",
      icon: "ti-building-community",
      href: URLS.sbm,
    });
    setVal(
      val,
      overall == null ? "–" : levelOf(overall),
      overall == null ? "" : f2(overall) + " of 4",
    );
    if (!rated.length) {
      body.innerHTML = msg(
        "No SBM responses yet.",
        URLS.sbm,
        "Open the checklist",
      );
      return;
    }
    const ex = extremes(rated.map((p) => ({ v: p.v, n: p.name })));
    const tot = DEG.map((d) => ({
      ...d,
      n: pr.reduce((s, p) => s + p.counts[d.k], 0),
    }));
    const answered = tot.reduce((s, d) => s + d.n, 0),
      all = pr.reduce((s, p) => s + p.total, 0);
    const details = rated
      .map((p) => {
        const e = extremes(p.items);
        const line = (lab, x) =>
          `<b>${lab}</b> #${x.n} (${esc(x.lab)}): ${esc(clip(x.t, 120))}`;
        return `<div class="db-det__item"><h4>${esc(p.name)}</h4><p>${e.same ? `All answered indicators are ${esc(e.hi.lab)}` : line("Highest", e.hi) + "<br>" + line("Lowest", e.lo)}</p></div>`;
      })
      .join("");
    body.innerHTML = `
      <div class="db-grid">
        <div class="db-col"><h3>Average score per principle</h3>
          ${rated.map((p) => barRow(p.short, p.v, 4, "var(--c)", p.name, f1(p.v))).join("")}
          <div class="db-sp"></div>
          ${
            ex.same
              ? kv([["Only rated", ex.hi.n, f1(ex.hi.v)]])
              : kv([
                  ["Highest", ex.hi.n, f1(ex.hi.v)],
                  ["Lowest", ex.lo.n, f1(ex.lo.v)],
                ])
          }</div>
        <div class="db-col"><h3>Responses per principle</h3>
          ${pr
            .map(
              (
                p,
              ) => `<div class="db-row" data-tip="${esc(p.answered + " of " + p.total + " answered")}"><span title="${esc(p.name)}">${esc(p.short)}</span>
            <span class="db-stack">${DEG.map((d) => (p.counts[d.k] ? `<span class="${d.cls}" style="flex:${p.counts[d.k]}">${p.counts[d.k]}</span>` : "")).join("")}</span>
            <span>${p.answered}/${p.total}</span></div>`,
            )
            .join("")}
          ${key(DEG.map((d) => [`var(--${d.cls.slice(3)})`, d.label]))}</div>
        <div class="db-col"><h3>Total across all principles</h3>
          <div class="db-donut">${donut(
            tot.map((d) => ({ v: d.n, color: `var(--${d.cls.slice(3)})` })),
            answered + "/" + all,
            "answered",
            "Total responses by degree of manifestation",
          )}
            <dl class="db-kv db-kv--tight">${tot.map((d) => `<div><dt><i class="db-sw" style="background:var(--${d.cls.slice(3)})"></i>${d.label}</dt><dd>${d.n}</dd></div>`).join("")}</dl></div></div>
      </div>
      <details class="db-det"><summary>Highest and lowest indicator per principle</summary><div class="db-det__list">${details}</div></details>`;
  }

  /* ── AIP (PLACEHOLDER DATA) ──────────────────────────────────────────── */
  // TODO: replace with real figures once the AIP form collects budget and
  // gain/gap in a structured way. Same shape: total, gain, gap, allotted, utilized.
  const AIP_SAMPLE = {
    total: 12,
    gain: 9,
    gap: 3,
    allotted: 2000000,
    utilized: 1560000,
  };
  function renderAip(sec) {
    const a = AIP_SAMPLE;
    const gp = (a.gain / a.total) * 100,
      pp = (a.gap / a.total) * 100,
      up = (a.utilized / a.allotted) * 100;
    const { body, val } = shell(sec, {
      title: "AIP",
      sub: "Programs, projects and budget",
      icon: "ti-calendar-stats",
      href: URLS.aip,
    });
    setVal(val, Math.round(up) + "%", "of budget utilized");
    body.innerHTML = `
      <div class="db-grid db-grid--2">
        <div class="db-col"><h3>Programs and projects</h3>
          <div class="db-donut">${donut(
            [
              { v: a.gain, color: "var(--c)" },
              { v: a.gap, color: "var(--c-soft2)" },
            ],
            String(a.total),
            "total",
            "Programs and projects with gain or gap",
          )}
            <dl class="db-kv db-kv--tight">
              <div><dt><i class="db-sw" style="background:var(--c)"></i>With gain</dt><dd>${a.gain}<em>${Math.round(gp)}%</em></dd></div>
              <div><dt><i class="db-sw" style="background:var(--c-soft2)"></i>With gap</dt><dd>${a.gap}<em>${Math.round(pp)}%</em></dd></div></dl></div></div>
        <div class="db-col"><h3>Budget</h3>
          <div class="db-meter" role="img" aria-label="${Math.round(up)}% of the allotted budget utilized"><span style="width:${up}%"></span></div>
          ${kv([
            ["Total allotted", peso(a.allotted), null],
            ["Total utilized", peso(a.utilized), Math.round(up) + "%"],
            [
              "Remaining",
              peso(a.allotted - a.utilized),
              Math.round(100 - up) + "%",
            ],
          ])}</div>
      </div>`;
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  const sec = (id) => document.getElementById(id);
  Promise.all([
    getJson(`/irc/eopcrf1/data?year=${YEAR}`),
    getJson(`/irc/eopcrf2/data?year=${YEAR}`),
    getJson(`/sbm/data?year=${YEAR}`),
  ]).then(([e1, e2, sbm]) => {
    renderE1(sec("eopcrf1"), e1);
    renderE2(sec("eopcrf2"), e2);
    renderSbm(sec("sbm"), sbm);
    renderAip(sec("aip"));
  });
})();
