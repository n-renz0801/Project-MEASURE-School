(function () {
  const workspaceEl = document.getElementById("eopcrf1-workspace");
  if (!workspaceEl) return;

  const listEl = document.getElementById("eopcrf1-list");
  const editorEl = document.getElementById("eopcrf1-editor");
  const progressEl = document.getElementById("eopcrf1-progress");
  const progressCountEl = document.getElementById("eopcrf1-progress-count");
  const segsEl = document.getElementById("eopcrf1-segments");
  const nextBtn = document.getElementById("eopcrf1-next-incomplete");
  const doneBadge = document.getElementById("eopcrf1-done-badge");
  const errorStateEl = document.getElementById("eopcrf1-error-state");

  // ================= Reset button + confirmation modal =================
  const resetBtn = document.getElementById("eopcrf1-reset-btn");
  const resetConfirmOverlay = document.getElementById(
    "eopcrf1-reset-confirm-overlay",
  );
  const resetConfirmCancelBtn = document.getElementById(
    "eopcrf1-reset-confirm-cancel",
  );
  const resetConfirmConfirmBtn = document.getElementById(
    "eopcrf1-reset-confirm-confirm",
  );
  const resetPartChecks = document.querySelectorAll(
    'input[name="eopcrf1-reset-part"]',
  );
  const resetPartB = document.getElementById("eopcrf1-reset-part-b");
  const resetBOptions = document.getElementById("eopcrf1-reset-b-options");
  const resetBScopeRadios = document.querySelectorAll(
    'input[name="eopcrf1-reset-b-scope"]',
  );
  const resetConfirmWarning = document.getElementById(
    "eopcrf1-reset-confirm-warning",
  );

  // ================= Modal elements =================
  const modal = document.getElementById("eopcrf1-entry-modal");
  const modalTitle = document.getElementById("eopcrf1-entry-modal-title");
  const modalHint = document.getElementById("eopcrf1-entry-modal-hint");
  const modalClose = document.getElementById("eopcrf1EntryModalClose");
  const modalCancel = document.getElementById("eopcrf1EntryModalCancel");
  const modalOverlay = document.getElementById("eopcrf1EntryModalOverlay");
  const modalSubmit = document.getElementById("eopcrf1EntryModalSubmit");
  const modalDelete = document.getElementById("eopcrf1EntryModalDelete");
  const fieldPrimaryWrap = document.getElementById("eopcrf1-field-primary");
  const fieldPrimaryLabel = document.getElementById(
    "eopcrf1-field-primary-label",
  );
  const primaryInput = document.getElementById("eopcrf1-entry-text");
  const fieldRateWrap = document.getElementById("eopcrf1-field-rate");
  const rateSelect = document.getElementById("eopcrf1-entry-rate");
  const fieldWeightWrap = document.getElementById("eopcrf1-field-weight");
  const fieldWeightLabel = document.getElementById(
    "eopcrf1-field-weight-label",
  );
  const weightInput = document.getElementById("eopcrf1-entry-weight");
  const extraFieldsEl = document.getElementById("eopcrf1-extra-fields");

  // ================= Icons =================
  const svg = (inner, cls) =>
    `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON_EDIT = svg(
    '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
  );
  const ICON_TRASH = svg(
    '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>',
  );
  const ICON_PLUS = svg(
    '<path d="M12 5v14M5 12h14"></path>',
    "eopcrf1-inline-icon",
  );
  const ICON_INFO = svg(
    '<circle cx="12" cy="12" r="10"></circle><path d="M12 11v5M12 8v.01"></path>',
    "eopcrf1-warn-icon",
  );
  const ICON_LOCK = svg(
    '<rect x="3" y="11" width="18" height="10" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
    "eopcrf1-inline-icon",
  );

  const PROGRESS_LABELS = {
    none: "Not started",
    partial: "In progress",
    done: "Complete",
  };

  const INDICATOR_CATEGORIES = [
    { key: "quality", label: "Quality" },
    { key: "efficiency", label: "Efficiency" },
    { key: "timeliness", label: "Timeliness" },
  ];
  const LEVELS = [
    { n: 5, name: "Outstanding" },
    { n: 4, name: "Very satisfactory" },
    { n: 3, name: "Satisfactory" },
    { n: 2, name: "Unsatisfactory" },
    { n: 1, name: "Poor" },
  ];
  const levelName = (n) =>
    (LEVELS.find((l) => l.n === Number(n)) || {}).name || "";

  const PARTS = [
    {
      key: "a",
      label: "Part I-A",
      full: "Commitment to Organizational Outcomes",
    },
    {
      key: "b",
      label: "Part I-B",
      full: "Innovating and Intervening Accomplishments",
    },
    { key: "c", label: "Part I-C", full: "Organizational Effectiveness" },
  ];
  const PART_EXPECTED_TOTAL = { a: 60, b: 20, c: 15 };

  // ================= State =================
  // `state.kras` mirrors GET /irc/eopcrf1/data. `sel` is the only piece of
  // view state: which KRA / objective is open in the detail panel.
  const state = { kras: [], year: null };
  const sel = { kraId: null, objId: null };
  // Nav-only view state: visible Part tab, collapsed KRA, change trackers.
  const view = {
    part: null,
    collapsed: null,
    lastKra: null,
    lastObj: null,
    catOff: new Set(), // rating categories the user folded; all start open
    alignOpen: false, // Program alignment fold (objective view)
    movMode: null, // null | "edit" | "confirm" for the MOV link strip
    movObjId: null, // the objective movMode applies to
  };
  const PART_SHORT = { a: "Outcomes", b: "Innovating", c: "Effectiveness" };
  const id = (v) => String(v);

  // ================= API helper =================
  async function apiCall(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      throw new Error("Network error. Check your connection and try again.");
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* no JSON body */
    }
    if (!res.ok) {
      throw new Error(
        (data && data.error) || "Something went wrong. Please try again.",
      );
    }
    return data;
  }

  // ================= Helpers =================
  function letterLabel(index) {
    let n = index;
    let label = "";
    do {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
  }

  // 1-based position of a KRA within its own part (I-A, I-B or I-C)
  function kraNumber(kra) {
    const idx = state.kras
      .filter((k) => k.part === kra.part)
      .findIndex((k) => id(k.id) === id(kra.id));
    return idx === -1 ? 1 : idx + 1;
  }

  const hasVal = (v) => v !== null && v !== undefined && v !== "" && !isNaN(v);
  const fmtWeight = (w) =>
    hasVal(w) ? Math.round(Number(w) * 100) / 100 + "%" : "—";
  const fmt3 = (n) => Number(n).toFixed(3);

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function sumWeights(list) {
    return list.reduce((sum, item) => {
      const w = parseFloat(item.weight);
      return sum + (isNaN(w) ? 0 : w);
    }, 0);
  }

  // Objective weights should add up to their KRA's weight.
  function objectiveWeightMismatch(kra) {
    const totalObj = sumWeights(kra.objectives);
    const kraW = parseFloat(kra.weight);
    const mismatch =
      kra.objectives.length > 0 &&
      !isNaN(kraW) &&
      Math.abs(totalObj - kraW) >= 0.005;
    return { mismatch, totalObj, kraW };
  }

  function computeAverage(obj) {
    let sum = 0;
    let count = 0;
    INDICATOR_CATEGORIES.forEach((c) => {
      const v = obj.ratings[c.key];
      if (hasVal(v)) {
        sum += Number(v);
        count++;
      }
    });
    return count === 0 ? null : sum / count;
  }

  function computeScore(obj) {
    const avg = computeAverage(obj);
    const w = parseFloat(obj.weight);
    if (avg === null || isNaN(w)) return null;
    return avg * (w / 100);
  }

  // "1.2. Develop and ..." -> { code: "1.2", title: "Develop and ..." }
  function splitObjectiveText(text, fallbackCode) {
    const m = /^\s*(\d+\.\d+)\.?\s+([\s\S]*)$/.exec(text || "");
    return m
      ? { code: m[1], title: m[2] }
      : { code: fallbackCode, title: text || "" };
  }

  // ================= Lookups =================
  const findKra = (kraId) => state.kras.find((k) => id(k.id) === id(kraId));
  function findObjective(kraId, objId) {
    const kra = findKra(kraId);
    return kra
      ? kra.objectives.find((o) => id(o.id) === id(objId)) || null
      : null;
  }

  function upsertObjective(updated) {
    const kra = findKra(updated.kraId);
    if (!kra) return;
    const idx = kra.objectives.findIndex((o) => id(o.id) === id(updated.id));
    if (idx === -1) kra.objectives.push(updated);
    else kra.objectives[idx] = updated;
  }

  function upsertIndicator(kraId, objId, category, item) {
    const obj = findObjective(kraId, objId);
    if (!obj) return;
    const idx = obj[category].findIndex((i) => id(i.id) === id(item.id));
    if (idx === -1) obj[category].push(item);
    else obj[category][idx] = item;
  }

  // ================= Totals =================
  function partTotals(partKey) {
    const kras = state.kras.filter((k) => k.part === partKey);
    let scoreSum = 0;
    let hasAny = false;
    kras.forEach((k) =>
      k.objectives.forEach((o) => {
        const s = computeScore(o);
        if (s !== null) {
          scoreSum += s;
          hasAny = true;
        }
      }),
    );
    return { weight: sumWeights(kras), score: hasAny ? scoreSum : null };
  }

  // ================= Render: selection =================
  function ensureSelection(visibleKras) {
    const kra = visibleKras.find((k) => id(k.id) === id(sel.kraId));
    if (kra) {
      if (
        sel.objId === null ||
        kra.objectives.some((o) => id(o.id) === id(sel.objId))
      )
        return;
    }
    const withObjs = visibleKras.find((k) => k.objectives.length > 0);
    if (withObjs) {
      sel.kraId = withObjs.id;
      sel.objId = withObjs.objectives[0].id;
    } else if (visibleKras.length) {
      sel.kraId = visibleKras[0].id;
      sel.objId = null;
    } else {
      sel.kraId = null;
      sel.objId = null;
    }
  }

  // ================= Objective progress =================
  // Tracks the three things the user has to fill in on every objective:
  //   1. Timeline
  //   2. Performance measures and rating scale: for each of Quality /
  //      Efficiency / Timeliness a rating is chosen, and (on KRAs the user
  //      builds, i.e. not locked) all five level descriptors are written
  //   3. Actual accomplishments
  // Returns { state: "none" | "partial" | "done", done, total, missing[] }.
  // True when at least one level of this measure (quality / efficiency /
  // timeliness) has a written descriptor.
  function hasDescriptors(obj, key) {
    return (obj[key] || []).some(
      (i) => typeof i.label === "string" && i.label.trim() !== "",
    );
  }

  function objectiveProgress(kra, obj) {
    const filled = (v) => typeof v === "string" && v.trim() !== "";
    const checks = [{ label: "Timeline", ok: filled(obj.timeline) }];
    INDICATOR_CATEGORIES.forEach((c) => {
      // A measure with no descriptors at all is not applicable to this
      // objective, so neither its rating nor its descriptors are required.
      if (!hasDescriptors(obj, c.key)) return;
      checks.push({
        label: `${c.label} rating`,
        ok: hasVal(obj.ratings && obj.ratings[c.key]),
      });
      if (!kra.locked) {
        const items = obj[c.key] || [];
        checks.push({
          label: `${c.label} descriptors`,
          ok: LEVELS.every((l) =>
            items.some((i) => i.rate === l.n && filled(i.label)),
          ),
        });
      }
    });
    checks.push({
      label: "Actual accomplishments",
      ok: filled(obj.actualResults),
    });
    const done = checks.filter((c) => c.ok).length;
    const total = checks.length;
    return {
      state: done === 0 ? "none" : done === total ? "done" : "partial",
      done,
      total,
      missing: checks.filter((c) => !c.ok).map((c) => c.label),
    };
  }
  // ================= Ordered KRAs / progress =================
  // Everything is one list now: Part I-A, then I-B, then I-C.
  const orderedKras = () =>
    PARTS.flatMap((p) => state.kras.filter((k) => k.part === p.key));
  const partCode = (key) => "I-" + key.toUpperCase();
  const kraWord = (kra) => (kra.part === "c" ? "Area" : "KRA");

  function kraProgressInfo(kra) {
    const n = kra.objectives.length;
    let frac = 0;
    let done = 0;
    kra.objectives.forEach((o) => {
      const p = objectiveProgress(kra, o);
      frac += p.total ? p.done / p.total : 0;
      if (p.state === "done") done++;
    });
    return { n, done, frac: n ? frac / n : 0, complete: n > 0 && done === n };
  }

  // Which objective (if any) is waiting for "Clear objective" confirmation.
  let confirmClearObjId = null;

  // ================= Render: progress =================
  function renderProgress(kras) {
    let total = 0;
    let done = 0;
    kras.forEach((k) =>
      k.objectives.forEach((o) => {
        total++;
        if (objectiveProgress(k, o).state === "done") done++;
      }),
    );
    const complete = total > 0 && done === total;
    progressCountEl.classList.toggle("is-complete", complete);
    progressCountEl.innerHTML = `<strong>${done} of ${total}</strong><span>complete</span>`;
    segsEl.setAttribute("aria-valuemax", String(total));
    segsEl.setAttribute("aria-valuenow", String(done));
    // One group per Part; only the first segment of a group carries the Part name.
    segsEl.innerHTML = PARTS.map((p) => {
      const partKras = kras.filter((k) => k.part === p.key);
      if (!partKras.length) return "";
      const segs = partKras
        .map((k, i) => {
          const info = kraProgressInfo(k);
          const active = id(k.id) === id(sel.kraId);
          const title = `${kraWord(k)} ${kraNumber(k)} (${p.label}): ${info.done} of ${info.n} objectives complete`;
          const label =
            i === 0
              ? `<b>${partCode(p.key)}</b> &middot; ${kraNumber(k)}`
              : String(kraNumber(k));
          return `
          <button type="button" class="eopcrf1-seg${active ? " is-active" : ""}${info.complete ? " is-complete" : ""}" data-kra-id="${k.id}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"${active ? ' aria-current="true"' : ""}>
            <span class="eopcrf1-seg-bar"><span style="width:${info.frac * 100}%"></span></span>
            <span class="eopcrf1-seg-label">${label}</span>
          </button>`;
        })
        .join("");
      return `<div class="eopcrf1-pgroup" style="--n:${partKras.length}">${segs}</div>`;
    }).join("");
    nextBtn.hidden = complete || total === 0;
    doneBadge.hidden = !complete;
  }

  // ================= Render: list =================
  function weightMessage(total, expected) {
    const diff = Math.round((expected - total) * 100) / 100;
    if (diff > 0.005)
      return `KRA weights total ${fmtWeight(total)}, not ${expected}%. Allocate ${fmtWeight(diff)} more.`;
    if (diff < -0.005)
      return `KRA weights total ${fmtWeight(total)}, which is ${fmtWeight(-diff)} over the ${expected}% target. Reduce a KRA's weight.`;
    return "";
  }

  function partStats(partKey, kras) {
    let n = 0;
    let done = 0;
    kras
      .filter((k) => k.part === partKey)
      .forEach((k) =>
        k.objectives.forEach((o) => {
          n++;
          if (objectiveProgress(k, o).state === "done") done++;
        }),
      );
    return { n, done };
  }

  function renderList(kras) {
    // Follow the selection: if it moved to a KRA in another part, switch tab.
    const selKra = findKra(sel.kraId);
    if (selKra && id(selKra.id) !== id(view.lastKra)) view.part = selKra.part;
    view.lastKra = sel.kraId;
    if (!view.part) view.part = "a";
    if (view.collapsed !== null && id(sel.objId) !== id(view.lastObj))
      view.collapsed = null;
    view.lastObj = sel.objId;

    const p = PARTS.find((x) => x.key === view.part);
    const partKras = kras.filter((k) => k.part === p.key);
    const expected = PART_EXPECTED_TOTAL[p.key];
    const stats = partStats(p.key, kras);

    // --- Part tabs: name + progress bar (weights are shown in the header below)
    let html =
      '<div class="eopcrf1-nv-top"><div class="eopcrf1-nv-tabs" role="tablist">';
    PARTS.forEach((pt) => {
      const st = partStats(pt.key, kras);
      const has = kras.some((k) => k.part === pt.key);
      const total = partTotals(pt.key).weight;
      const off =
        has &&
        weightMessage(
          total,
          pt.key === "b"
            ? expected && PART_EXPECTED_TOTAL.b
            : PART_EXPECTED_TOTAL[pt.key],
        );
      const on = pt.key === view.part;
      html += `
        <button type="button" role="tab" aria-selected="${on}" class="eopcrf1-nv-tab${on ? " is-on" : ""}" data-action="select-part" data-part="${pt.key}" title="${escapeHtml(pt.full)}">
          <b>${pt.label}</b>
          <small>${PART_SHORT[pt.key]}</small>
          <span class="eopcrf1-nv-bar${st.n && st.done === st.n ? " is-done" : ""}"><i style="width:${st.n ? (st.done / st.n) * 100 : 0}%"></i></span>${
            off
              ? '<span class="eopcrf1-nv-tabdot" role="img" aria-label="Weights do not add up"></span>'
              : ""
          }
        </button>`;
    });
    html += "</div></div>";

    // --- Part header: full name, progress / KRA count, weight chip or Add KRA
    const word = p.key === "c" ? "Areas" : "KRAs";
    const partTotal = partTotals(p.key).weight;
    const msg = partKras.length ? weightMessage(partTotal, expected) : "";
    const headLeft =
      p.key === "b"
        ? `Your ${word} &middot; ${partKras.length}`
        : `${stats.done} of ${stats.n} objectives done`;
    const headRight =
      p.key === "b"
        ? partKras.length
          ? `<button type="button" class="eopcrf1-btn eopcrf1-btn--primary eopcrf1-nv-sm" data-action="add-kra">${ICON_PLUS}Add KRA</button>`
          : ""
        : partKras.length
          ? `<span class="eopcrf1-wchip ${msg ? "is-warn" : "is-ok"}">Weights ${fmtWeight(partTotal)}/${expected}%</span>`
          : "";
    html += `<div class="eopcrf1-nv-head"><div class="eopcrf1-nv-sub">${escapeHtml(p.full)}</div><div class="eopcrf1-nv-headrow"><b>${headLeft}</b>${headRight}</div></div>`;
    if (msg)
      html += `<div class="eopcrf1-wmsg" role="status">${ICON_INFO}<span><b>Weights ${fmtWeight(partTotal)}/${expected}%.</b> ${escapeHtml(msg)}</span></div>`;

    // --- Empty part
    if (!partKras.length) {
      html += `<div class="eopcrf1-nv-empty"><b>No ${word} in ${p.label} yet</b>${
        p.key === "b"
          ? `<span>Add a KRA first, then add objectives under it.</span><button type="button" class="eopcrf1-btn eopcrf1-btn--primary" data-action="add-kra">${ICON_PLUS}Add your first KRA</button>`
          : ""
      }</div>`;
      listEl.innerHTML = html;
      return;
    }

    // --- KRAs (one open at a time); the open KRA shows its actions and an objective rail
    html += '<div class="eopcrf1-nv-kras">';
    partKras.forEach((kra) => {
      const open =
        id(kra.id) === id(sel.kraId) && id(view.collapsed) !== id(kra.id);
      const info = kraProgressInfo(kra);
      const fullName = `${kraWord(kra)} ${kraNumber(kra)} \u00b7 ${kra.text || "Untitled KRA"}`;
      html += `
        <div class="eopcrf1-nv-group${open ? " is-open" : ""}">
        <button type="button" class="eopcrf1-nv-kra${open ? " is-open" : ""}" data-action="toggle-kra" data-kra-id="${kra.id}" aria-expanded="${open}" title="${escapeHtml(fullName)}" aria-label="${escapeHtml(fullName)}, weight ${fmtWeight(kra.weight)}, ${info.done} of ${info.n} objectives complete">
          <span class="eopcrf1-nv-badge${info.complete ? " is-done" : ""}" aria-hidden="true">${escapeHtml(String(kraNumber(kra)))}</span>
          <span class="eopcrf1-nv-kra-name">${kra.text ? escapeHtml(kra.text) : "Untitled KRA"}</span>
          <span class="eopcrf1-nv-kra-w" title="KRA weight &middot; objectives complete"><b>${fmtWeight(kra.weight)}</b><small>${info.done}/${info.n}</small></span>
        </button>`;
      if (open) {
        if (!kra.locked)
          html += `
        <div class="eopcrf1-nv-actions">
          <button type="button" class="eopcrf1-btn eopcrf1-btn--primary eopcrf1-nv-act eopcrf1-nv-act--wide" data-action="add-objective" data-kra-id="${kra.id}">${ICON_PLUS}Add objective</button>
          <button type="button" class="eopcrf1-btn eopcrf1-nv-act" data-action="edit-kra" data-kra-id="${kra.id}">${ICON_EDIT}Edit KRA</button>
          <button type="button" class="eopcrf1-btn eopcrf1-nv-act eopcrf1-nv-del" data-action="delete-kra" data-kra-id="${kra.id}">${ICON_TRASH}Delete KRA</button>
        </div>`;
        const mm = objectiveWeightMismatch(kra);
        if (mm.mismatch)
          html += `<div class="eopcrf1-warn eopcrf1-nv-warn" role="alert">${ICON_INFO}<span>Objective weights total ${fmtWeight(mm.totalObj)}, but this KRA is ${fmtWeight(mm.kraW)}. They should match.</span></div>`;
        if (!kra.objectives.length) {
          html += `<p class="eopcrf1-nv-none">No objectives yet.${kra.locked ? "" : " Use &ldquo;Add objective&rdquo; above."}</p>`;
        } else {
          html += '<div class="eopcrf1-nv-rail">';
          kra.objectives.forEach((obj, i) => {
            const { code } = splitObjectiveText(
              obj.text,
              `${kraNumber(kra)}.${i + 1}`,
            );
            const isSel = id(obj.id) === id(sel.objId);
            const prog = objectiveProgress(kra, obj);
            const canEdit = isSel && !kra.locked;
            const tip =
              (prog.state === "done"
                ? "Complete"
                : `${PROGRESS_LABELS[prog.state]} (${prog.done}/${prog.total}). Still needed: ${prog.missing.join(", ")}`) +
              (canEdit ? ". Click again to edit this objective." : "");
            html += `
          <button type="button" class="eopcrf1-nv-obj${isSel ? " is-active" : ""}" data-action="select-obj" data-kra-id="${kra.id}" data-obj-id="${obj.id}" title="${escapeHtml(tip)}"${isSel ? ' aria-current="true"' : ""}>
            <i class="eopcrf1-nv-dot is-${prog.state}" aria-hidden="true"></i>
            <span class="eopcrf1-nv-obj-name">Objective ${escapeHtml(code)}</span>
            <span class="eopcrf1-nv-obj-meta">${fmtWeight(obj.weight)} &middot; ${prog.done}/${prog.total}</span>${
              canEdit
                ? `<span class="eopcrf1-nv-obj-edit" aria-hidden="true">${ICON_EDIT}</span>`
                : ""
            }
          </button>`;
          });
          html += "</div>";
        }
      }
      html += "</div>";
    });
    html += "</div>";
    listEl.innerHTML = html;
  }

  // ================= Render: editor =================
  // Red asterisk shown beside a label while its field is still empty.
  const reqMark = (isEmpty) =>
    isEmpty
      ? '<span class="eopcrf1-req" title="Required" aria-label="Required">*</span>'
      : "";

  // Tabler icon helper (the page already loads Tabler Icons).
  const ti = (name) => `<i class="ti ti-${name}" aria-hidden="true"></i>`;
  const chip = (tone, html) =>
    `<span class="eopcrf1-chip eopcrf1-chip--${tone}">${html}</span>`;

  // Label + value pair used inside the cards. `labelHtml` may carry a button.
  const kv = (labelHtml, valueHtml, cls) =>
    `<div class="eopcrf1-kv${cls ? " " + cls : ""}"><div class="eopcrf1-kv-label">${labelHtml}</div><div class="eopcrf1-kv-value">${valueHtml}</div></div>`;
  const textOrDash = (v) =>
    v ? escapeHtml(v) : '<span class="eopcrf1-muted">—</span>';
  const numValue = (v) => {
    const t = v === null || v === undefined ? "" : String(v).trim();
    if (!t || t === "—") return '<span class="eopcrf1-muted">—</span>';
    return `<span class="eopcrf1-num${t.length > 14 ? " is-long" : ""}">${escapeHtml(t)}</span>`;
  };
  const card = (mod, title, status, body, footer = "") => `
    <section class="eopcrf1-card eopcrf1-card--${mod}">
      <div class="eopcrf1-card-head">
        <h4>${title}</h4>
        <span class="eopcrf1-card-status">${status}</span>
      </div>
      <div class="eopcrf1-card-body">${body}</div>${footer}
    </section>`;

  // Context strip: which KRA this objective belongs to, and its weight.
  // Program alignment (Part I-A) is a label/value list inside a fold.
  function renderKraSection(kra, alignOpen) {
    const row = (label, value) =>
      `<div class="eopcrf1-align-row"><dt>${label}</dt><dd>${textOrDash(value)}</dd></div>`;
    const align =
      kra.part === "a"
        ? `<details class="eopcrf1-align"${alignOpen ? " open data-forced" : view.alignOpen ? " open" : ""}>
             <summary>${ti("chevron-right")}Program alignment</summary>
             <dl class="eopcrf1-align-list">
               ${row("GAA programs / subprograms", kra.gaaProgram)}
               ${row("BEDP pillars", kra.bedpPillars)}
               ${row("Current administration agenda", kra.adminAgenda)}
             </dl>
           </details>`
        : "";
    return `
      <section class="eopcrf1-ctx" aria-label="${kra.part === "c" ? "Area" : "Key result area"}">
        <div class="eopcrf1-ctx-row">
          <span class="eopcrf1-ctx-tag">${kraWord(kra)} ${kraNumber(kra)}</span>
          <span class="eopcrf1-ctx-text">${kra.text ? escapeHtml(kra.text) : '<span class="eopcrf1-muted">Untitled KRA</span>'}</span>
          <div class="eopcrf1-wt" title="Weight of this ${kraWord(kra)}"><b>${escapeHtml(fmtWeight(kra.weight))}</b><span>weight</span></div>
        </div>
        ${align}
      </section>`;
  }

  function renderLevelRow(obj, cat, level, selectedRate, locked) {
    const item = obj[cat.key].find((i) => i.rate === level.n);
    const isSel = selectedRate === level.n;
    // A level with no descriptor can't be rated. (A stale rating already on
    // such a level stays clickable so it can be cleared.)
    const hasText = !!(
      item &&
      typeof item.label === "string" &&
      item.label.trim()
    );
    const pickable = hasText || isSel;
    let actions = "";
    if (!locked) {
      actions = item
        ? `<span class="eopcrf1-level-actions is-quiet">
             <button type="button" class="eopcrf1-icon-btn" data-action="edit-rubric" data-category="${cat.key}" data-item-id="${item.id}" title="Edit descriptor">${ICON_EDIT}</button>
             <button type="button" class="eopcrf1-icon-btn eopcrf1-icon-btn--danger" data-action="delete-rubric" data-category="${cat.key}" data-item-id="${item.id}" title="Remove descriptor">${ICON_TRASH}</button>
           </span>`
        : `<span class="eopcrf1-level-actions"><button type="button" class="eopcrf1-btn eopcrf1-btn--ghost eopcrf1-btn--sm" data-action="add-rubric" data-category="${cat.key}" data-level="${level.n}">${ICON_PLUS}Add descriptor</button></span>`;
    }
    return `
      <div class="eopcrf1-level eopcrf1-level--${level.n}${isSel ? " is-selected" : ""}${pickable ? "" : " is-disabled"}" role="radio" aria-checked="${isSel}" ${pickable ? 'tabindex="0" data-action="pick-level"' : 'tabindex="-1" aria-disabled="true"'} data-category="${cat.key}" data-level="${level.n}" title="${isSel ? "Click to clear this rating" : pickable ? `Rate ${cat.label.toLowerCase()} ${level.n}` : "No descriptor for this level, so it can't be rated"}">
        <span class="eopcrf1-level-num">${level.n}</span>
        <span class="eopcrf1-level-name">${level.name}</span>
        <span class="eopcrf1-level-text">${item ? escapeHtml(item.label) : '<span class="eopcrf1-muted">No descriptor for this level</span>'}</span>
        ${actions}
      </div>`;
  }

  function renderCategory(obj, cat, locked) {
    const raw = obj.ratings[cat.key];
    const selectedRate = hasVal(raw) ? Number(raw) : null;
    const applicable = hasDescriptors(obj, cat.key);
    const collapsed = view.catOff.has(cat.key);
    const status =
      selectedRate !== null
        ? chip("ok", `${selectedRate} · ${levelName(selectedRate)}`)
        : applicable
          ? chip("warn", `Not rated${reqMark(true)}`)
          : chip("muted", locked ? "Not applicable" : "No descriptors yet");
    return `
      <div class="eopcrf1-cat eopcrf1-cat--${cat.key}${collapsed ? " is-collapsed" : ""}">
        <button type="button" class="eopcrf1-cat-toggle" data-action="toggle-cat" data-category="${cat.key}" aria-expanded="${!collapsed}">
          <span class="eopcrf1-cat-chev">${ti("chevron-down")}</span>
          <span class="eopcrf1-cat-name">${cat.label}</span>
          ${status}
        </button>
        <div class="eopcrf1-levels" role="radiogroup" aria-label="${cat.label} rating">
          ${LEVELS.map((l) => renderLevelRow(obj, cat, l, selectedRate, locked)).join("")}
        </div>
      </div>`;
  }

  // ---- MOV link: same strip and behaviour as the AIP page ----
  const MOV_MAX = 2000;

  function normalizeMovUrl(raw) {
    let v = String(raw || "").trim();
    if (!v) return { error: "Paste the link to your evidence." };
    if (/\s/.test(v)) return { error: "A link can\u2019t contain spaces." };
    if (/^[a-z][a-z0-9+.-]*:(?!\/\/|\d)/i.test(v))
      return { error: "Use a link that starts with http:// or https://." };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = "https://" + v;
    let u;
    try {
      u = new URL(v);
    } catch (e) {
      return { error: "That doesn\u2019t look like a valid link." };
    }
    if (u.protocol !== "http:" && u.protocol !== "https:")
      return { error: "Use a link that starts with http:// or https://." };
    if (!u.hostname.includes(".") && u.hostname !== "localhost")
      return { error: "That doesn\u2019t look like a valid link." };
    if (v.length > MOV_MAX)
      return {
        error: "That link is too long (max " + MOV_MAX + " characters).",
      };
    return { url: v };
  }

  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch (e) {
      return url;
    }
  }

  function renderMovLink(obj) {
    const link = obj.mov || "";
    const mode = id(view.movObjId) === id(obj.id) ? view.movMode : null;
    const label = '<span class="eopcrf1-mov-label">MOV link</span>';
    if (!link || mode === "edit") {
      return `
        <div class="eopcrf1-mov${link ? "" : " is-empty"}">
          ${label}
          <input type="text" inputmode="url" class="eopcrf1-mov-input" value="${escapeHtml(link)}"
                 placeholder="Paste the MOV link" autocomplete="off" spellcheck="false"
                 aria-label="MOV link for this objective" />
          <button type="button" class="eopcrf1-mov-btn eopcrf1-mov-btn--primary" data-action="mov-save"${link ? "" : " disabled"}>${link ? "Save" : "Attach"}</button>
          ${link ? '<button type="button" class="eopcrf1-mov-btn" data-action="mov-cancel">Cancel</button>' : ""}
          <span class="eopcrf1-mov-err" role="alert" hidden></span>
        </div>`;
    }
    const host = hostOf(link);
    const safe = /^https?:\/\//i.test(link);
    const inner = `
      <span class="eopcrf1-mov-ico">${ti("link")}</span>
      <span class="eopcrf1-mov-host">${escapeHtml(host)}</span>
      ${safe ? `<span class="eopcrf1-mov-ext">${ti("external-link")}</span>` : ""}`;
    const tile = safe
      ? `<a class="eopcrf1-mov-tile" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link)}" aria-label="Open MOV link: ${escapeHtml(host)} (opens in a new tab)">${inner}</a>`
      : `<span class="eopcrf1-mov-tile" title="${escapeHtml(link)}">${inner}</span>`;
    const actions =
      mode === "confirm"
        ? `<span class="eopcrf1-mov-ask">Remove this link?</span>
           <button type="button" class="eopcrf1-mov-btn eopcrf1-mov-btn--danger" data-action="mov-remove-yes">Remove</button>
           <button type="button" class="eopcrf1-mov-btn" data-action="mov-remove-no">Keep</button>`
        : `<span class="eopcrf1-mov-tools">
             <button type="button" class="eopcrf1-mov-icon" data-action="mov-edit" aria-label="Edit MOV link" title="Edit link">${ti("pencil")}</button>
             <button type="button" class="eopcrf1-mov-icon eopcrf1-mov-icon--danger" data-action="mov-remove" aria-label="Remove MOV link" title="Remove link">${ti("trash")}</button>
           </span>`;
    return `<div class="eopcrf1-mov">${label}${tile}${actions}</div>`;
  }

  // Objective body: context strip, then Plan, Rate and Evidence cards.
  function renderObjectiveBody(kra, obj) {
    const locked = !!kra.locked;
    const timelineEmpty = !obj.timeline || !String(obj.timeline).trim();
    const actualEmpty = !obj.actualResults || !String(obj.actualResults).trim();

    const timelineLabel = `<span>Timeline${reqMark(timelineEmpty)}</span>${
      timelineEmpty
        ? ""
        : `<button type="button" class="eopcrf1-mini" data-action="edit-timeline">Edit</button>`
    }`;
    const timelineValue = timelineEmpty
      ? `<button type="button" class="eopcrf1-mini eopcrf1-mini--primary" data-action="edit-timeline">Add timeline</button>`
      : `<span class="eopcrf1-strong">${escapeHtml(obj.timeline)}</span>`;
    const plan = card(
      "plan",
      "Plan",
      timelineEmpty ? chip("warn", "Timeline needed") : chip("ok", "Complete"),
      `<div class="eopcrf1-plan">
         ${kv(timelineLabel, timelineValue)}
         ${kv(`<span>Weight</span>`, numValue(fmtWeight(obj.weight)))}
         ${kv(`<span>Target value</span>`, numValue(obj.targetValue))}
         ${kv(`<span>Target description</span>`, textOrDash(obj.targetDescription), "eopcrf1-kv--wide")}
       </div>`,
    );

    const applicable = INDICATOR_CATEGORIES.filter((c) =>
      hasDescriptors(obj, c.key),
    );
    const rated = applicable.filter((c) => hasVal(obj.ratings[c.key])).length;
    const rateStatus = !applicable.length
      ? chip("muted", "No measures yet")
      : rated === applicable.length
        ? chip("ok", "All rated")
        : chip("info", `${rated} of ${applicable.length} rated`);
    const rate = card(
      "rate",
      "Rate performance",
      rateStatus,
      INDICATOR_CATEGORIES.map((c) => renderCategory(obj, c, locked)).join(""),
    );

    const proof = card(
      "proof",
      "Evidence",
      actualEmpty
        ? chip("warn", "Accomplishments needed")
        : chip("ok", "Complete"),
      `<div class="eopcrf1-evidence">
         <div class="eopcrf1-kv">
           <div class="eopcrf1-kv-label"><span>Means of verification</span></div>
           <div class="eopcrf1-box${obj.movRequired ? "" : " is-empty"}">${obj.movRequired ? escapeHtml(obj.movRequired) : "No MOVs listed for this objective."}</div>
         </div>
         <div class="eopcrf1-kv">
           <div class="eopcrf1-kv-label"><span>Actual accomplishments${reqMark(actualEmpty)}</span><button type="button" class="eopcrf1-mini${actualEmpty ? " eopcrf1-mini--primary" : ""}" data-action="edit-actual">${actualEmpty ? "Add" : "Edit"}</button></div>
           <div class="eopcrf1-box${actualEmpty ? " is-empty" : ""}">${actualEmpty ? "No accomplishments recorded yet." : escapeHtml(obj.actualResults)}</div>
         </div>
       </div>`,
      renderMovLink(obj),
    );

    return renderKraSection(kra) + plan + rate + proof;
  }

  function renderEditor(kras) {
    const kra = kras.find((k) => id(k.id) === id(sel.kraId));
    if (!kra) {
      editorEl.innerHTML = `
        <div class="eopcrf1-ed-head"><div class="eopcrf1-ed-title"><span class="eopcrf1-ed-name">Nothing selected</span></div></div>
        <div class="eopcrf1-ed-body"><div class="eopcrf1-empty-inline"><p>Pick an objective from the list. In Part I-B you can add your own KRAs with <strong>Add KRA</strong>.</p></div></div>`;
      return;
    }
    const part = PARTS.find((p) => p.key === kra.part);
    const obj = sel.objId !== null ? findObjective(kra.id, sel.objId) : null;

    if (!obj) {
      const edit = kra.locked
        ? ""
        : `<button type="button" class="eopcrf1-ed-del" data-action="edit-kra" data-kra-id="${kra.id}"><i class="ti ti-pencil" aria-hidden="true"></i> Edit KRA</button>`;
      editorEl.innerHTML = `
        <div class="eopcrf1-ed-head">
          <div class="eopcrf1-ed-title">
            <span class="eopcrf1-ed-cat">${part.label} &middot; ${escapeHtml(part.full)}</span>
            <span class="eopcrf1-ed-name">${kraWord(kra)} ${kraNumber(kra)} &middot; ${kra.text ? escapeHtml(kra.text) : "Untitled KRA"}</span>
          </div>
          <span class="eopcrf1-ed-actions">${edit}</span>
        </div>
        <div class="eopcrf1-ed-body">
          ${renderKraSection(kra, true)}
          ${
            kra.locked
              ? ""
              : `<div class="eopcrf1-empty-inline"><p>This KRA has no objectives yet.</p><button type="button" class="eopcrf1-btn eopcrf1-btn--primary" data-action="add-objective" data-kra-id="${kra.id}">${ICON_PLUS}Add objective</button></div>`
          }
        </div>`;
      return;
    }

    const objIndex = kra.objectives.findIndex((o) => id(o.id) === id(obj.id));
    const { code, title } = splitObjectiveText(
      obj.text,
      `${kraNumber(kra)}.${objIndex + 1}`,
    );
    const asking =
      confirmClearObjId !== null && id(confirmClearObjId) === id(obj.id);
    const actions = asking
      ? `<span class="eopcrf1-ed-ask">Clear this objective?</span>
         <button type="button" class="eopcrf1-ed-del eopcrf1-ed-del--confirm" data-action="clear-yes">Clear</button>
         <button type="button" class="eopcrf1-ed-del" data-action="clear-no">Keep</button>`
      : `${
          kra.locked
            ? ""
            : `<button type="button" class="eopcrf1-ed-del" data-action="edit-objective"><i class="ti ti-pencil" aria-hidden="true"></i> Edit</button>
               <button type="button" class="eopcrf1-ed-del" data-action="delete-objective"><i class="ti ti-trash" aria-hidden="true"></i> Delete</button>`
        }<button type="button" class="eopcrf1-ed-del" data-action="clear"><i class="ti ti-eraser" aria-hidden="true"></i> Clear objective</button>`;
    editorEl.innerHTML = `
      <div class="eopcrf1-ed-head">
        <div class="eopcrf1-ed-title">
          <span class="eopcrf1-ed-cat">${kraWord(kra)} ${kraNumber(kra)} &middot; Objective ${escapeHtml(code)}</span>
          <span class="eopcrf1-ed-name" title="${escapeHtml(title || "")}">${title ? escapeHtml(title) : "Untitled objective"}</span>
        </div>
        <span class="eopcrf1-ed-actions">${actions}</span>
      </div>
      <div class="eopcrf1-ed-body">${renderObjectiveBody(kra, obj)}</div>`;
  }

  // Remember whether the user opened Program alignment, so it stays put while
  // they rate. (The KRA-only view forces it open and is not remembered.)
  editorEl.addEventListener(
    "toggle",
    (e) => {
      const d = e.target;
      if (
        d.matches &&
        d.matches(".eopcrf1-align") &&
        !d.hasAttribute("data-forced")
      )
        view.alignOpen = d.open;
    },
    true,
  );

  // ================= Render: all =================
  function render() {
    const kras = orderedKras();
    ensureSelection(kras);
    if (id(view.movObjId) !== id(sel.objId)) view.movMode = null;
    renderProgress(kras);
    renderList(kras);
    renderEditor(kras);
  }

  // ================= Delete confirmation dialog =================
  const delOverlay = document.getElementById("eopcrf1-del-overlay");
  const delTitle = document.getElementById("eopcrf1-del-title");
  const delBody = document.getElementById("eopcrf1-del-body");
  const delOk = document.getElementById("eopcrf1-del-ok");
  const delCancel = document.getElementById("eopcrf1-del-cancel");
  function askConfirm({ title, body, okLabel }) {
    return new Promise((resolve) => {
      delTitle.textContent = title;
      delBody.textContent = body;
      delOk.textContent = okLabel;
      delOverlay.classList.add("visible");
      const finish = (v) => {
        delOverlay.classList.remove("visible");
        delOk.onclick = delCancel.onclick = null;
        document.removeEventListener("keydown", onKey);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") finish(false);
      };
      document.addEventListener("keydown", onKey);
      delOk.onclick = () => finish(true);
      delCancel.onclick = () => finish(false);
      delCancel.focus(); // safe default: Enter cancels
    });
  }

  // Confirm, then delete one objective. Used by the editor header button and
  // by the Delete button inside the edit form. Returns true when it was deleted.
  async function deleteObjective(kraId, objId) {
    const kra = findKra(kraId);
    const obj = findObjective(kraId, objId);
    if (!kra || !obj) return false;
    const code = splitObjectiveText(obj.text, "").code || "";
    const ok = await askConfirm({
      title: `Delete objective ${code}?`.replace(" ?", "?"),
      body: `"${obj.text || "This objective"}" and its ratings, timeline and MOV link will be removed. This cannot be undone.`,
      okLabel: "Delete objective",
    });
    if (!ok) return false;
    try {
      await apiCall("DELETE", `/irc/eopcrf1/objective/${objId}`);
      kra.objectives = kra.objectives.filter((o) => id(o.id) !== id(objId));
      if (id(sel.objId) === id(objId)) sel.objId = null;
      render();
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  }

  // ================= Progress panel events =================
  segsEl.addEventListener("click", (e) => {
    const seg = e.target.closest(".eopcrf1-seg[data-kra-id]");
    if (!seg) return;
    const kra = findKra(seg.dataset.kraId);
    if (!kra) return;
    sel.kraId = kra.id;
    sel.objId = kra.objectives.length ? kra.objectives[0].id : null;
    render();
    workspaceEl.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  nextBtn.addEventListener("click", () => {
    const all = [];
    orderedKras().forEach((k) =>
      k.objectives.forEach((o) => all.push({ k, o })),
    );
    if (!all.length) return;
    const start = all.findIndex(
      (x) => id(x.k.id) === id(sel.kraId) && id(x.o.id) === id(sel.objId),
    );
    for (let step = 1; step <= all.length; step++) {
      const x = all[(start + step + all.length) % all.length];
      if (objectiveProgress(x.k, x.o).state !== "done") {
        sel.kraId = x.k.id;
        sel.objId = x.o.id;
        render();
        workspaceEl.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
    }
  });

  // ================= Modal control =================
  let modalCtx = null; // { mode, kraId, objId, category, itemId, level }
  let extraDefs = [];

  function setExtraFields(defs) {
    extraDefs = defs;
    extraFieldsEl.innerHTML = defs
      .map((d) => {
        const idAttr = `eopcrf1-x-${d.key}`;
        const control =
          d.type === "textarea"
            ? `<textarea id="${idAttr}" class="eopcrf1-input" rows="2" placeholder="${escapeHtml(d.placeholder || "")}"></textarea>`
            : `<input type="text" id="${idAttr}" class="eopcrf1-input" placeholder="${escapeHtml(d.placeholder || "")}" />`;
        return `<div class="eopcrf1-field-group"><label class="eopcrf1-label" for="${idAttr}">${escapeHtml(d.label)}</label>${control}</div>`;
      })
      .join("");
    defs.forEach((d) => {
      document.getElementById(`eopcrf1-x-${d.key}`).value = d.value || "";
    });
  }
  const extraVal = (key) =>
    document.getElementById(`eopcrf1-x-${key}`).value.trim();

  function resetModalFields() {
    fieldPrimaryWrap.style.display = "none";
    fieldRateWrap.style.display = "none";
    fieldWeightWrap.style.display = "none";
    primaryInput.value = "";
    weightInput.value = "";
    rateSelect.innerHTML = "";
    setExtraFields([]);
  }

  function populateRateOptions(existingRates, currentRate, preferred) {
    rateSelect.innerHTML = "";
    for (let r = 5; r >= 1; r--) {
      if (existingRates.includes(r) && r !== currentRate) continue;
      const opt = document.createElement("option");
      opt.value = String(r);
      opt.textContent = `${r} · ${levelName(r)}`;
      rateSelect.appendChild(opt);
    }
    const want = currentRate || preferred;
    rateSelect.value = want ? String(want) : rateSelect.options[0]?.value || "";
  }

  function openModal(ctx) {
    modalCtx = ctx;
    resetModalFields();
    modalHint.textContent = "";
    modalDelete.style.display = ctx.mode === "edit-objective" ? "" : "none";

    if (ctx.mode === "add-kra" || ctx.mode === "edit-kra") {
      const isEdit = ctx.mode === "edit-kra";
      const kra = isEdit ? findKra(ctx.kraId) : null;
      modalTitle.textContent = isEdit ? "Edit KRA" : "Add KRA";
      fieldPrimaryWrap.style.display = "block";
      fieldPrimaryLabel.textContent = "KRA description";
      fieldWeightWrap.style.display = "block";
      fieldWeightLabel.textContent = "Weight (%). Part I-B should total 20%";
      if (isEdit && kra) {
        primaryInput.value = kra.text || "";
        weightInput.value = kra.weight ?? "";
      }
    } else if (ctx.mode === "add-objective" || ctx.mode === "edit-objective") {
      const isEdit = ctx.mode === "edit-objective";
      const obj = isEdit ? findObjective(ctx.kraId, ctx.objId) : null;
      modalTitle.textContent = isEdit ? "Edit objective" : "Add objective";
      fieldPrimaryWrap.style.display = "block";
      fieldPrimaryLabel.textContent = "Objective description";
      primaryInput.placeholder = "Describe the objective...";
      fieldWeightWrap.style.display = "block";
      fieldWeightLabel.textContent = "Weight (%)";
      if (isEdit && obj) {
        primaryInput.value = obj.text || "";
        weightInput.value = obj.weight ?? "";
      }
      setExtraFields([
        {
          key: "targetValue",
          label: "Target value (optional)",
          type: "text",
          placeholder: "e.g. 100%",
          value: obj ? obj.targetValue : "",
        },
        {
          key: "targetDescription",
          label: "Target description (optional)",
          type: "textarea",
          placeholder: "Expected outcome, output or service",
          value: obj ? obj.targetDescription : "",
        },
        {
          key: "movRequired",
          label: "Means of verification (optional)",
          type: "textarea",
          placeholder: "Documents that prove this objective",
          value: obj ? obj.movRequired : "",
        },
      ]);
    } else if (ctx.mode === "add-rubric" || ctx.mode === "edit-rubric") {
      const isEdit = ctx.mode === "edit-rubric";
      const obj = findObjective(ctx.kraId, ctx.objId);
      const catLabel = INDICATOR_CATEGORIES.find(
        (c) => c.key === ctx.category,
      ).label;
      const existing = obj[ctx.category];
      const item = isEdit
        ? existing.find((i) => id(i.id) === id(ctx.itemId))
        : null;
      modalTitle.textContent =
        (isEdit ? "Edit " : "Add ") + catLabel.toLowerCase() + " descriptor";
      modalHint.textContent =
        "Choose the rating level, then describe what earns it.";
      fieldRateWrap.style.display = "block";
      populateRateOptions(
        existing.map((i) => i.rate),
        item ? item.rate : null,
        ctx.level,
      );
      fieldPrimaryWrap.style.display = "block";
      fieldPrimaryLabel.textContent = "Descriptor";
      primaryInput.placeholder =
        "What must be accomplished for this rating level...";
      if (isEdit && item) primaryInput.value = item.label || "";
    } else if (ctx.mode === "edit-actual") {
      const obj = findObjective(ctx.kraId, ctx.objId);
      modalTitle.textContent = "Edit actual accomplishments";
      fieldPrimaryWrap.style.display = "block";
      fieldPrimaryLabel.textContent = "Actual accomplishments";
      primaryInput.placeholder = "Describe what was actually accomplished...";
      primaryInput.value = obj.actualResults || "";
    } else if (ctx.mode === "edit-timeline") {
      const obj = findObjective(ctx.kraId, ctx.objId);
      modalTitle.textContent = "Edit timeline";
      fieldPrimaryWrap.style.display = "block";
      fieldPrimaryLabel.textContent = "Timeline";
      primaryInput.placeholder = "e.g. SY 2025-2026";
      primaryInput.value = obj.timeline || "";
    }

    modal.style.display = "flex";
    primaryInput.focus();
  }

  function closeModal() {
    modal.style.display = "none";
    modalCtx = null;
  }

  modalClose.addEventListener("click", closeModal);
  modalCancel.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (delOverlay.classList.contains("visible")) return; // the confirm handles it
    if (modal.style.display !== "none") closeModal();
    else if (resetConfirmOverlay.classList.contains("visible"))
      closeResetConfirm();
  });
  modal
    .querySelector(".eopcrf1-modal-content")
    .addEventListener("click", (e) => e.stopPropagation());

  function parseWeightInput() {
    const raw = weightInput.value.trim();
    if (raw === "") return { ok: true, weight: null };
    const weight = parseFloat(raw);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      alert("Weight must be a number between 0 and 100.");
      return { ok: false };
    }
    return { ok: true, weight };
  }

  modalSubmit.addEventListener("click", async () => {
    if (!modalCtx) return;
    const mode = modalCtx.mode;
    modalSubmit.disabled = true;
    try {
      if (mode === "add-kra" || mode === "edit-kra") {
        const text = primaryInput.value.trim();
        if (!text) return alert("Please describe the KRA.");
        const w = parseWeightInput();
        if (!w.ok) return;
        const body = {
          text,
          weight: w.weight,
        };
        if (mode === "edit-kra") body.id = modalCtx.kraId;
        else body.year = state.year;
        const kra = await apiCall("POST", "/irc/eopcrf1/kra", body);
        if (mode === "add-kra") {
          state.kras.push(kra);
          sel.kraId = kra.id;
          sel.objId = null;
        } else {
          const idx = state.kras.findIndex((k) => id(k.id) === id(kra.id));
          if (idx !== -1) state.kras[idx] = kra;
        }
      } else if (mode === "add-objective" || mode === "edit-objective") {
        const text = primaryInput.value.trim();
        if (!text) return alert("Please describe the objective.");
        const w = parseWeightInput();
        if (!w.ok) return;
        const body = {
          text,
          weight: w.weight,
          targetValue: extraVal("targetValue"),
          targetDescription: extraVal("targetDescription"),
          movRequired: extraVal("movRequired"),
        };
        if (mode === "edit-objective") body.id = modalCtx.objId;
        else body.kraId = modalCtx.kraId;
        const obj = await apiCall("POST", "/irc/eopcrf1/objective", body);
        upsertObjective(obj);
        if (mode === "add-objective") {
          sel.kraId = obj.kraId;
          sel.objId = obj.id;
        }
      } else if (mode === "add-rubric" || mode === "edit-rubric") {
        const label = primaryInput.value.trim();
        const rate = parseInt(rateSelect.value, 10);
        if (!label) return alert("Please describe this rating level.");
        if (!rate) return alert("Please select a rating level.");
        const body = {
          objectiveId: modalCtx.objId,
          category: modalCtx.category,
          rate,
          label,
        };
        if (mode === "edit-rubric") body.id = modalCtx.itemId;
        const item = await apiCall("POST", "/irc/eopcrf1/indicator", body);
        upsertIndicator(
          modalCtx.kraId,
          modalCtx.objId,
          modalCtx.category,
          item,
        );
      } else if (mode === "edit-actual") {
        upsertObjective(
          await apiCall(
            "POST",
            `/irc/eopcrf1/objective/${modalCtx.objId}/actual-results`,
            { text: primaryInput.value.trim() },
          ),
        );
      } else if (mode === "edit-timeline") {
        upsertObjective(
          await apiCall(
            "POST",
            `/irc/eopcrf1/objective/${modalCtx.objId}/timeline`,
            { text: primaryInput.value.trim() },
          ),
        );
      }
      closeModal();
      render();
    } catch (err) {
      alert(err.message);
    } finally {
      modalSubmit.disabled = false;
    }
  });

  modalDelete.addEventListener("click", async () => {
    if (!modalCtx || modalCtx.mode !== "edit-objective") return;
    const { kraId, objId } = modalCtx;
    modalDelete.disabled = true;
    modalSubmit.disabled = true;
    try {
      if (await deleteObjective(kraId, objId)) closeModal();
    } finally {
      modalDelete.disabled = false;
      modalSubmit.disabled = false;
    }
  });

  // ================= Reset =================
  const PART_NAMES = { a: "Part I-A", b: "Part I-B", c: "Part I-C" };
  const getSelectedResetParts = () =>
    Array.from(resetPartChecks)
      .filter((c) => c.checked)
      .map((c) => c.value);
  const getBResetScope = () => {
    const checked = document.querySelector(
      'input[name="eopcrf1-reset-b-scope"]:checked',
    );
    return checked ? checked.value : "data";
  };

  function updateResetUi() {
    const parts = getSelectedResetParts();
    const bSelected = parts.includes("b");
    resetBOptions.style.display = bSelected ? "flex" : "none";
    resetConfirmConfirmBtn.disabled = parts.length === 0;

    if (!parts.length) {
      resetConfirmWarning.textContent = "Select at least one part to reset.";
      resetConfirmWarning.classList.remove("eopcrf1-reset-warning--danger");
      return;
    }
    const names = parts.map((p) => PART_NAMES[p]).join(", ");
    const removeKras = bSelected && getBResetScope() === "all";
    resetConfirmWarning.textContent = removeKras
      ? `This clears the ratings, timeline, MOV links and actual accomplishments of ${names}, and removes every KRA, objective and indicator you added in Part I-B. This cannot be undone.`
      : `This clears the ratings, timeline, MOV links and actual accomplishments of ${names}. KRAs, objectives and weights are kept. This cannot be undone.`;
    resetConfirmWarning.classList.toggle(
      "eopcrf1-reset-warning--danger",
      removeKras,
    );
  }
  resetPartChecks.forEach((c) => c.addEventListener("change", updateResetUi));
  resetBScopeRadios.forEach((r) => r.addEventListener("change", updateResetUi));

  function openResetConfirm() {
    resetPartChecks.forEach((c) => (c.checked = false));
    document.querySelector(
      'input[name="eopcrf1-reset-b-scope"][value="data"]',
    ).checked = true;
    updateResetUi();
    resetConfirmOverlay.classList.add("visible");
  }
  function closeResetConfirm() {
    resetConfirmOverlay.classList.remove("visible");
  }

  function applyResetInPlace(parts, removePartBKras) {
    if (removePartBKras) {
      state.kras = state.kras.filter((k) => k.part !== "b");
    }
    state.kras.forEach((kra) => {
      if (!parts.includes(kra.part)) return;
      kra.objectives.forEach((obj) => {
        obj.ratings = { quality: null, efficiency: null, timeliness: null };
        obj.mov = null;
        obj.actualResults = null;
        obj.timeline = null;
        obj.average = null;
        obj.score = null;
      });
    });
    render();
  }

  resetBtn.addEventListener("click", openResetConfirm);
  resetConfirmCancelBtn.addEventListener("click", closeResetConfirm);
  resetConfirmOverlay.addEventListener("click", (e) => {
    if (e.target === resetConfirmOverlay) closeResetConfirm();
  });
  resetConfirmConfirmBtn.addEventListener("click", async () => {
    const parts = getSelectedResetParts();
    if (!parts.length) return;
    const removeKras = parts.includes("b") && getBResetScope() === "all";
    resetConfirmConfirmBtn.disabled = true;
    try {
      let url = `/irc/eopcrf1/reset?parts=${parts.join(",")}&year=${state.year}`;
      if (parts.includes("b")) url += `&partB=${removeKras ? "all" : "data"}`;
      await apiCall("DELETE", url);
      applyResetInPlace(parts, removeKras);
      closeResetConfirm();
    } catch (err) {
      alert(err.message || "Could not reset the data. Please try again.");
    } finally {
      updateResetUi();
    }
  });

  // ================= Delegated clicks (sidebar + detail) =================
  async function setRating(objId, category, rating, kraId) {
    try {
      const updated = await apiCall(
        "POST",
        `/irc/eopcrf1/objective/${objId}/rating`,
        { category, rating },
      );
      upsertObjective(updated);
    } catch (err) {
      alert(err.message);
    }
    render();
  }

  // Clears everything entered on one objective (ratings, timeline, MOV link,
  // actual accomplishments). The objective itself is kept.
  async function clearObjective(kraId, objId) {
    const obj = findObjective(kraId, objId);
    if (!obj) return;
    const base = `/irc/eopcrf1/objective/${objId}`;
    try {
      for (const c of INDICATOR_CATEGORIES) {
        if (hasVal(obj.ratings && obj.ratings[c.key]))
          upsertObjective(
            await apiCall("POST", `${base}/rating`, {
              category: c.key,
              rating: null,
            }),
          );
      }
      if (obj.mov)
        upsertObjective(await apiCall("POST", `${base}/mov`, { url: "" }));
      if (obj.actualResults)
        upsertObjective(
          await apiCall("POST", `${base}/actual-results`, { text: "" }),
        );
      if (obj.timeline)
        upsertObjective(
          await apiCall("POST", `${base}/timeline`, { text: "" }),
        );
    } catch (err) {
      alert(err.message);
    }
    render();
  }

  // ---- MOV strip: re-render just the strip, never the whole editor ----
  function renderMovOnly() {
    const obj = findObjective(sel.kraId, sel.objId);
    const old = editorEl.querySelector(".eopcrf1-mov");
    if (!obj || !old) return null;
    old.outerHTML = renderMovLink(obj);
    return editorEl.querySelector(".eopcrf1-mov");
  }

  function setMovMode(objId, mode, focusSel, selectText) {
    view.movObjId = objId;
    view.movMode = mode;
    const strip = renderMovOnly();
    const target = strip && focusSel ? strip.querySelector(focusSel) : null;
    if (target) {
      target.focus();
      if (selectText && target.select) target.select();
    }
  }

  function showMovError(strip, msg) {
    const err = strip.querySelector(".eopcrf1-mov-err");
    const input = strip.querySelector(".eopcrf1-mov-input");
    if (!err || !input) return;
    err.textContent = msg;
    err.hidden = !msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  async function setMov(objId, value) {
    const strip = editorEl.querySelector(".eopcrf1-mov");
    try {
      upsertObjective(
        await apiCall("POST", `/irc/eopcrf1/objective/${objId}/mov`, {
          url: value,
        }),
      );
    } catch (err) {
      if (strip && strip.querySelector(".eopcrf1-mov-input"))
        showMovError(strip, err.message);
      else alert(err.message);
      return;
    }
    setMovMode(
      objId,
      null,
      value ? '[data-action="mov-edit"]' : ".eopcrf1-mov-input",
    );
  }

  async function commitMov(objId) {
    const strip = editorEl.querySelector(".eopcrf1-mov");
    const input = strip && strip.querySelector(".eopcrf1-mov-input");
    if (!input) return;
    const res = normalizeMovUrl(input.value);
    if (res.error) {
      showMovError(strip, res.error);
      input.focus();
      return;
    }
    const obj = findObjective(sel.kraId, objId);
    if (obj && res.url === obj.mov) {
      setMovMode(objId, null, '[data-action="mov-edit"]');
      return;
    }
    await setMov(objId, res.url);
  }

  editorEl.addEventListener("input", (e) => {
    const input = e.target.closest && e.target.closest(".eopcrf1-mov-input");
    if (!input) return;
    const strip = input.closest(".eopcrf1-mov");
    showMovError(strip, "");
    if (strip.classList.contains("is-empty"))
      strip.querySelector('[data-action="mov-save"]').disabled =
        !input.value.trim();
  });

  editorEl.addEventListener("keydown", (e) => {
    const input = e.target.closest && e.target.closest(".eopcrf1-mov-input");
    if (!input) return;
    if (e.key === "Enter") {
      e.preventDefault();
      commitMov(sel.objId);
    } else if (e.key === "Escape") {
      const strip = input.closest(".eopcrf1-mov");
      if (strip.classList.contains("is-empty")) return;
      e.preventDefault();
      setMovMode(sel.objId, null, '[data-action="mov-edit"]');
    }
  });

  workspaceEl.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (e.target.closest("a")) return; // let MOV links open

    const action = el.dataset.action;
    const kraId = el.dataset.kraId || (sel.kraId !== null ? sel.kraId : null);
    const objId = el.dataset.objId || (sel.objId !== null ? sel.objId : null);

    switch (action) {
      case "select-obj": {
        // Clicking the already-selected objective again opens its edit form.
        if (id(sel.kraId) === id(kraId) && id(sel.objId) === id(objId)) {
          const k = findKra(kraId);
          if (k && !k.locked)
            openModal({ mode: "edit-objective", kraId, objId });
          break;
        }
        sel.kraId = kraId;
        sel.objId = objId;
        render();
        // In the stacked (narrow) layout the detail sits below the list, so
        // bring it into view. On desktop it is already beside the list.
        if (
          window.matchMedia &&
          window.matchMedia("(max-width: 900px)").matches &&
          editorEl.scrollIntoView
        ) {
          editorEl.scrollIntoView({ block: "start" });
        }
        break;
      }
      case "select-kra": {
        const kra = findKra(kraId);
        sel.kraId = kraId;
        sel.objId = kra && kra.objectives.length ? kra.objectives[0].id : null;
        render();
        break;
      }
      case "select-part": {
        view.part = el.dataset.part;
        const first = orderedKras().find((k) => k.part === view.part);
        if (first) {
          sel.kraId = first.id;
          sel.objId = first.objectives.length ? first.objectives[0].id : null;
          view.collapsed = null;
        }
        render();
        break;
      }
      case "toggle-kra": {
        const kra = findKra(kraId);
        if (id(sel.kraId) === id(kraId) && id(view.collapsed) !== id(kraId)) {
          view.collapsed = kraId;
        } else {
          sel.kraId = kraId;
          sel.objId =
            kra && kra.objectives.length ? kra.objectives[0].id : null;
          view.collapsed = null;
        }
        render();
        break;
      }
      case "add-kra":
        openModal({ mode: "add-kra" });
        break;
      case "edit-kra":
        openModal({ mode: "edit-kra", kraId });
        break;
      case "delete-kra": {
        const kra = findKra(kraId);
        const nObj = kra.objectives.length;
        if (
          !(await askConfirm({
            title: `Delete ${kraWord(kra)} ${kraNumber(kra)} · ${kra.text || "Untitled KRA"}?`,
            body: nObj
              ? `This also removes its ${nObj} objective${nObj === 1 ? "" : "s"}, with all ratings, timelines and MOV links. This cannot be undone.`
              : "This cannot be undone.",
            okLabel: nObj
              ? `Delete KRA and ${nObj} objective${nObj === 1 ? "" : "s"}`
              : "Delete KRA",
          }))
        )
          return;
        try {
          await apiCall("DELETE", `/irc/eopcrf1/kra/${kraId}`);
          state.kras = state.kras.filter((k) => id(k.id) !== id(kraId));
          if (id(sel.kraId) === id(kraId)) {
            sel.kraId = null;
            sel.objId = null;
          }
          render();
        } catch (err) {
          alert(err.message);
        }
        break;
      }
      case "add-objective":
        openModal({ mode: "add-objective", kraId });
        break;
      case "edit-objective":
        openModal({ mode: "edit-objective", kraId, objId });
        break;
      case "delete-objective":
        await deleteObjective(kraId, objId);
        break;
      case "add-rubric":
        openModal({
          mode: "add-rubric",
          kraId,
          objId,
          category: el.dataset.category,
          level: parseInt(el.dataset.level, 10),
        });
        break;
      case "edit-rubric":
        openModal({
          mode: "edit-rubric",
          kraId,
          objId,
          category: el.dataset.category,
          itemId: el.dataset.itemId,
        });
        break;
      case "delete-rubric": {
        const obj = findObjective(kraId, objId);
        const category = el.dataset.category;
        if (!confirm("Remove this descriptor? This cannot be undone.")) return;
        try {
          await apiCall(
            "DELETE",
            `/irc/eopcrf1/indicator/${el.dataset.itemId}`,
          );
          // The selected rating is left as-is: it may have been set by hand
          // and the server never derives it from the descriptor list.
          obj[category] = obj[category].filter(
            (i) => id(i.id) !== id(el.dataset.itemId),
          );
          render();
        } catch (err) {
          alert(err.message);
        }
        break;
      }
      case "mov-save":
        await commitMov(objId);
        break;
      case "mov-cancel":
        setMovMode(objId, null, '[data-action="mov-edit"]');
        break;
      case "mov-edit":
        setMovMode(objId, "edit", ".eopcrf1-mov-input", true);
        break;
      case "mov-remove":
        setMovMode(objId, "confirm", '[data-action="mov-remove-no"]');
        break;
      case "mov-remove-no":
        setMovMode(objId, null, '[data-action="mov-remove"]');
        break;
      case "mov-remove-yes":
        await setMov(objId, "");
        break;
      case "edit-actual":
        openModal({ mode: "edit-actual", kraId, objId });
        break;
      case "edit-timeline":
        openModal({ mode: "edit-timeline", kraId, objId });
        break;
      case "toggle-cat": {
        const key = el.dataset.category;
        if (view.catOff.has(key)) view.catOff.delete(key);
        else view.catOff.add(key);
        render();
        const again = editorEl.querySelector(
          `[data-action="toggle-cat"][data-category="${key}"]`,
        );
        if (again) again.focus();
        break;
      }
      case "clear":
        confirmClearObjId = objId;
        render();
        break;
      case "clear-no":
        confirmClearObjId = null;
        render();
        break;
      case "clear-yes":
        confirmClearObjId = null;
        await clearObjective(kraId, objId);
        break;
      case "pick-level": {
        const obj = findObjective(kraId, objId);
        if (!obj) return;
        const category = el.dataset.category;
        const level = parseInt(el.dataset.level, 10);
        const current = hasVal(obj.ratings[category])
          ? Number(obj.ratings[category])
          : null;
        // Only levels that have a descriptor can be newly rated.
        if (
          current !== level &&
          !(obj[category] || []).some(
            (i) =>
              i.rate === level && typeof i.label === "string" && i.label.trim(),
          )
        )
          return;
        await setRating(
          objId,
          category,
          current === level ? null : level,
          kraId,
        );
        break;
      }
    }
  });

  // Keyboard: Enter / Space on a focused rating row acts like a click.
  workspaceEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest('.eopcrf1-level[data-action="pick-level"]');
    if (!row || e.target !== row) return;
    e.preventDefault();
    row.click();
  });
  // ================= Form details (report header) =================
  const detailsSumEl = document.getElementById("eopcrf1-details-sum");
  const headerInputs = document.querySelectorAll("[data-header]");

  function updateDetailsSummary(h) {
    const bits = [
      (h.nameOfEmployee || "").toUpperCase(),
      h.positionOfEmployee,
      h.ratingPeriod,
    ].filter(Boolean);
    detailsSumEl.textContent = bits.length
      ? bits.join(" · ")
      : "Not filled in yet";
    detailsSumEl.classList.toggle("is-incomplete", !bits.length);
  }

  async function loadHeader() {
    try {
      const h = await apiCall("GET", "/api/eopcrf1/report-header");
      headerInputs.forEach((inp) => {
        const v = h[inp.dataset.header] || "";
        inp.value = inp.dataset.upper ? v.toUpperCase() : v;
      });
      updateDetailsSummary(h);
    } catch (err) {
      /* the form still works without its header block */
    }
  }

  // Name fields are forced to capitals as the person types (cursor kept).
  document.querySelectorAll("[data-upper]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const start = inp.selectionStart;
      const end = inp.selectionEnd;
      inp.value = inp.value.toUpperCase();
      try {
        inp.setSelectionRange(start, end);
      } catch (e) {
        /* not supported for this input type */
      }
    });
  });

  // Approving authority lives in its own table (shared with the signatory
  // footer), so it has its own load/save instead of the report-header API.
  const authorityInput = document.getElementById(
    "eopcrf1-h-approvingAuthority",
  );
  async function loadAuthority() {
    if (!authorityInput) return;
    try {
      const a = await apiCall("GET", "/api/eopcrf1/approving-authority");
      authorityInput.value = (a.name || "").toUpperCase();
    } catch (err) {
      /* leave blank */
    }
  }
  if (authorityInput) {
    authorityInput.addEventListener("change", async () => {
      try {
        const a = await apiCall("POST", "/api/eopcrf1/approving-authority", {
          name: authorityInput.value.trim().toUpperCase(),
        });
        authorityInput.value = (a.name || "").toUpperCase();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  headerInputs.forEach((inp) => {
    inp.addEventListener("change", async () => {
      try {
        const h = await apiCall("POST", "/api/eopcrf1/report-header", {
          [inp.dataset.header]: inp.dataset.upper
            ? inp.value.trim().toUpperCase()
            : inp.value,
        });
        updateDetailsSummary(h);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  // ---- Form details drawer ----
  const drawerOverlay = document.getElementById("eopcrf1-drawer-overlay");
  const drawerEl = document.getElementById("eopcrf1-drawer");
  let drawerReturnFocus = null;

  function openDrawer() {
    drawerReturnFocus = document.activeElement;
    drawerOverlay.classList.add("visible");
    const first = drawerEl.querySelector("input, textarea");
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawerOverlay.classList.contains("visible")) return;
    // Blur the focused field so its pending "change" save fires first.
    if (drawerEl.contains(document.activeElement))
      document.activeElement.blur();
    drawerOverlay.classList.remove("visible");
    if (drawerReturnFocus && drawerReturnFocus.focus) drawerReturnFocus.focus();
  }

  document
    .getElementById("eopcrf1-details-open")
    .addEventListener("click", openDrawer);
  document
    .getElementById("eopcrf1-drawer-close")
    .addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("mousedown", (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
  // Keep Tab inside the open drawer.
  drawerEl.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = Array.from(
      drawerEl.querySelectorAll("input, textarea, button"),
    ).filter((x) => !x.disabled);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ================= Print / Save as PDF =================
  // Builds a print-only copy of the whole form (header block, Part I-A, I-B,
  // I-C, signatories) laid out like the official OPCRF sheet, then calls
  // window.print(). Styling lives in eopcrf1_print.css (long bond, landscape).
  // The root is moved to <body> so the print stylesheet can hide everything
  // else on the page without knowing base.html's structure.
  const printRoot = document.getElementById("eopcrf1-print-root");
  const printBtn = document.getElementById("eopcrf1-print-btn");
  const printCache = {
    header: {},
    authority: { name: "", position: "" },
  };
  if (printRoot) document.body.appendChild(printRoot);

  const PRINT_INTRO = {
    a: "Part I-A. Commitment to Organizational Outcomes shall capture office commitments, performance, and accomplishments based on office mandates and KRAs as reflected in the official issuance on the Compendium of Office Functions. This part shall capture the contributions of the office directly targeting the Organizational Outcomes indicated in the General Appropriation Act (GAA) Programs/Subprograms, Basic Education Development Plan (BEDP) Pillars, MATATAG Agenda priority deliverables, and other national level commitments that are aligned with and relevant to the office KRAs. Clear attribution shall be made to ensure such alignment.",
    b: "Part I-B. Innovating and Intervening Accomplishments shall capture the outcomes/outputs of the office that are enabling, supportive, and/or contributory to the achievement of the organizational commitments and KRAs in Part I-A. Accomplishments can be innovations, interventions, and enhancements on the processes, services, and/or outputs.",
    c: "Part I-C. Organizational Effectiveness shall capture accomplishments/outputs produced or attained on the aspects of Financial Stewardship, Process Improvement, and Client Satisfaction. It shall focus on the results achieved by the office that are aligned with the Performance-based Bonus (PBB) oversight requirements.",
  };

  // Column widths are % of the table and add up to ~100 per part.
  const SCALE_LABELS = {
    5: "5<br>(Outstanding)",
    4: "4<br>(Very Satisfactory)",
    3: "3<br>(Satisfactory)",
    2: "2<br>(Unsatisfactory)",
    1: "1<br>(Poor)",
  };
  function printCols(partKey) {
    const kraHead =
      partKey === "a"
        ? "Key Result Areas (KRA)<br>(Based on Office Mandate and Functions)"
        : partKey === "b"
          ? "Key Result Areas (KRA)"
          : "Organizational Effectiveness Area";
    const objHead =
      partKey === "a"
        ? "Objectives<br>(based on Office Functions)<br>The school is expected to:"
        : "Objectives";
    const scale = [5, 4, 3, 2, 1].map((n) => ({
      k: "r" + n,
      group: "scale",
      label: SCALE_LABELS[n],
      w: partKey === "a" ? 7.4 : 8,
    }));
    const cols = [{ k: "kra", label: kraHead, w: partKey === "a" ? 6 : 8 }];
    if (partKey === "a") {
      cols.push(
        {
          k: "gaa",
          group: "align",
          label: "GAA Programs/ Subprograms",
          w: 4.5,
        },
        { k: "bedp", group: "align", label: "BEDP Pillars", w: 4.5 },
        {
          k: "agenda",
          group: "align",
          label: "Current Administration Agenda",
          w: 4.5,
        },
      );
    }
    cols.push(
      { k: "obj", label: objHead, w: partKey === "a" ? 8 : 11 },
      { k: "time", label: "Timeline", w: 3 },
      { k: "wt", label: "Weight Allocation", w: 2.6 },
    );
    if (partKey !== "c") {
      cols.push(
        {
          k: "val",
          group: "target",
          label: "Value<br>(numerical, statistical, trend)",
          w: 3,
        },
        {
          k: "desc",
          group: "target",
          label: "Description<br>(expected outcome/ output/service)",
          w: 4.5,
        },
      );
    }
    cols.push(
      {
        k: "meas",
        label: "Performance Measure<br>(Quality, Efficiency, Timeliness)",
        w: 3.4,
      },
      ...scale,
      { k: "mov", label: "Means of Verification (MOVs)", w: 6.5 },
      {
        k: "act",
        label:
          partKey === "b"
            ? "Actual Results/ Accomplishments"
            : "Actual Accomplishments",
        w: 5.5,
      },
      { k: "rate", label: "RATING<br>(Q,E,T)", w: 2.4 },
      { k: "avg", label: "AVERAGE<br>(QET)", w: 2.6 },
      { k: "wavg", label: "WEIGHTED AVERAGE", w: 2.8 },
    );
    return cols;
  }

  const pText = (v) => escapeHtml(v == null ? "" : String(v));
  const pWeight = (w) =>
    hasVal(w) ? Math.round(Number(w) * 100) / 100 + "%" : "";
  const pFmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return isNaN(d)
      ? iso
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  };

  function printTableHead(cols) {
    const evalStart = cols.findIndex((c) => c.k === "act");
    const colgroup = `<colgroup>${cols.map((c) => `<col style="width:${c.w}%">`).join("")}</colgroup>`;
    const row1 = `<tr class="ph-band">
      <th colspan="${evalStart}">TO BE ACCOMPLISHED DURING PLANNING</th>
      <th colspan="${cols.length - evalStart}">TO BE FILLED DURING EVALUATION</th></tr>`;
    const groupTitle = {
      align: "Organizational Outcomes Alignment",
      target: "Performance Targets",
      scale: "Rating Scale",
    };
    let row2 = "";
    let row3 = "";
    for (let i = 0; i < cols.length; ) {
      const c = cols[i];
      if (!c.group) {
        row2 += `<th rowspan="2">${c.label}</th>`;
        i++;
        continue;
      }
      let j = i;
      while (j < cols.length && cols[j].group === c.group) j++;
      row2 += `<th colspan="${j - i}">${groupTitle[c.group]}</th>`;
      for (let x = i; x < j; x++) row3 += `<th>${cols[x].label}</th>`;
      i = j;
    }
    return `${colgroup}<thead>${row1}<tr>${row2}</tr><tr>${row3}</tr></thead>`;
  }

  // One <tbody> per KRA. Each objective is three rows (Quality / Efficiency /
  // Timeliness); cells that apply to the whole objective span those rows.
  function printKraBody(kra, partKey, cols) {
    const objs = kra.objectives.length ? kra.objectives : [null];
    const totalRows = objs.length * 3;
    let html = `<tbody class="pb-kra">`;
    objs.forEach((obj, oi) => {
      INDICATOR_CATEGORIES.forEach((cat, ci) => {
        let tr = "<tr>";
        cols.forEach((c) => {
          const first = oi === 0 && ci === 0;
          switch (c.k) {
            case "kra":
              if (first)
                tr += `<td rowspan="${totalRows}" class="pc-kra">${pText(kra.text)}${
                  partKey === "a" && hasVal(kra.weight)
                    ? `<br>(${pWeight(kra.weight)})`
                    : ""
                }</td>`;
              break;
            case "gaa":
            case "bedp":
            case "agenda": {
              const f = {
                gaa: "gaaProgram",
                bedp: "bedpPillars",
                agenda: "adminAgenda",
              }[c.k];
              if (first)
                tr += `<td rowspan="${totalRows}">${pText(kra[f])}</td>`;
              break;
            }
            case "meas":
              tr += `<td class="pc-meas">${cat.label}</td>`;
              break;
            case "rate":
              tr += `<td class="pc-c">${obj && hasVal(obj.ratings[cat.key]) ? Number(obj.ratings[cat.key]) : ""}</td>`;
              break;
            case "r5":
            case "r4":
            case "r3":
            case "r2":
            case "r1": {
              const n = Number(c.k.slice(1));
              const item = obj ? obj[cat.key].find((i) => i.rate === n) : null;
              tr += `<td>${item ? pText(item.label) : ""}</td>`;
              break;
            }
            default:
              if (ci !== 0) break; // objective-level cell, only on first row
              {
                let v = "";
                let cls = "";
                if (obj) {
                  if (c.k === "obj") v = pText(obj.text);
                  else if (c.k === "time") v = pText(obj.timeline);
                  else if (c.k === "wt")
                    ((v = pWeight(obj.weight)), (cls = "pc-c"));
                  else if (c.k === "val")
                    ((v = pText(obj.targetValue)), (cls = "pc-c"));
                  else if (c.k === "desc") v = pText(obj.targetDescription);
                  else if (c.k === "mov")
                    v =
                      pText(obj.movRequired) +
                      (obj.mov
                        ? `${obj.movRequired ? "<br>" : ""}<span class="pc-link">${pText(obj.mov)}</span>`
                        : "");
                  else if (c.k === "act") v = pText(obj.actualResults);
                  else if (c.k === "avg") {
                    const a = computeAverage(obj);
                    ((v = a === null ? "" : fmt3(a)), (cls = "pc-c"));
                  } else if (c.k === "wavg") {
                    const s = computeScore(obj);
                    ((v = s === null ? "" : fmt3(s)), (cls = "pc-c"));
                  }
                }
                tr += `<td rowspan="3" class="${cls}">${v}</td>`;
              }
          }
        });
        html += tr + "</tr>";
      });
    });
    return html + "</tbody>";
  }

  function printPart(partKey) {
    const part = PARTS.find((p) => p.key === partKey);
    const cols = printCols(partKey);
    let kras = state.kras.filter((k) => k.part === partKey);
    if (!kras.length) {
      // Nothing entered yet: print blank rows, as on the paper form.
      kras = [{ text: "", weight: null, objectives: [null, null] }];
    }
    const t = partTotals(partKey);
    const bodies = kras.map((k) => printKraBody(k, partKey, cols)).join("");
    const total = `<tbody class="pb-total"><tr><td colspan="${cols.length - 1}" class="pc-total-label">${part.label} Total Score</td><td class="pc-c">${t.score === null ? "" : fmt3(t.score)}</td></tr></tbody>`;
    return `<div class="p-part p-part--${partKey}">
      <h3>${part.label.toUpperCase()}: ${part.full.toUpperCase()} (${PART_EXPECTED_TOTAL[partKey]}%)</h3>
      <p class="p-intro">${pText(PRINT_INTRO[partKey])}</p>
      <table class="p-table">${printTableHead(cols)}${bodies}${total}</table>
    </div>`;
  }

  // Fixed -- the rater is always the Assistant Schools Division Superintendent.
  const RATER_POSITION = "Assistant Schools Division Superintendent";

  function buildPrintHtml() {
    const h = printCache.header || {};
    const a = printCache.authority || {};
    const headerImg = printRoot.dataset.headerImg;
    const up = (v) => (v == null ? "" : String(v).toUpperCase());
    const info = (l1, v1, l2, v2) =>
      `<tr><th>${l1}</th><td>${pText(v1)}</td><th>${l2}</th><td>${pText(v2)}</td></tr>`;
    const sign = (name, role) =>
      `<div class="p-sign"><div class="p-sign-name">${pText(name)}</div><div class="p-sign-role">${role}</div></div>`;
    return `
      <div class="p-annex">Annex B</div>
      <div class="p-head">
        <img class="p-header-img" src="${headerImg}" alt="Department of Education - Office of the Undersecretary, Human Resource and Organizational Development">
        <div class="p-title">OFFICE PERFORMANCE COMMITMENT AND REVIEW FORM (OPCRF)</div>
        <div class="p-ver">ver.Feb2025</div>
      </div>
      <table class="p-info">
        ${info("Name of Employee:", up(h.nameOfEmployee), "Name of Rater:", up(h.nameOfRater))}
        ${info("Position/Designation:", h.positionOfEmployee, "Position:", RATER_POSITION)}
        ${info("Review Period:", h.ratingPeriod, "Approving Authority:", up(a.name))}
        ${info("Strand/Bureau/Center/Service/Region/Division:", h.bureau, "Date of Review:", pFmtDate(h.dateOfReview))}
        <tr><th>Strand/Bureau/Center/Service/Region/Division Statement of Purpose:</th><td colspan="3">${pText(h.statementOfPurpose)}</td></tr>
      </table>
      ${printPart("a")}
      ${printPart("b")}
      ${printPart("c")}
      <div class="p-signs">
        ${sign(up(h.nameOfEmployee), "RATEE")}
        ${sign(up(h.nameOfRater), "RATER")}
        ${sign(up(a.name), "APPROVING AUTHORITY")}
      </div>`;
  }

  function refreshPrintRoot() {
    if (printRoot) printRoot.innerHTML = buildPrintHtml();
  }

  async function loadPrintExtras() {
    const [h, a] = await Promise.allSettled([
      apiCall("GET", "/api/eopcrf1/report-header"),
      apiCall("GET", "/api/eopcrf1/approving-authority"),
    ]);
    if (h.status === "fulfilled") printCache.header = h.value;
    if (a.status === "fulfilled") printCache.authority = a.value;
  }

  // The header image only starts downloading once the print copy is built,
  // so printing straight away used to catch it before it had loaded (blank
  // on the first print, fine on the second once it was cached). Two fixes:
  //  1. preload the image as soon as the page opens, so it is cached, and
  //  2. before printing, wait (up to 4s) for every image in the print copy.
  if (printRoot && printRoot.dataset.headerImg) {
    const preload = new Image();
    preload.src = printRoot.dataset.headerImg;
  }

  function imagesReady(root, timeoutMs) {
    const waits = Array.from(root.querySelectorAll("img")).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
    );
    return Promise.race([
      Promise.all(waits),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  if (printBtn && printRoot) {
    // Set while the button's own print is in progress, so the beforeprint
    // handler below doesn't rebuild the copy (and reload the image) again.
    let builtForButton = false;
    printBtn.addEventListener("click", async () => {
      printBtn.disabled = true;
      const restore = () => {
        builtForButton = false;
        window.removeEventListener("afterprint", restore);
      };
      window.addEventListener("afterprint", restore);
      try {
        await loadPrintExtras();
        refreshPrintRoot();
        await imagesReady(printRoot, 4000);
        builtForButton = true;
        window.print();
      } finally {
        printBtn.disabled = false;
      }
    });
    // Ctrl+P / browser menu print gets the same layout from cached data
    // (the image is already cached from the preload above).
    window.addEventListener("beforeprint", () => {
      if (!builtForButton) refreshPrintRoot();
    });
  }

  // ================= Initial load =================
  async function init() {
    loadHeader();
    loadAuthority();
    try {
      const data = await apiCall("GET", "/irc/eopcrf1/data");
      state.year = data.year;
      state.kras = data.kras;
      // Open on the first objective that still needs work.
      const kras = orderedKras();
      for (const k of kras) {
        const o = k.objectives.find(
          (x) => objectiveProgress(k, x).state !== "done",
        );
        if (o) {
          sel.kraId = k.id;
          sel.objId = o.id;
          break;
        }
      }
      render();
    } catch (err) {
      workspaceEl.style.display = "none";
      progressEl.style.display = "none";
      errorStateEl.style.display = "block";
      errorStateEl.textContent = "Couldn't load this report: " + err.message;
    }
  }

  init();
})();
