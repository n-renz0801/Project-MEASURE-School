/* Dashboard: one dedicated section each for EOPCRF 1, EOPCRF 2, SBM and AIP.
   Reads the same endpoints the report pages use (no new backend route):
     /irc/eopcrf1/data, /irc/eopcrf2/data, /sbm/data  (current year only)
   AIP reads /aip/data (not per year).
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
  /* Count-up: <data data-to="3.71" data-from="1" data-dec="2"> elements count
     from data-from (default 0) to data-to, in step with the SBM pin (same delay,
     duration and ease-out). Plays on load and every time a section is expanded.
     The final text is already in the markup, so nothing depends on this script
     finishing; with reduced motion the number is simply left as it is. */
  const COUNT_DELAY = 400,
    COUNT_MS = 850;
  function countUp(scope) {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scope.querySelectorAll("data[data-to]").forEach((el) => {
      cancelAnimationFrame(el._raf);
      const to = +el.dataset.to,
        from = +(el.dataset.from || 0),
        dec = +(el.dataset.dec || 0),
        fmt = (v) => v.toFixed(dec);
      el.textContent = fmt(to);
      if (calm || from === to) return;
      /* Keep the width fixed while the digits change: reserve the width of the
         widest possible reading (every digit as the widest digit of this font).
         Otherwise the number's width changes the width of the column it sits
         in and the text next to it re-wraps while counting. */
      el.style.minWidth = "";
      let wide = "0",
        wideW = 0;
      for (let d = 0; d < 10; d++) {
        el.textContent = String(d);
        if (el.offsetWidth > wideW) {
          wideW = el.offsetWidth;
          wide = String(d);
        }
      }
      el.textContent = fmt(to).replace(/\d/g, wide);
      el.style.minWidth = el.getBoundingClientRect().width + "px";
      el.textContent = fmt(from);
      const t0 = performance.now() + COUNT_DELAY;
      const tick = (now) => {
        const t = Math.min(1, Math.max(0, (now - t0) / COUNT_MS));
        const e = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); // ~ cubic-bezier(.16,1,.3,1)
        el.textContent = fmt(from + (to - from) * e);
        if (t < 1) el._raf = requestAnimationFrame(tick);
      };
      el._raf = requestAnimationFrame(tick);
    });
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
    if (on) countUp(sec);
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
        <article class="db-kra${i === hiIdx ? " db-kra--hi" : i === loIdx ? " db-kra--lo" : ""}" style="--kr:${Math.min(r, 8) * 80}ms" aria-label="${esc(s.name)}">
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

  /* ── EOPCRF 2 (competencies) ───────────────────────────────────────────
     Same structure as the EOPCRF 1 body: one ranked row per competency (all
     9 in report order, Part II-A then II-B, with a divider per part):
     no. | name + badge | highest/lowest indicator | indicators per rating |
     average chip. Highest/lowest competency are marked on their rows only
     (when the averages differ). Ties read "3 indicators tied at 4". */
  const E2_LABELS = {
    5: "Role Model",
    4: "Consistently Demonstrated",
    3: "Most of the Time Demonstrated",
    2: "Sometimes Demonstrated",
    1: "Rarely Demonstrated",
  };
  const E2_PARTS = {
    "Part II-A": "Part II-A · Leadership Competencies",
    "Part II-B": "Part II-B · Core Behavioural Competencies",
  };
  function e2IndicatorBlock(s) {
    if (!s.items.length)
      return `<div class="db-objs db-objs--none"><p class="db-obj__none">No indicators rated yet</p></div>`;
    const hiV = Math.max(...s.items.map((x) => x.v));
    const loV = Math.min(...s.items.map((x) => x.v));
    if (hiV === loV)
      return `<div class="db-objs${s.items.length === 1 ? "" : " db-objs--none"}">${
        s.items.length === 1
          ? e2Line("only", [s.items[0]], hiV)
          : `<p class="db-obj__none">All ${s.items.length} rated indicators are ${hiV}</p>`
      }</div>`;
    return `<div class="db-objs">${e2Line(
      "hi",
      s.items.filter((x) => x.v === hiV),
      hiV,
    )}${e2Line(
      "lo",
      s.items.filter((x) => x.v === loV),
      loV,
    )}</div>`;
  }
  function e2Line(kind, hit, v) {
    const icon =
      kind === "lo" ? "arrow-down" : kind === "only" ? "minus" : "arrow-up";
    const lab =
      kind === "hi" ? "Highest" : kind === "lo" ? "Lowest" : "Indicator";
    const text =
      hit.length > 1
        ? `<b>${hit.length} indicators</b>tied at ${v}`
        : `<b>${hit[0].n}</b>${esc(hit[0].t)}`;
    const tip = hit.map((x) => `${x.n}. ${x.t}`).join("  |  ");
    return `<div class="db-obj db-obj--${kind === "lo" ? "lo" : "hi"}"><span class="db-obj__ico"><i class="ti ti-${icon}" aria-hidden="true"></i></span><span class="db-obj__k">${lab}</span><span class="db-obj__t" title="${esc(tip)}">${text}</span><em>${v}</em></div>`;
  }
  /* Dot plot: one dot per indicator, stacked above its rating (1 to 5).
     Click a dot to see which indicator it is (popup wired up below). */
  function e2Dots(s) {
    const X = (r) => 24 + (r - 1) * 43;
    let dots = "";
    let seq = 0; /* dots appear one after another: left to right, bottom up */
    [1, 2, 3, 4, 5].forEach((r) => {
      const hit = s.items.filter((x) => x.v === r);
      if (!hit.length) {
        dots += `<circle class="db-dots__ghost" cx="${X(r)}" cy="40" r="2"/>`;
        return;
      }
      hit.forEach((x, k) => {
        dots += `<g class="db-dots__pt" style="--d:${seq++ * 70}ms"><circle data-r="${r}" data-n="${x.n}" data-t="${esc(x.t)}" tabindex="0" role="button" aria-label="Indicator ${x.n}, rated ${r}" cx="${X(r)}" cy="${40 - k * 9}" r="4.2"/></g>`;
      });
    });
    const summary = [5, 4, 3, 2, 1]
      .map((r) => [r, s.items.filter((x) => x.v === r).length])
      .filter(([, n]) => n)
      .map(([r, n]) => `${n} rated ${r}`)
      .join(", ");
    return `<svg class="db-dots" viewBox="0 0 220 62" role="img" aria-label="Indicators per rating: ${esc(summary)}"><line class="db-dots__axis" x1="6" x2="214" y1="48" y2="48"/>${[1, 2, 3, 4, 5].map((r) => `<text class="db-dots__t" x="${X(r)}" y="59" text-anchor="middle">${r}</text>`).join("")}${dots}</svg>`;
  }
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
          total: s.criteria.length,
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
    const ex = extremes(rated.map((s, i) => ({ v: s.v, n: i })));
    const hiIdx = ex && !ex.same ? ex.hi.n : -1;
    const loIdx = ex && !ex.same ? ex.lo.n : -1;
    const badge = (i) =>
      i === hiIdx
        ? `<span class="db-badge db-badge--hi"><i class="ti ti-trophy" aria-hidden="true"></i>Highest competency</span>`
        : i === loIdx
          ? `<span class="db-badge db-badge--lo"><i class="ti ti-trending-down" aria-hidden="true"></i>Lowest competency</span>`
          : "";
    let lastPart = "";
    const rows = rated
      .map((s, i) => {
        let divider = "";
        if (s.part !== lastPart) {
          lastPart = s.part;
          const inPart = rated.filter((x) => x.part === s.part);
          divider = `<div class="db-cgrp"><span>${esc(E2_PARTS[s.part] || s.part)}</span><span>${inPart.length} competenc${inPart.length === 1 ? "y" : "ies"} · average <b>${f2(mean(inPart.map((x) => x.v)))}</b></span></div>`;
        }
        const b = bandOf(s.v).b;
        return `${divider}
        <article class="db-kra${i === hiIdx ? " db-kra--hi" : i === loIdx ? " db-kra--lo" : ""}" style="--kr:${Math.min(i, 8) * 80}ms" aria-label="${esc(s.title)}">
          <span class="db-rank" title="Competency ${i + 1} of ${rated.length}">${i + 1}</span>
          <div class="db-kra__id"><h4>${esc(s.title)}</h4>${badge(i)}</div>
          ${e2IndicatorBlock(s)}
          ${e2Dots(s)}
          <div class="db-chip" data-b="${b}" title="Average of the rated indicators"><b>${f2(s.v)}</b><span>${E2_LABELS[b]}</span></div>
        </article>`;
      })
      .join("");
    body.innerHTML = `<div class="db-kras db-kras--e2">
      <div class="db-kras__head" aria-hidden="true"><span>#</span><span>Competency</span><span>Highest and lowest indicator</span><span>Indicators per rating (1 to 5)</span><span>Average</span></div>${rows}</div>`;
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
  /* ── SBM ───────────────────────────────────────────────────────────────
     Same structure as the EOPCRF 1/2 bodies. Top: overall degree + totals
     (left) and a radar of the principle averages (right). Below: one ranked
     row per principle in report order (Curriculum first):
     no. | name + badge | highest/lowest indicator | indicators per degree |
     average chip. Highest/lowest principle are marked on their rows only
     (when the averages differ). Ties read "3 indicators tied: #9, #10, #12".
     Degree scale: Not yet 1, Rarely 2, Frequently 3, Always 4. Averages use
     answered indicators only; the overall figure is the mean of the
     principle averages. */
  const SBM_CUTS = [
    1.75, 2.5, 3.25,
  ]; /* upper edge of Not yet, Rarely, Frequently */
  const sbmDeg = (v) =>
    v <= 1.75 ? DEG[0] : v <= 2.5 ? DEG[1] : v <= 3.25 ? DEG[2] : DEG[3];
  const sbmSwatch = (i) => `var(--d${i + 1})`;

  function sbmLine(kind, hit, v) {
    const d = DEG.find((x) => x.score === v);
    const icon =
      kind === "lo" ? "arrow-down" : kind === "only" ? "minus" : "arrow-up";
    const lab =
      kind === "hi" ? "Highest" : kind === "lo" ? "Lowest" : "Indicator";
    const nums = hit.map((x) => "#" + x.n).join(", ");
    const text =
      hit.length > 1
        ? `<b>${hit.length} indicators</b>tied: ${nums}`
        : `<b>#${hit[0].n}</b>${esc(hit[0].t)}`;
    const tip = hit.map((x) => `#${x.n} ${x.t}`).join("  |  ");
    return `<div class="db-obj db-obj--${kind === "lo" ? "lo" : "hi"}"><span class="db-obj__ico"><i class="ti ti-${icon}" aria-hidden="true"></i></span><span class="db-obj__k">${lab}</span><span class="db-obj__t" title="${esc(tip)}">${text}</span><em class="db-sbm-deg ${d.cls}">${d.label}</em></div>`;
  }
  function sbmIndicatorBlock(p) {
    if (!p.items.length)
      return `<div class="db-objs db-objs--none"><p class="db-obj__none">No indicators answered yet</p></div>`;
    const hiV = Math.max(...p.items.map((x) => x.v));
    const loV = Math.min(...p.items.map((x) => x.v));
    if (hiV === loV) {
      const d = DEG.find((x) => x.score === hiV);
      return p.items.length === 1
        ? `<div class="db-objs">${sbmLine("only", p.items, hiV)}</div>`
        : `<div class="db-objs db-objs--none"><p class="db-obj__none">All ${p.items.length} answered indicators are ${esc(d.label)}</p></div>`;
    }
    return `<div class="db-objs">${sbmLine(
      "hi",
      p.items.filter((x) => x.v === hiV),
      hiV,
    )}${sbmLine(
      "lo",
      p.items.filter((x) => x.v === loV),
      loV,
    )}</div>`;
  }
  /* Radar of the principle averages on the 1 to 4 scale (centre = 1). A
     principle with no answers has no point; the shape joins the rest. */
  function sbmRadar(pr) {
    const cx = 200,
      cy = 135,
      R = 92,
      n = pr.length;
    const ang = (i) => (((i * 360) / n - 90) * Math.PI) / 180;
    const pt = (i, v) => {
      const r = ((v - 1) / 3) * R;
      return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    };
    const str = (a) => a.map((x) => x.toFixed(1)).join(",");
    /* Rings sit on the degree cut-offs (1.75, 2.5, 3.25, 4), which fall at
       25/50/75/100% of the radius, so each band between rings is one degree.
       Drawn outer to inner; alternate bands get a soft neutral fill. */
    const rings = [4, ...SBM_CUTS.slice().reverse()]
      .map(
        (v, z) =>
          `<polygon class="db-rad__ring db-rad__band${z % 2 ? "" : " db-rad__band--tint"}${z === 0 ? " db-rad__ring--edge" : ""}" points="${pr.map((_, k) => str(pt(k, v))).join(" ")}"/>`,
      )
      .join("");
    const axes = pr
      .map((_, i) => {
        const [x, y] = pt(i, 4);
        return `<line class="db-rad__ring" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      })
      .join("");
    const pts = pr
      .map((p, i) => (p.v == null ? null : pt(i, p.v)))
      .filter(Boolean);
    const shape =
      pts.length >= 3
        ? `<polygon class="db-rad__shape" points="${pts.map(str).join(" ")}"/>`
        : pts.length === 2
          ? `<polyline class="db-rad__shape" points="${pts.map(str).join(" ")}"/>`
          : "";
    const dots = pr
      .map((p, i) => (p.v == null ? null : { p, q: pt(i, p.v) }))
      .filter(Boolean)
      .map(
        ({ p, q }, i) =>
          `<circle class="db-rad__dot" style="--d:${i * 60}ms;fill:var(--d${DEG.indexOf(sbmDeg(p.v)) + 1})" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="5.5"><title>${esc(p.short)} ${f2(p.v)}</title></circle>`,
      )
      .join("");
    /* Ring ticks (numbers only): the cut-off values sit on their rings,
       stacked along the emptiest gap between two spokes. Only gaps that are
       not near-horizontal qualify, so the stacked numbers never overlap. The
       gap chosen is the one where the shape's edge passes farthest from the
       tick positions. */
    const ringV = [...SBM_CUTS, 4];
    const ringR = ringV.map((v) => ((v - 1) / 3) * R);
    let best = null;
    for (let g = 0; g < n; g++) {
      const th = ang(g) + Math.PI / n;
      if (Math.abs(Math.sin(th)) < 0.7) continue;
      const h = (g + 1) % n;
      const a1 = pt(g, pr[g].v == null ? 1 : pr[g].v);
      const a2 = pt(h, pr[h].v == null ? 1 : pr[h].v);
      const rm = Math.hypot((a1[0] + a2[0]) / 2 - cx, (a1[1] + a2[1]) / 2 - cy);
      const room = Math.min(...ringR.map((b) => Math.abs(rm - b)));
      if (!best || room > best.room) best = { th, room };
    }
    const ticks = best
      ? ringV
          .map(
            (v, k) =>
              `<text class="db-rad__tick" x="${(cx + ringR[k] * Math.cos(best.th)).toFixed(1)}" y="${(cy + ringR[k] * Math.sin(best.th) + 3.5).toFixed(1)}" text-anchor="middle">${f2(v)}</text>`,
          )
          .join("")
      : "";
    const labels = pr
      .map((p, i) => {
        const [x, y] = pt(i, 4.55);
        const c = Math.cos(ang(i));
        const a = Math.abs(c) < 0.2 ? "middle" : c > 0 ? "start" : "end";
        return `<text class="db-rad__name" x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${a}">${esc(p.short)}</text><text class="db-rad__val" x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="${a}">${p.v == null ? "No answers" : sbmDeg(p.v).label}${p.v == null ? "" : `<tspan class="db-rad__num" dx="4">${f2(p.v)}</tspan>`}</text>`;
      })
      .join("");
    const label = pr
      .map((p) =>
        p.v == null
          ? `${p.short} no answers`
          : `${p.short} ${sbmDeg(p.v).label} (${f2(p.v)})`,
      )
      .join(", ");
    return `<svg viewBox="0 0 400 270" role="img" aria-label="Average score per principle: ${esc(label)}">${rings}${axes}${shape}${ticks}${dots}${labels}</svg>`;
  }
  /* SBM "Indicators per degree": one tile per indicator around a center axis.
     Not yet + Rarely grow to the left, Frequently + Always to the right, so the
     low side and the high side read at a glance. Every group gets a bracket and
     a label placed exactly on its tiles (Rarely and Frequently above, Not yet and
     Always below, so two labels never collide). Tile width is shared by all
     principles (set from the longest side) so row lengths stay comparable.
     Drawn in pixels, so it is redrawn whenever the cell is resized or shown. */
  let sbmPr = [],
    sbmLo = 0,
    sbmHi = 0;
  const SBM_ENTER_MS = 1700; // longest tile entrance: row delay + stagger + tile

  function sbmPlot(el) {
    const p = sbmPr[+el.dataset.i],
      W = el.clientWidth;
    if (!p) return;
    if (!W) {
      el._seen = false; // hidden (section collapsed): next draw is an entrance
      return;
    }
    if (el.querySelector(".is-on"))
      root.dispatchEvent(new Event("db-tip-hide"));
    /* Entrance: the tiles grow out of the axis when the cell first becomes
       visible (page load, or the section being expanded), like the EOPCRF 2
       dots. A resize redraws the cell, so a redraw inside the entrance window
       carries on from where the animation had got to (negative delay) and one
       after it draws the tiles at rest. */
    const now = performance.now();
    if (!el._seen) {
      el._seen = true;
      el._t0 = now;
    }
    const gone = now - el._t0;
    el.style.setProperty("--r", +el.dataset.i * 80 + "ms");
    el.style.setProperty("--t0", Math.round(gone) + "ms");
    el.classList.toggle("is-enter", gone < SBM_ENTER_MS);
    if (!p.answered) {
      el.innerHTML = `<span class="db-pl__na">No indicators answered yet</span>`;
      return;
    }
    // The axis is not fixed at the middle: it sits where the longest low side
    // (sbmLo tiles) and the longest high side (sbmHi tiles) both fit with the
    // widest possible tiles. It is shared by every row so the axes line up.
    // Tiles grow to fill the cell (up to 64px, edge padding kept) and shrink, with the gap dropping to 1px,
    // as it gets tighter.
    const EDGE = 6, // padding kept at both ends of the cell
      PAD = 4,
      MIN_L = 52, // room kept for the widest left label
      MIN_R = 68; // room kept for the widest right label
    const nL = sbmLo,
      nR = sbmHi,
      gaps = (g) => g * (Math.max(nL - 1, 0) + Math.max(nR - 1, 0));
    let GAP = 2,
      tw0 = (W - 2 * EDGE - 2 * PAD - gaps(GAP)) / (nL + nR);
    if (tw0 < 3) {
      GAP = 1;
      tw0 = (W - 2 * EDGE - 2 * PAD - gaps(GAP)) / (nL + nR);
    }
    const ax0 = EDGE + nL * tw0 + GAP * Math.max(nL - 1, 0) + PAD;
    const ax = Math.max(EDGE + MIN_L, Math.min(W - EDGE - MIN_R, ax0));
    const twL = nL ? (ax - EDGE - PAD - GAP * (nL - 1)) / nL : Infinity,
      twR = nR ? (W - ax - EDGE - PAD - GAP * (nR - 1)) / nR : Infinity;
    const tw = Math.max(1, Math.min(64, twL, twR)); // same width for every tile in every row
    const step = tw + GAP;
    // [degree index, side, inner?] inner groups touch the axis
    const groups = [
      [1, "L", true],
      [0, "L", false],
      [2, "R", true],
      [3, "R", false],
    ];
    const nOf = (i) => p.counts[DEG[i].k];
    let h = `<span class="db-pl__ax" style="left:${ax}px"></span>`;
    const labels = [];
    groups.forEach(([i, side, inner]) => {
      const n = nOf(i);
      if (!n) return;
      const s = PAD + (inner ? 0 : step * nOf(side === "L" ? 1 : 2));
      const w = step * n - GAP;
      const left = side === "L" ? ax - s - w : ax + s;
      const inn = inner ? 0 : nOf(side === "L" ? 1 : 2); // tiles between the axis and this group
      const tiles = p.items
        .filter((it) => it.v === DEG[i].score)
        .map(
          (it, k) =>
            `<i class="${DEG[i].cls}" style="width:${tw.toFixed(2)}px;--d:${(inn + (side === "L" ? n - 1 - k : k)) * 26}ms" data-n="${it.n}" data-d="${DEG[i].label}" data-t="${esc(it.t)}" tabindex="0" role="button" aria-label="Indicator ${it.n}, ${DEG[i].label}"></i>`,
        )
        .join("");
      h += `<div class="db-pl__g db-pl__g--${side}" style="left:${left}px;width:${w}px;gap:${GAP}px">${tiles}</div>`;
      h += `<div class="db-pl__br db-pl__br--${inner ? "up" : "dn"}" style="left:${left}px;width:${w}px"></div>`;
      labels.push({ i, n, side, inner, cx: left + w / 2 });
    });
    h += labels
      .map(
        (l, j) =>
          `<span class="db-pl__lb db-pl__lb--${l.inner ? "up" : "dn"}" data-j="${j}">${DEG[l.i].label}<b>${l.n}</b></span>`,
      )
      .join("");
    el.innerHTML = h;
    // center each label on its group, kept on its own side of the axis
    el.querySelectorAll(".db-pl__lb").forEach((lb) => {
      const l = labels[+lb.dataset.j],
        lw = lb.offsetWidth;
      const lo = l.side === "L" ? EDGE : ax + PAD;
      const hi = l.side === "L" ? ax - PAD - lw : W - lw - EDGE;
      lb.style.left = Math.max(lo, Math.min(hi, l.cx - lw / 2)) + "px";
    });
  }
  function sbmPlots(root) {
    const cells = root.querySelectorAll(".db-sbm-dist");
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver((es) =>
        es.forEach((e) => sbmPlot(e.target)),
      );
      cells.forEach((c) => ro.observe(c)); // also fires when a closed section opens
    } else {
      cells.forEach(sbmPlot);
      window.addEventListener("resize", () => cells.forEach(sbmPlot));
    }
  }

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
          items.push({ v: def.score, n: it.n, t: it.text });
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
      overall == null ? "–" : sbmDeg(overall).label,
      overall == null ? "" : f2(overall) + " of 4",
    );
    if (overall != null)
      val.querySelector("small").innerHTML =
        `<data data-to="${overall}" data-from="1" data-dec="2">${f2(overall)}</data> of 4`;
    if (!rated.length) {
      body.innerHTML = msg(
        "No SBM responses yet.",
        URLS.sbm,
        "Open the checklist",
      );
      return;
    }
    const tot = DEG.map((d) => ({
      ...d,
      n: pr.reduce((s, p) => s + p.counts[d.k], 0),
    }));
    const answered = tot.reduce((s, d) => s + d.n, 0),
      all = pr.reduce((s, p) => s + p.total, 0);
    const ex = extremes(rated.map((p, i) => ({ v: p.v, n: p })));
    const hiP = ex && !ex.same ? ex.hi.n : null;
    const loP = ex && !ex.same ? ex.lo.n : null;
    const overallDeg = sbmDeg(overall);
    const favPct = Math.round(((tot[2].n + tot[3].n) / answered) * 100);
    const hiPrinc = rated.filter((p) => p.v > SBM_CUTS[1]).length;
    const pin = Math.max(0, Math.min(100, ((overall - 1) / 3) * 100));
    const badge = (p) =>
      p === hiP
        ? `<span class="db-badge db-badge--hi"><i class="ti ti-trophy" aria-hidden="true"></i>Highest principle</span>`
        : p === loP
          ? `<span class="db-badge db-badge--lo"><i class="ti ti-trending-down" aria-hidden="true"></i>Lowest principle</span>`
          : "";
    sbmPr = pr;
    sbmLo = Math.max(0, ...pr.map((p) => p.counts.not_yet + p.counts.rarely));
    sbmHi = Math.max(
      0,
      ...pr.map((p) => p.counts.frequently + p.counts.always),
    );
    const rows = pr
      .map((p, i) => {
        const cls = p === hiP ? " db-kra--hi" : p === loP ? " db-kra--lo" : "";
        const d = p.v == null ? null : sbmDeg(p.v);
        return `
        <article class="db-kra${cls}${p.v == null ? " db-kra--empty" : ""}" aria-label="${esc(p.name)}">
          <span class="db-rank" title="Principle ${i + 1} of ${pr.length}">${i + 1}</span>
          <div class="db-kra__id"><h4>${esc(p.name)}</h4><small class="db-sbm-sub">${p.answered} of ${p.total} answered</small>${badge(p)}</div>
          ${sbmIndicatorBlock(p)}
          <div class="db-sbm-dist" data-i="${i}" role="img" aria-label="${esc(p.name)}: ${DEG.map((x) => x.label + " " + p.counts[x.k]).join(", ")}"></div>
          <div class="db-chip ${d ? d.cls : "db-sbm-na"}" title="Average of the answered indicators (Not yet 1 · Rarely 2 · Frequently 3 · Always 4)"><b>${d ? d.label : "No answers"}</b><span>${p.v == null ? "" : f2(p.v)}</span></div>
        </article>`;
      })
      .join("");
    body.innerHTML = `
      <div class="db-sbm-band">
        <div class="db-sbm-card db-sbm-card--hl db-sbm-sum">
          <h3>Overall degree of manifestation<small>${answered} of ${all} answered</small></h3>
          <div class="db-sbm-top">
            <div class="db-sbm-big"><b>${esc(overallDeg.label)}</b><span><data data-to="${overall}" data-from="1" data-dec="2">${f2(overall)}</data> of 4.00 · mean of ${rated.length} principle${rated.length === 1 ? "" : "s"}</span></div>
            <div class="db-sbm-stats">
              <div class="db-sbm-stat"><b><data data-to="${favPct}">${favPct}</data>%</b><span>Frequently or Always<br>manifested</span></div>
              <div class="db-sbm-stat"><b><data data-to="${hiPrinc}">${hiPrinc}</data><small> of ${rated.length}</small></b><span>principles at Frequently<br>or higher</span></div>
            </div>
          </div>
          <div class="db-sbm-scale" role="img" aria-label="Overall ${f2(overall)} of 4, ${esc(overallDeg.label)}. Boundaries at ${SBM_CUTS.map(f2).join(", ")}">
            <div class="db-sbm-scale__wrap" style="--p:${pin}%">
              <span class="db-sbm-scale__bubble"><data data-to="${overall}" data-from="1" data-dec="2">${f2(overall)}</data></span>
              <div class="db-sbm-scale__bar">${DEG.map((d, i) => `<span class="${d.cls}${d === overallDeg ? " is-on" : ""}">${d.label}</span>`).join("")}<u></u></div></div>
            <div class="db-sbm-scale__ticks" aria-hidden="true">${[1, ...SBM_CUTS, 4].map((v, i) => `<span style="left:${i * 25}%">${f2(v)}</span>`).join("")}</div></div>
          <h3 class="db-sbm-sum__h">Total across all principles</h3>
          <div class="db-sbm-seg" role="img" aria-label="${tot.map((d) => d.label + " " + d.n).join(", ")}">${tot.map((d) => (d.n ? `<span class="${d.cls}" style="flex:${d.n}">${d.n}</span>` : "")).join("")}</div>
          <div class="db-sbm-cols">${tot.map((d, i) => `<span class="db-sbm-col" title="${d.label}: ${d.n} of ${answered}"><i style="background:${sbmSwatch(i)}"></i>${d.label}<em><data data-to="${answered ? Math.round((d.n / answered) * 100) : 0}">${answered ? Math.round((d.n / answered) * 100) : 0}</data>%</em></span>`).join("")}</div>
        </div>
        <div class="db-sbm-card db-sbm-radar"><h3>Average score per principle</h3>${sbmRadar(pr)}</div>
      </div>
      <div class="db-kras db-kras--sbm">
        <div class="db-kras__head" aria-hidden="true"><span>#</span><span>Principle</span><span>Highest and lowest indicator</span><span>Indicators per degree<small class="db-kras__note"> · 1 tile = 1 indicator</small></span><span>Average</span></div>${rows}
      </div>`;
    sbmPlots(body);
    countUp(sec);
  }

  /* ── AIP ─────────────────────────────────────────────────────────────────
     Reads /aip/data. Programs/projects: total, with gain, with gap (the
     Gain | Gap choice on each project; projects with no choice yet are
     counted in the total only and not listed). Budget: total allotted = sum
     of the target finance amounts, total utilized = sum of the accomplishment
     finance amounts (an amount not entered counts as 0).
     Hover (or keyboard focus) on an arc or on its row highlights both and
     shows that figure in the donut's centre. Nothing is clickable. */
  const pesoFull = (n) =>
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  /* compact, for the donut centre: ₱2M, ₱1.56M, ₱440K */
  const pesoK = (n) =>
    "₱" +
    new Intl.NumberFormat("en-PH", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  const pct = (part, whole) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;
  /* Donut ring: a pale track, then one arc per segment (a small gap between
     arcs only when there is more than one). The track and each arc may carry
     a data-seg index for the hover link with its row. */
  function aipRing(o) {
    const R = 50,
      C = 2 * Math.PI * R;
    const total = o.segs.reduce((t, x) => t + x.of, 0) || 1;
    const live = o.segs.filter((x) => x.v > 0);
    let off = 0;
    const arcs = live
      .map((x) => {
        const len = (x.v / total) * C;
        const dash = live.length > 1 ? Math.max(len - 2, 0.5) : len;
        const el = `<circle class="db-aip-arc db-aip-seg" data-seg="${x.seg}" tabindex="0" role="img" aria-label="${esc(x.aria)}" cx="64" cy="64" r="${R}" fill="none" stroke-width="18" style="stroke:${x.color}" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-off}" transform="rotate(-90 64 64)"/>`;
        off += len;
        return el;
      })
      .join("");
    const t = o.track;
    const trackEl = `<circle class="db-aip-track${t.seg != null ? " db-aip-seg" : ""}"${t.seg != null ? ` data-seg="${t.seg}" tabindex="0" role="img" aria-label="${esc(t.aria)}"` : ""} cx="64" cy="64" r="${R}" fill="none" stroke-width="18" style="stroke:${t.color}"/>`;
    return `<svg viewBox="0 0 128 128" role="group" aria-label="${esc(o.label)}">${trackEl}${arcs}
      <text x="64" y="68" text-anchor="middle" class="db-aip-big">${esc(o.big)}</text>
      <text x="64" y="82" text-anchor="middle" class="db-aip-sm">${esc(o.small)}</text></svg>`;
  }
  const aipRow = (seg, n, label, swatch, chip, deep) =>
    `<div class="db-aip-row" data-seg="${seg}" tabindex="0"><div><span class="db-aip-n${deep ? " db-aip-n--deep" : ""}">${n}</span>
      <span class="db-aip-l"><i style="background:${swatch}"></i>${esc(label)}</span></div>
      ${chip == null ? "" : `<span class="db-aip-chip">${chip}%</span>`}</div>`;
  /* hover / focus link between an arc and its row; the centre text follows.
     centers[seg] = [big, small]; def = the resting centre text. */
  function aipHover(card, def, centers) {
    const svg = card.querySelector("svg");
    const big = svg.querySelector(".db-aip-big"),
      sm = svg.querySelector(".db-aip-sm");
    const show = (i) => {
      svg.classList.toggle("is-dim", i != null);
      card
        .querySelectorAll("[data-seg]")
        .forEach((el) => el.classList.toggle("on", +el.dataset.seg === i));
      const c = i == null ? def : centers[i];
      big.textContent = c[0];
      sm.textContent = c[1];
      big.classList.toggle("is-sm", c[0].length > 5);
    };
    card.querySelectorAll("[data-seg]").forEach((el) => {
      const i = +el.dataset.seg;
      el.addEventListener("mouseenter", () => show(i));
      el.addEventListener("focus", () => show(i));
      el.addEventListener("mouseleave", () => show(null));
      el.addEventListener("blur", () => show(null));
    });
  }
  function renderAip(sec, data) {
    const { body, val } = shell(sec, {
      title: "AIP",
      sub: "Programs, projects and budget",
      icon: "ti-calendar-stats",
      href: URLS.aip,
    });
    const list = (data && data.projects) || [];
    if (!list.length) {
      setVal(val, "–", "no programs/projects yet");
      body.innerHTML = msg(
        data ? "No programs or projects yet." : "The AIP could not be loaded.",
        URLS.aip,
        "Open the AIP report",
      );
      return;
    }
    const total = list.length;
    const gain = list.filter((p) => p.gainGapType === "gain").length;
    const gap = list.filter((p) => p.gainGapType === "gap").length;
    const sum = (k) => list.reduce((t, p) => t + (Number(p[k]) || 0), 0);
    const allotted = sum("targetFinance"),
      utilized = sum("accomplishmentFinance");
    const up = pct(utilized, allotted);
    setVal(val, up + "%", "of budget utilized");
    const cnt = (n) => `<data data-to="${n}">${n}</data>`;
    body.innerHTML = `
      <div class="db-aip">
        <div class="db-aip-card db-aip-card--hl" id="aip-card-prog">
          <div class="db-aip-chart">${aipRing({
            track: { color: "var(--c-soft)" },
            segs: [
              {
                v: gain,
                of: total,
                color: "var(--c)",
                seg: 0,
                aria: `${gain} with gain`,
              },
              {
                v: gap,
                of: total,
                color: "var(--c-soft2)",
                seg: 1,
                aria: `${gap} with gap`,
              },
            ],
            big: String(total),
            small: "programs/projects",
            label: `${gain} of ${total} programs and projects with gain, ${gap} with gap`,
          })}</div>
          <div class="db-aip-rows"><h3>Programs and projects</h3>
            ${aipRow(0, cnt(gain), "With gain", "var(--c)", pct(gain, total))}
            ${aipRow(1, cnt(gap), "With gap", "var(--c-soft2)", pct(gap, total))}
          </div>
        </div>
        <div class="db-aip-card" id="aip-card-budget">
          <div class="db-aip-chart">${aipRing({
            track: {
              color: "var(--c-soft2)",
              seg: 0,
              aria: `${pesoFull(allotted)} allotted`,
            },
            segs: [
              {
                v: utilized,
                of: allotted,
                color: "var(--c)",
                seg: 1,
                aria: `${pesoFull(utilized)} utilized`,
              },
            ],
            big: up + "%",
            small: "utilized",
            label: `${up}% of the allotted budget utilized`,
          })}</div>
          <div class="db-aip-rows"><h3>Budget</h3>
            ${aipRow(0, pesoFull(allotted), "Total allotted", "var(--c-soft2)", null, true)}
            ${aipRow(1, pesoFull(utilized), "Total utilized", "var(--c)", null)}
          </div>
        </div>
      </div>`;
    aipHover(
      body.querySelector("#aip-card-prog"),
      [String(total), "programs/projects"],
      [
        [String(gain), `with gain · ${pct(gain, total)}%`],
        [String(gap), `with gap · ${pct(gap, total)}%`],
      ],
    );
    aipHover(
      body.querySelector("#aip-card-budget"),
      [up + "%", "utilized"],
      [
        [pesoK(allotted), "allotted"],
        [pesoK(utilized), "utilized"],
      ],
    );
    countUp(sec);
  }

  /* Dot plot popup: click a dot (or press Enter/Space on a focused one) to show
     "Indicator n" and its text (EOPCRF 2 dots and the SBM tiles); click it again, click elsewhere or press Esc to close. */
  (function () {
    const tip = document.createElement("div");
    tip.className = "db-tip";
    tip.setAttribute("role", "status");
    tip.hidden = true;
    root.appendChild(tip);
    let on = null;
    root.addEventListener("db-tip-hide", () => hide());
    const hide = () => {
      tip.hidden = true;
      if (on) on.classList.remove("is-on");
      on = null;
    };
    const show = (dot) => {
      if (on === dot) return hide();
      hide();
      on = dot;
      dot.classList.add("is-on");
      const head = document.createElement("b");
      head.textContent =
        "Indicator " +
        dot.dataset.n +
        (dot.dataset.d ? " · " + dot.dataset.d : "");
      tip.classList.toggle("db-tip--sbm", !!dot.closest(".db-sbm-dist"));
      const text = document.createElement("span");
      text.textContent = dot.dataset.t || "";
      tip.replaceChildren(head, text);
      tip.hidden = false;
      /* centre over the dot, but keep the label inside the window; the arrow
         keeps pointing at the dot */
      const r = dot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const w = tip.offsetWidth;
      const left = Math.min(
        Math.max(cx, 8 + w / 2),
        Math.max(window.innerWidth - 8 - w / 2, 8 + w / 2),
      );
      tip.style.left = left + "px";
      tip.style.top = r.top - 9 + "px";
      tip.style.setProperty("--ax", cx - left + w / 2 + "px");
    };
    const isDot = (el) =>
      el.closest &&
      el.closest(".db-dots circle[data-n], .db-sbm-dist i[data-n]");
    root.addEventListener("click", (e) => {
      const d = isDot(e.target);
      d ? show(d) : hide();
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
      else if ((e.key === "Enter" || e.key === " ") && isDot(e.target)) {
        e.preventDefault();
        show(isDot(e.target));
      }
    });
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
  })();

  /* ── boot ────────────────────────────────────────────────────────────── */
  const sec = (id) => document.getElementById(id);
  Promise.all([
    getJson(`/irc/eopcrf1/data?year=${YEAR}`),
    getJson(`/irc/eopcrf2/data?year=${YEAR}`),
    getJson(`/sbm/data?year=${YEAR}`),
    getJson("/aip/data"),
  ]).then(([e1, e2, sbm, aip]) => {
    renderE1(sec("eopcrf1"), e1);
    renderE2(sec("eopcrf2"), e2);
    renderSbm(sec("sbm"), sbm);
    renderAip(sec("aip"), aip);
  });
})();
