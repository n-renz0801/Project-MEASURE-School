/* AIP - School Annual Implementation Plan accomplishment report.
   The user builds any number of program/projects (title, source of fund,
   objective, target and accomplishment -- each with a physical text and a
   finance amount in pesos -- gain/gap, recommendation, MOV link), reorders
   them by dragging, and prints them in the layout of the school's AIP report.
   Data is saved through the /aip/* routes in app.py. The MOV link is on-screen
   only and is never printed. */
(function () {
  "use strict";

  const el = (id) => document.getElementById(id);
  const listEl = el("aip-list");
  const editorEl = el("aip-editor");
  const progressCountEl = el("aip-progress-count");
  const segsEl = el("aip-segments");
  const nextBtn = el("aip-next-incomplete");
  const doneBadge = el("aip-done-badge");
  const statusEl = el("aip-save-status");
  const workspaceEl = el("aip-workspace");
  const errorEl = el("aip-error-state");

  // The parts of a program/project. The editor groups them as: Program details
  // (title, source of fund), Plan vs actual (objective, then a grid comparing
  // Target with Accomplishment, each as Physical text + Finance amount) and
  // Analysis and next steps (gain/gap, recommendation). The MOV link has its
  // own strip at the bottom. `hint` is the placeholder shown when empty.
  // `target` and `accomplishment` are the PHYSICAL texts; the finance amounts
  // are `targetFinance` / `accomplishmentFinance` (text while editing, e.g.
  // "45,000.00"; the server stores them as numbers).
  const FIELDS = {
    title: {
      label: "Program/Project title",
      rows: 3,
      hint: "Program or project title",
    },
    sourceOfFund: {
      label: "Source of fund",
      rows: 3,
      hint: "Where the budget comes from",
    },
    objective: {
      label: "Objective",
      rows: 2,
      hint: "What it should achieve",
    },
    target: {
      label: "Target (physical)",
      rows: 5,
      hint: "What was planned",
    },
    targetFinance: { label: "Target (finance)", money: true },
    accomplishment: {
      label: "Accomplishment (physical)",
      rows: 5,
      hint: "What was actually done",
    },
    accomplishmentFinance: { label: "Accomplishment (finance)", money: true },
    gainGap: {
      label: "Gain/Gap",
      rows: 4,
      hint: "How the result compares with the plan",
    },
    // Structured Gain / Gap choice (the dashboard counts these). The free-text
    // `gainGap` above stays as the explanation.
    gainGapType: { label: "Gain or gap" },
    recommendation: {
      label: "Recommendation",
      rows: 4,
      hint: "What should happen next",
    },
  };
  const MONEY_KEYS = ["targetFinance", "accomplishmentFinance"];
  const PESO = "₱";

  const state = {
    projects: [], // [{ id, title, sourceOfFund, objective, target, targetFinance, accomplishment, accomplishmentFinance, gainGap, recommendation, movLink }]
    selectedId: null,
    movMode: null, // null | "edit" | "confirm" for the selected project
    confirmDelete: false,
    confirmClear: false, // "Clear fields" is waiting for Clear / Keep
  };
  const saveTimers = {}; // `${id}:${field}` -> timeout id

  // ================= helpers =================
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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

  // Only failures are reported; successful saves are silent.
  function setStatus(message) {
    statusEl.textContent = message ? "Couldn\u2019t save: " + message : "";
  }

  function byId(id) {
    return state.projects.find((p) => p.id === id) || null;
  }
  function selected() {
    return byId(state.selectedId);
  }

  // ---- Money (pesos) ----
  // Finance fields are typed as text ("45000", "45,000.50") and shown as
  // "45,000.50" once the field is left. parseMoney: null = empty, NaN =
  // not a valid amount, otherwise the number rounded to centavos.
  const MONEY_MAX = 1e12;
  function parseMoney(s) {
    const t = String(s == null ? "" : s).replace(/[₱,\s]/g, "");
    if (t === "") return null;
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return NaN;
    const n = Math.round(parseFloat(t) * 100) / 100;
    return n > MONEY_MAX ? NaN : n;
  }
  function formatMoney(n) {
    return n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  const moneyToText = (n) => (n == null ? "" : formatMoney(n));

  // Every part is required: the text fields, both finance amounts (0 counts as
  // filled) and the MOV link. These helpers drive the list, the progress
  // segments and the status chip.
  const REQUIRED = [
    "title",
    "sourceOfFund",
    "objective",
    "target",
    "targetFinance",
    "accomplishment",
    "accomplishmentFinance",
    "gainGap",
    "gainGapType",
    "recommendation",
  ];
  const PART_TOTAL = REQUIRED.length + 1; // + the MOV link
  function isFilled(p, k) {
    if (FIELDS[k].money) return Number.isFinite(parseMoney(p[k]));
    return !!String(p[k] || "").trim();
  }
  // Rebuilds a project from what the server sends (finance as numbers).
  function projectFromServer(p) {
    return {
      id: p.id,
      title: p.title || "",
      sourceOfFund: p.sourceOfFund || "",
      objective: p.objective || "",
      target: p.target || "",
      targetFinance: moneyToText(p.targetFinance),
      accomplishment: p.accomplishment || "",
      accomplishmentFinance: moneyToText(p.accomplishmentFinance),
      gainGap: p.gainGap || "",
      gainGapType: p.gainGapType || "",
      recommendation: p.recommendation || "",
      movLink: p.movLink || "",
    };
  }
  function missingParts(p) {
    const miss = REQUIRED.filter((k) => !isFilled(p, k)).map(
      (k) => FIELDS[k].label,
    );
    if (!p.movLink) miss.push("MOV link");
    return miss;
  }
  function filledCount(p) {
    return PART_TOTAL - missingParts(p).length;
  }
  function isComplete(p) {
    return missingParts(p).length === 0;
  }

  function titleLines(p) {
    return p.title
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ================= MOV link (same behaviour as the SBM page) =================
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

  function movHtml(p) {
    const link = p.movLink;
    const mode = state.movMode;
    if (!link || mode === "edit") {
      return `
        <div class="aip-mov${link ? "" : " is-missing"}">
          <input type="text" inputmode="url" class="aip-mov-input" value="${escapeHtml(link)}"
                 placeholder="Paste the MOV link" autocomplete="off" spellcheck="false"
                 aria-label="MOV link for this program/project" />
          <button type="button" class="aip-mov-btn aip-mov-btn--primary aip-mov-save" ${link ? "" : "disabled"}>${link ? "Save" : "Attach"}</button>
          ${link ? '<button type="button" class="aip-mov-btn aip-mov-cancel">Cancel</button>' : ""}
          <span class="aip-mov-err" role="alert" hidden></span>
        </div>`;
    }
    const host = hostOf(link);
    const safe = /^https?:\/\//i.test(link);
    const inner = `
      <span class="aip-mov-ico"><i class="ti ti-link" aria-hidden="true"></i></span>
      <span class="aip-mov-host">${escapeHtml(host)}</span>
      ${safe ? '<i class="ti ti-external-link aip-mov-ext" aria-hidden="true"></i>' : ""}`;
    const tile = safe
      ? `<a class="aip-mov-tile" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(link)}" aria-label="Open MOV link: ${escapeHtml(host)} (opens in a new tab)">${inner}</a>`
      : `<span class="aip-mov-tile" title="${escapeHtml(link)}">${inner}</span>`;
    const actions =
      mode === "confirm"
        ? `<span class="aip-mov-ask">Remove this link?</span>
           <button type="button" class="aip-mov-btn aip-mov-btn--danger aip-mov-remove-yes">Remove</button>
           <button type="button" class="aip-mov-btn aip-mov-remove-no">Keep</button>`
        : `<span class="aip-mov-tools">
             <button type="button" class="aip-mov-icon aip-mov-edit" aria-label="Edit MOV link" title="Edit link"><i class="ti ti-pencil" aria-hidden="true"></i></button>
             <button type="button" class="aip-mov-icon aip-mov-icon--danger aip-mov-remove" aria-label="Remove MOV link" title="Remove link"><i class="ti ti-trash" aria-hidden="true"></i></button>
           </span>`;
    return `<div class="aip-mov">${tile}${actions}</div>`;
  }

  // ================= list (left) =================
  // Not started / half done / complete, for the dot and the progress segment.
  function projectState(p) {
    const n = filledCount(p);
    if (n === PART_TOTAL) return "done";
    return n > 0 ? "partial" : "empty";
  }

  // One list row, built like an SBM dimension item (name + count, with a
  // progress bar under them), plus the program/project's category line and a
  // grip for reordering.
  function rowHtml(p, index) {
    const lines = titleLines(p);
    const cat = lines.length > 1 ? lines[0] : "";
    const name = lines.length > 1 ? lines[1] : lines[0] || "";
    const n = filledCount(p);
    const isDone = n === PART_TOTAL;
    const still = isDone
      ? ""
      : ` title="Still needed: ${escapeHtml(missingParts(p).join(", "))}"`;
    return `
      <div class="aip-row${p.id === state.selectedId ? " is-active" : ""}${isDone ? " is-complete" : ""}" role="listitem" data-id="${p.id}">
        <button type="button" class="aip-row-main" aria-current="${p.id === state.selectedId}">
          <span class="aip-row-top">
            <span class="aip-row-text">
              ${cat ? `<span class="aip-row-cat">${escapeHtml(cat)}</span>` : ""}
              <span class="aip-row-name${name ? "" : " is-empty"}">${name ? escapeHtml(name) : "Untitled program/project"}</span>
            </span>
            <span class="aip-row-count"${still}>${isDone ? '<i class="ti ti-circle-check-filled" aria-hidden="true"></i>' : ""}${n}/${PART_TOTAL}</span>
          </span>
          <span class="aip-row-bar" aria-hidden="true"><span style="width:${(n / PART_TOTAL) * 100}%"></span></span>
        </button>
        <button type="button" class="aip-grip" aria-label="Reorder program/project ${index + 1}. Drag, or press the up and down arrow keys."
                title="Drag to reorder"><i class="ti ti-grip-vertical" aria-hidden="true"></i></button>
      </div>`;
  }

  // Overall progress panel: one segment per entry (a single bar when there
  // are too many for readable segments).
  const SEG_MAX = 12;
  function renderProgress() {
    const total = state.projects.length;
    const done = state.projects.filter(isComplete).length;
    const complete = total > 0 && done === total;
    progressCountEl.classList.toggle("is-complete", complete);
    progressCountEl.innerHTML = total
      ? `<strong>${done} of ${total}</strong><span>complete</span>`
      : `<strong>0</strong><span>entries</span>`;
    segsEl.setAttribute("aria-valuemax", String(total));
    segsEl.setAttribute("aria-valuenow", String(done));
    const bar = (pct, label) =>
      `<div class="aip-seg aip-seg--static"><span class="aip-seg-bar"><span style="width:${pct}%"></span></span><span class="aip-seg-label">${label}</span></div>`;
    if (total === 0) {
      segsEl.innerHTML = bar(0, "No program/projects yet");
    } else if (total > SEG_MAX) {
      segsEl.innerHTML = bar(
        (done / total) * 100,
        `${done} of ${total} complete`,
      );
    } else {
      segsEl.innerHTML = state.projects
        .map((p, i) => {
          const st = projectState(p);
          const w = (filledCount(p) / PART_TOTAL) * 100;
          const lines = titleLines(p);
          const nm = lines.length > 1 ? lines[1] : lines[0] || "Untitled";
          return `
        <button type="button" class="aip-seg${p.id === state.selectedId ? " is-active" : ""}${st === "done" ? " is-complete" : ""}"
                data-id="${p.id}" title="${escapeHtml(nm)}: ${filledCount(p)} of ${PART_TOTAL} filled">
          <span class="aip-seg-bar"><span style="width:${w}%"></span></span>
          <span class="aip-seg-label">${i + 1}</span>
        </button>`;
        })
        .join("");
    }
    nextBtn.hidden = complete || total === 0;
    doneBadge.hidden = !complete;
  }

  function renderList() {
    listEl.innerHTML = state.projects.map(rowHtml).join("");
    renderProgress();
  }

  // ================= editor (right) =================
  function areaHtml(p, key, ariaLabel) {
    const f = FIELDS[key];
    return `<textarea rows="${f.rows}" data-field="${key}" placeholder="${escapeHtml(f.hint)}"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ""} style="min-height:calc(${f.rows} * 1.45em + 18px)">${escapeHtml(p[key])}</textarea>`;
  }

  function fieldHtml(p, key) {
    return `
      <label class="aip-fld">
        <span class="aip-fl">${FIELDS[key].label}</span>
        ${areaHtml(p, key)}
      </label>`;
  }

  // Gain/Gap: a Gain | Gap choice in the label row, then the explanation box.
  // Clicking the chosen option again clears it.
  function gainGapHtml(p) {
    const opt = (v, icon, text) =>
      `<button type="button" role="radio" class="aip-gg-opt" data-gg="${v}" aria-checked="${p.gainGapType === v}"><i class="ti ${icon}" aria-hidden="true"></i> ${text}</button>`;
    return `
      <div class="aip-fld">
        <div class="aip-fl aip-fl--gg">
          <span>${FIELDS.gainGap.label}</span>
          <span class="aip-gg" role="radiogroup" aria-label="Result: gain or gap">${opt("gain", "ti-trending-up", "Gain")}${opt("gap", "ti-trending-down", "Gap")}</span>
        </div>
        ${areaHtml(p, "gainGap", "Gain/Gap explanation")}
      </div>`;
  }

  // A peso amount: a fixed peso sign, a right-aligned number, and a small
  // error line that only shows for an invalid amount.
  // The accomplished amount can never be more than the target, so it stays
  // locked until a target is entered (see syncFinanceLock) and refuses
  // anything above it (see the input handler). `data-good` remembers the last
  // accepted text, so a refused edit can be put back.
  function moneyHtml(p, key) {
    const locked =
      key === "accomplishmentFinance" &&
      !Number.isFinite(parseMoney(p.targetFinance));
    return `
      <div class="aip-money-wrap">
        <span class="aip-money${locked ? " is-locked" : ""}">
          <span class="aip-money-cur" aria-hidden="true">${PESO}</span>
          <input type="text" inputmode="decimal" autocomplete="off" class="aip-money-input"
                 data-field="${key}" data-money="1" data-good="${escapeHtml(p[key])}" value="${escapeHtml(p[key])}" placeholder="Amount"
                 aria-label="${escapeHtml(FIELDS[key].label)} in pesos"${locked ? " disabled" : ""} />
        </span>
        <span class="aip-money-err" role="alert" hidden></span>
      </div>`;
  }

  // Locks the accomplished amount while there is no target to compare with.
  function syncFinanceLock() {
    const p = selected();
    const input = editorEl.querySelector(
      'input[data-field="accomplishmentFinance"]',
    );
    if (!p || !input) return;
    const locked = !Number.isFinite(parseMoney(p.targetFinance));
    input.disabled = locked;
    input.closest(".aip-money").classList.toggle("is-locked", locked);
  }

  // How much of the target has been used. Calculated from the two finance
  // amounts; never stored. The accomplished amount cannot exceed the target.
  function utilizationHtml(p) {
    const t = parseMoney(p.targetFinance);
    const a = parseMoney(p.accomplishmentFinance);
    if (!Number.isFinite(t))
      return `<span class="aip-var-empty">Enter the target amount first.</span>`;
    if (!Number.isFinite(a))
      return `<span class="aip-var-empty">Enter the accomplished amount to see how much of the target was used.</span>`;
    if (a > t)
      return `<span class="aip-var-empty is-warn">The accomplished amount is more than the target. Raise the target or lower the accomplishment.</span>`;
    const left = Math.round((t - a) * 100) / 100;
    const pct = t > 0 ? (a / t) * 100 : null;
    return `
      <div class="aip-var-amt"><strong>${PESO}${formatMoney(left)}</strong><span>unspent</span></div>
      <div class="aip-var-bar" aria-hidden="true"><span style="width:${pct == null ? 0 : pct}%"></span></div>
      <div class="aip-var-pct"><strong>${pct == null ? "—" : pct.toFixed(1) + "%"}</strong><span>utilized</span></div>`;
  }

  function refreshUtilization() {
    const p = selected();
    const box = el("aip-var-body");
    if (p && box) box.innerHTML = utilizationHtml(p);
  }

  function stageHead(n, name, note) {
    return `<div class="aip-stage-h"><span class="aip-stage-n" aria-hidden="true">${n}</span><h4>${name}</h4><span class="aip-stage-note">${note}</span></div>`;
  }

  function rowLabel(name, note) {
    return `<div class="aip-cmp-label"><strong>${name}</strong><span>${note}</span></div>`;
  }

  // Three groups: Program details, Plan vs actual and Analysis and next steps.
  // In Plan vs actual the Target and Accomplishment columns sit side by side,
  // so each row (Physical, Finance, Utilization) compares them directly, like the
  // printed report. Side-by-side text boxes share one height (see autosize).
  function bodyHtml(p) {
    return `
      <div class="aip-ed-body">
        <section class="aip-stage">
          ${stageHead(1, "Program details", "What it is and where the money comes from")}
          <div class="aip-basics aip-duo">
            ${fieldHtml(p, "title")}
            ${fieldHtml(p, "sourceOfFund")}
          </div>
        </section>

        <section class="aip-stage">
          ${stageHead(2, "Plan vs actual", "Each row compares the target with what was accomplished")}
          ${fieldHtml(p, "objective")}
          <div class="aip-cmp" role="group" aria-label="Target compared with accomplishment">
            <div class="aip-cmp-row aip-cmp-head">
              <div class="aip-cmp-corner"></div>
              <div class="aip-cmp-col aip-cmp-col--target"><strong>TARGET</strong><span>Planned</span></div>
              <div class="aip-cmp-col aip-cmp-col--actual"><strong>ACCOMPLISHMENT</strong><span>Actually done</span></div>
            </div>
            <div class="aip-cmp-row aip-duo">
              ${rowLabel("Physical", "Quantities, activities")}
              <div class="aip-cmp-cell">${areaHtml(p, "target", FIELDS.target.label)}</div>
              <div class="aip-cmp-cell">${areaHtml(p, "accomplishment", FIELDS.accomplishment.label)}</div>
            </div>
            <div class="aip-cmp-row">
              ${rowLabel("Finance", "Amount in pesos")}
              <div class="aip-cmp-cell">${moneyHtml(p, "targetFinance")}</div>
              <div class="aip-cmp-cell">${moneyHtml(p, "accomplishmentFinance")}</div>
            </div>
            <div class="aip-cmp-row aip-cmp-row--var">
              ${rowLabel("Utilization", "Calculated")}
              <div class="aip-cmp-var" id="aip-var-body">${utilizationHtml(p)}</div>
            </div>
          </div>
        </section>

        <section class="aip-stage">
          ${stageHead(3, "Analysis and next steps", "What it means and what should follow")}
          <div class="aip-stage-grid aip-duo">
            ${gainGapHtml(p)}
            ${fieldHtml(p, "recommendation")}
          </div>
        </section>
      </div>`;
  }

  // Banner at the top of the editor: number badge, title (first line
  // small above, second line large, like the list), status chip, Delete.
  function headParts(p) {
    const lines = titleLines(p);
    return {
      cat: lines.length > 1 ? lines[0] : "",
      name: lines.length > 1 ? lines[1] : lines[0] || "",
    };
  }

  function headHtml(p) {
    const { cat, name } = headParts(p);
    const del = state.confirmClear
      ? `<span class="aip-ed-ask">Clear this program/project?</span>
         <button type="button" class="aip-ed-del aip-ed-del--confirm" data-act="clear-yes">Clear</button>
         <button type="button" class="aip-ed-del" data-act="clear-no">Keep</button>`
      : state.confirmDelete
        ? `<span class="aip-ed-ask">Delete this program/project?</span>
         <button type="button" class="aip-ed-del aip-ed-del--confirm" data-act="delete-yes">Delete</button>
         <button type="button" class="aip-ed-del" data-act="delete-no">Keep</button>`
        : `<button type="button" class="aip-ed-del" data-act="clear"><i class="ti ti-eraser" aria-hidden="true"></i> Clear fields</button>
         <button type="button" class="aip-ed-del" data-act="delete"><i class="ti ti-trash" aria-hidden="true"></i> Delete</button>`;
    return `
      <div class="aip-ed-head" id="aip-ed-head">
        <span class="aip-ed-title">
          <span class="aip-ed-cat" id="aip-ed-cat">${escapeHtml(cat)}</span>
          <span class="aip-ed-name${name ? "" : " is-empty"}" id="aip-ed-name">${name ? escapeHtml(name) : "Untitled program/project"}</span>
        </span>
        <span class="aip-ed-actions">${del}</span>
      </div>`;
  }

  // Updates the banner in place (keeps the cursor in the field being typed in).
  function refreshHead() {
    const p = selected();
    if (!p || !el("aip-ed-head")) return;
    const { cat, name } = headParts(p);
    el("aip-ed-cat").textContent = cat;
    const nameEl = el("aip-ed-name");
    nameEl.textContent = name || "Untitled program/project";
    nameEl.classList.toggle("is-empty", !name);
  }

  function renderEditor() {
    const p = selected();
    if (!p) {
      editorEl.innerHTML = `
        <div class="aip-empty">
          <i class="ti ti-clipboard-list" aria-hidden="true"></i>
          <p><strong>No program/projects yet.</strong></p>
          <p>Click <strong>Add program/project</strong> to start your report.</p>
        </div>`;
      return;
    }
    editorEl.innerHTML = `
      ${headHtml(p)}
      ${bodyHtml(p)}
      ${movHtml(p)}`;
    editorEl.querySelectorAll("textarea").forEach(autosize);
  }

  function renderMovOnly() {
    const p = selected();
    const old = editorEl.querySelector(".aip-mov");
    if (!p || !old) return null;
    old.outerHTML = movHtml(p);
    return editorEl.querySelector(".aip-mov");
  }

  // Not user-resizable: each box starts at its default height (its min-height,
  // set from `rows`) and grows only when the text needs more room.
  function autosize(ta) {
    const duo = ta.closest(".aip-duo");
    const boxes = duo ? Array.from(duo.querySelectorAll("textarea")) : [ta];
    // Side-by-side boxes share the taller height so their edges line up.
    const h = Math.max(
      ...boxes.map((b) => {
        b.style.height = "auto";
        return b.scrollHeight + 2; // +2 = the 1px borders
      }),
    );
    boxes.forEach((b) => (b.style.height = h + "px"));
  }
  window.addEventListener("resize", () =>
    editorEl.querySelectorAll("textarea").forEach(autosize),
  );

  function select(id, focusTitle) {
    state.selectedId = id;
    state.movMode = null;
    state.confirmDelete = false;
    state.confirmClear = false;
    renderList();
    renderEditor();
    if (focusTitle) {
      const t = editorEl.querySelector('textarea[data-field="title"]');
      if (t) t.focus();
    }
    const row = listEl.querySelector(`.aip-row[data-id="${id}"]`);
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }

  // ================= saving =================
  async function saveField(id, field) {
    const key = id + ":" + field;
    clearTimeout(saveTimers[key]);
    delete saveTimers[key];
    const p = byId(id);
    if (!p) return;
    let value = p[field];
    if (MONEY_KEYS.includes(field)) {
      // Finance goes to the server as a number (null = empty). An invalid
      // amount is never sent; the field shows its own error instead.
      value = parseMoney(value);
      if (Number.isNaN(value)) return;
      // The server refuses a target below the accomplished amount; do not
      // send one while the user is still typing towards the final figure.
      if (field === "targetFinance") {
        const done = parseMoney(p.accomplishmentFinance);
        if (Number.isFinite(done) && (value === null || value < done)) return;
      }
    }
    try {
      await apiCall("POST", "/aip/project/" + id, { [field]: value });
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    }
  }

  function scheduleSave(id, field) {
    const key = id + ":" + field;
    clearTimeout(saveTimers[key]);
    saveTimers[key] = setTimeout(() => saveField(id, field), 600);
  }

  async function flushAll() {
    const pending = Object.keys(saveTimers).map((k) => {
      const [id, field] = k.split(":");
      return saveField(Number(id), field);
    });
    await Promise.all(pending);
  }

  // ---- Finance inputs ----
  function showMoneyError(input, msg) {
    const wrap = input.closest(".aip-money-wrap");
    const err = wrap && wrap.querySelector(".aip-money-err");
    if (!err) return;
    err.textContent = msg;
    err.hidden = !msg;
    wrap.classList.toggle("is-invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  // On leaving a finance field: tidy it to "45,000.00" and save it. An
  // invalid amount is flagged and not saved.
  function commitMoney(p, input) {
    const key = input.dataset.field;
    const timerKey = p.id + ":" + key;
    const n = parseMoney(input.value);
    if (Number.isNaN(n)) {
      clearTimeout(saveTimers[timerKey]);
      delete saveTimers[timerKey];
      showMoneyError(input, "Enter a valid amount.");
      return;
    }
    // A target may not end up below what was already accomplished: put the
    // last accepted amount back instead of saving it.
    if (key === "targetFinance") {
      const done = parseMoney(p.accomplishmentFinance);
      if (Number.isFinite(done) && (n === null || n < done)) {
        clearTimeout(saveTimers[timerKey]);
        delete saveTimers[timerKey];
        input.value = input.dataset.good || "";
        p[key] = input.value;
        showMoneyError(
          input,
          "The target can’t be lower than the accomplished " +
            PESO +
            formatMoney(done) +
            ".",
        );
        syncFinanceLock();
        refreshUtilization();
        renderList();
        return;
      }
    }
    const text = n === null ? "" : formatMoney(n);
    const changed = p[key] !== text;
    input.value = text;
    p[key] = text;
    input.dataset.good = text;
    showMoneyError(input, "");
    if (changed || saveTimers[timerKey] !== undefined) saveField(p.id, key);
    syncFinanceLock();
    refreshUtilization();
    renderList();
  }

  editorEl.addEventListener("input", (e) => {
    const ta = e.target.closest("textarea[data-field], input[data-field]");
    if (ta) {
      const p = selected();
      if (!p) return;
      const key = ta.dataset.field;
      if (ta.dataset.money) {
        // Digits, commas and a decimal point only.
        const clean = ta.value.replace(/[^\d.,]/g, "");
        // The accomplished amount may not go above the target: refuse the
        // edit and keep what was there.
        if (key === "accomplishmentFinance") {
          const cap = parseMoney(p.targetFinance);
          const typed = parseMoney(clean);
          if (Number.isFinite(cap) && Number.isFinite(typed) && typed > cap) {
            ta.value = p[key];
            showMoneyError(
              ta,
              "Can’t be more than the target of " +
                PESO +
                formatMoney(cap) +
                ".",
            );
            return;
          }
        }
        if (clean !== ta.value) ta.value = clean;
        showMoneyError(ta, "");
      }
      const before = filledCount(p);
      p[key] = ta.value;
      if (ta.tagName === "TEXTAREA") autosize(ta);
      scheduleSave(p.id, key);
      if (ta.dataset.money) {
        syncFinanceLock();
        refreshUtilization();
      }
      // The list, progress and chip follow what is filled in, so refresh them
      // when the title text changes or a field goes from empty to filled.
      if (key === "title" || filledCount(p) !== before) {
        renderList();
        refreshHead();
      }
      return;
    }
    const movInput = e.target.closest(".aip-mov-input");
    if (movInput) {
      const strip = movInput.closest(".aip-mov");
      showMovError(strip, "");
      if (strip.classList.contains("is-missing"))
        strip.querySelector(".aip-mov-save").disabled = !movInput.value.trim();
    }
  });

  editorEl.addEventListener(
    "blur",
    (e) => {
      const ta =
        e.target.closest &&
        e.target.closest("textarea[data-field], input[data-field]");
      const p = selected();
      // A field removed by a re-render (switching program/project) must not
      // write its old value into the newly selected one.
      if (!ta || !p || !ta.isConnected) return;
      if (ta.dataset.money) return commitMoney(p, ta);
      if (saveTimers[p.id + ":" + ta.dataset.field] !== undefined)
        saveField(p.id, ta.dataset.field);
    },
    true,
  );

  // ---- MOV actions ----
  function showMovError(strip, msg) {
    const err = strip.querySelector(".aip-mov-err");
    const input = strip.querySelector(".aip-mov-input");
    err.textContent = msg;
    err.hidden = !msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  async function setMov(p, value) {
    const previous = p.movLink;
    p.movLink = value;
    state.movMode = null;
    const strip = renderMovOnly();
    renderList();
    refreshHead();
    const target = value
      ? strip.querySelector(".aip-mov-edit")
      : strip.querySelector(".aip-mov-input");
    if (target) target.focus();
    try {
      await apiCall("POST", "/aip/project/" + p.id, { movLink: value });
      setStatus("");
    } catch (err) {
      p.movLink = previous;
      if (selected() === p) renderMovOnly();
      renderList();
      refreshHead();
      setStatus(err.message);
    }
  }

  function commitMov(p) {
    const strip = editorEl.querySelector(".aip-mov");
    const input = strip.querySelector(".aip-mov-input");
    const res = normalizeMovUrl(input.value);
    if (res.error) {
      showMovError(strip, res.error);
      input.focus();
      return;
    }
    if (res.url === p.movLink) {
      state.movMode = null;
      renderMovOnly().querySelector(".aip-mov-edit").focus();
      return;
    }
    setMov(p, res.url);
  }

  function handleMovClick(p, e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const has = (c) => btn.classList.contains(c);
    if (has("aip-mov-save")) return commitMov(p);
    if (has("aip-mov-cancel")) {
      state.movMode = null;
      const edit = renderMovOnly().querySelector(".aip-mov-edit");
      if (edit) edit.focus();
      return;
    }
    if (has("aip-mov-edit")) {
      state.movMode = "edit";
      const input = renderMovOnly().querySelector(".aip-mov-input");
      input.focus();
      input.select();
      return;
    }
    if (has("aip-mov-remove")) {
      state.movMode = "confirm";
      renderMovOnly().querySelector(".aip-mov-remove-no").focus();
      return;
    }
    if (has("aip-mov-remove-no")) {
      state.movMode = null;
      renderMovOnly().querySelector(".aip-mov-remove").focus();
      return;
    }
    if (has("aip-mov-remove-yes")) return setMov(p, "");
  }

  editorEl.addEventListener("keydown", (e) => {
    const input = e.target.closest && e.target.closest(".aip-mov-input");
    const p = selected();
    if (!input || !p) return;
    if (e.key === "Enter") {
      e.preventDefault();
      commitMov(p);
    } else if (e.key === "Escape" && p.movLink) {
      e.preventDefault();
      state.movMode = null;
      const edit = renderMovOnly().querySelector(".aip-mov-edit");
      if (edit) edit.focus();
    }
  });

  editorEl.addEventListener("click", async (e) => {
    const p = selected();
    if (!p) return;
    if (e.target.closest(".aip-mov")) return handleMovClick(p, e);
    const gg = e.target.closest("[data-gg]");
    if (gg) {
      const before = filledCount(p);
      p.gainGapType = p.gainGapType === gg.dataset.gg ? "" : gg.dataset.gg;
      gg.closest(".aip-gg")
        .querySelectorAll("[data-gg]")
        .forEach((b) =>
          b.setAttribute(
            "aria-checked",
            String(b.dataset.gg === p.gainGapType),
          ),
        );
      saveField(p.id, "gainGapType");
      if (filledCount(p) !== before) {
        renderList();
        refreshHead();
      }
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const what = act.dataset.act;
    if (what === "delete") {
      state.confirmDelete = true;
      state.confirmClear = false;
      renderEditor();
      const keep = editorEl.querySelector('[data-act="delete-no"]');
      if (keep) keep.focus();
    } else if (what === "delete-no") {
      state.confirmDelete = false;
      state.confirmClear = false;
      renderEditor();
      const del = editorEl.querySelector('[data-act="delete"]');
      if (del) del.focus();
    } else if (what === "delete-yes") {
      await deleteProject(p);
    } else if (what === "clear" || what === "clear-no") {
      state.confirmClear = what === "clear";
      state.confirmDelete = false;
      renderEditor();
      const next = editorEl.querySelector(
        what === "clear" ? '[data-act="clear-no"]' : '[data-act="clear"]',
      );
      if (next) next.focus();
    } else if (what === "clear-yes") {
      await clearProject(p);
    }
  });

  // ================= add / delete =================
  async function addProject() {
    try {
      const created = await apiCall("POST", "/aip/project", {});
      state.projects.push(projectFromServer(created));
      setStatus("");
      select(created.id, true);
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function deleteProject(p) {
    const index = state.projects.indexOf(p);
    try {
      await apiCall("DELETE", "/aip/project/" + p.id);
      Object.keys(saveTimers).forEach((k) => {
        if (k.startsWith(p.id + ":")) {
          clearTimeout(saveTimers[k]);
          delete saveTimers[k];
        }
      });
      state.projects.splice(index, 1);
      const next = state.projects[Math.min(index, state.projects.length - 1)];
      state.selectedId = next ? next.id : null;
      state.movMode = null;
      state.confirmDelete = false;
      state.confirmClear = false;
      renderList();
      renderEditor();
      setStatus("");
    } catch (err) {
      state.confirmDelete = false;
      state.confirmClear = false;
      renderEditor();
      setStatus(err.message);
    }
  }

  // Empties every field and the MOV link of one program/project. The item
  // stays in the list, in the same place (Delete removes it).
  async function clearProject(p) {
    Object.keys(saveTimers).forEach((k) => {
      if (k.startsWith(p.id + ":")) {
        clearTimeout(saveTimers[k]);
        delete saveTimers[k];
      }
    });
    // What the server gets (finance: null = empty) and what the editor holds
    // (finance as empty text).
    const blank = {
      title: "",
      sourceOfFund: "",
      objective: "",
      target: "",
      targetFinance: null,
      accomplishment: "",
      accomplishmentFinance: null,
      gainGap: "",
      gainGapType: "",
      recommendation: "",
      movLink: "",
    };
    try {
      await apiCall("POST", "/aip/project/" + p.id, blank);
      Object.assign(p, blank, { targetFinance: "", accomplishmentFinance: "" });
      state.movMode = null;
      state.confirmClear = false;
      renderList();
      renderEditor();
      setStatus("");
    } catch (err) {
      state.confirmClear = false;
      renderEditor();
      setStatus(err.message);
    }
  }

  el("aip-add-btn").addEventListener("click", addProject);

  segsEl.addEventListener("click", (e) => {
    const seg = e.target.closest(".aip-seg[data-id]");
    if (seg) select(Number(seg.dataset.id));
  });

  // Go to the next entry that isn't finished yet (any part still empty).
  nextBtn.addEventListener("click", () => {
    const n = state.projects.length;
    if (!n) return;
    const start = state.projects.findIndex((p) => p.id === state.selectedId);
    for (let k = 1; k <= n; k++) {
      const p = state.projects[(start + k + n) % n];
      if (!isComplete(p)) {
        select(p.id);
        return;
      }
    }
  });

  // ================= reorder: drag and drop, or arrow keys on the grip =================
  async function saveOrder(previous) {
    try {
      await apiCall("POST", "/aip/reorder", {
        ids: state.projects.map((p) => p.id),
      });
      setStatus("");
    } catch (err) {
      state.projects = previous;
      renderList();
      renderEditor();
      setStatus(err.message);
    }
  }

  function moveProject(id, targetId, after) {
    const previous = state.projects.slice();
    const moving = byId(id);
    const rest = state.projects.filter((p) => p.id !== id);
    let at = rest.findIndex((p) => p.id === targetId);
    if (at < 0) return;
    if (after) at += 1;
    rest.splice(at, 0, moving);
    if (rest.every((p, i) => p === previous[i])) return;
    state.projects = rest;
    renderList();
    renderEditor();
    saveOrder(previous);
  }

  let dragId = null;
  const clearDropMarks = () =>
    listEl
      .querySelectorAll(".is-drop-before, .is-drop-after")
      .forEach((r) => r.classList.remove("is-drop-before", "is-drop-after"));
  function endDrag() {
    dragId = null;
    clearDropMarks();
    listEl
      .querySelectorAll(".is-dragging")
      .forEach((r) => r.classList.remove("is-dragging"));
    listEl
      .querySelectorAll(".aip-row[draggable]")
      .forEach((r) => r.removeAttribute("draggable"));
  }

  // Only the grip starts a drag, so the row's text can still be clicked normally.
  listEl.addEventListener("mousedown", (e) => {
    const grip = e.target.closest(".aip-grip");
    if (grip) grip.closest(".aip-row").setAttribute("draggable", "true");
  });
  listEl.addEventListener("mouseup", () =>
    listEl
      .querySelectorAll(".aip-row[draggable]")
      .forEach((r) => r.removeAttribute("draggable")),
  );
  listEl.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".aip-row");
    if (!row) return;
    dragId = Number(row.dataset.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(dragId));
    row.classList.add("is-dragging");
  });
  listEl.addEventListener("dragover", (e) => {
    if (dragId == null) return;
    e.preventDefault();
    clearDropMarks();
    const row = e.target.closest(".aip-row");
    if (!row || Number(row.dataset.id) === dragId) return;
    const r = row.getBoundingClientRect();
    row.classList.add(
      e.clientY > r.top + r.height / 2 ? "is-drop-after" : "is-drop-before",
    );
  });
  listEl.addEventListener("drop", (e) => {
    if (dragId == null) return;
    e.preventDefault();
    const row = e.target.closest(".aip-row");
    const id = dragId;
    endDrag();
    if (!row) return;
    const targetId = Number(row.dataset.id);
    if (targetId === id) return;
    const r = row.getBoundingClientRect();
    moveProject(id, targetId, e.clientY > r.top + r.height / 2);
  });
  listEl.addEventListener("dragend", endDrag);

  listEl.addEventListener("keydown", (e) => {
    const grip = e.target.closest(".aip-grip");
    if (!grip || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const id = Number(grip.closest(".aip-row").dataset.id);
    const i = state.projects.findIndex((p) => p.id === id);
    const j = e.key === "ArrowUp" ? i - 1 : i + 1;
    if (j < 0 || j >= state.projects.length) return;
    moveProject(id, state.projects[j].id, e.key === "ArrowDown");
    const again = listEl.querySelector(`.aip-row[data-id="${id}"] .aip-grip`);
    if (again) again.focus();
  });

  listEl.addEventListener("click", (e) => {
    if (e.target.closest(".aip-grip")) return;
    const row = e.target.closest(".aip-row");
    if (!row) return;
    const id = Number(row.dataset.id);
    if (id !== state.selectedId) select(id);
  });

  // ================= Reset =================
  const overlay = el("aip-reset-confirm-overlay");
  const openReset = () => overlay.classList.add("visible");
  const closeReset = () => overlay.classList.remove("visible");
  el("aip-reset-btn").addEventListener("click", openReset);
  el("aip-reset-confirm-cancel").addEventListener("click", closeReset);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeReset();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeReset();
      closeDrawer();
    }
  });
  el("aip-reset-confirm-confirm").addEventListener("click", async () => {
    try {
      await apiCall("DELETE", "/aip/reset");
      Object.keys(saveTimers).forEach((k) => {
        clearTimeout(saveTimers[k]);
        delete saveTimers[k];
      });
      state.projects = [];
      state.selectedId = null;
      state.movMode = null;
      state.confirmDelete = false;
      state.confirmClear = false;
      closeReset();
      renderList();
      renderEditor();
      setStatus("");
    } catch (err) {
      closeReset();
      setStatus(err.message);
    }
  });

  // ================= School details =================
  // `info` always mirrors the inputs, so Ctrl+P (which cannot wait for a
  // request) prints what is on screen.
  const info = {};
  const infoInputs = Array.from(document.querySelectorAll("[data-info]"));
  const schoolOpenBtn = el("aip-school-open");
  const schoolSumEl = el("aip-school-sum");
  const schoolStatusEl = el("aip-school-status");
  const infoTimers = {};

  function syncInfo() {
    infoInputs.forEach((i) => {
      const v = i.value.trim();
      info[i.dataset.info] = i.dataset.upper ? v.toUpperCase() : v;
    });
    const bits = [info.schoolName, info.schoolHead, info.schoolYear].filter(
      Boolean,
    );
    const missing = bits.length < 3;
    schoolSumEl.textContent = !bits.length
      ? "Not filled in yet"
      : bits.join(" \u00b7 ") + (missing ? " (incomplete)" : "");
    schoolSumEl.classList.toggle("is-incomplete", missing);
    schoolOpenBtn.textContent = bits.length
      ? "Edit school details"
      : "Add school details";
  }

  function setSchoolStatus(message) {
    schoolStatusEl.classList.toggle("is-error", !!message);
    schoolStatusEl.textContent = message
      ? "Couldn\u2019t save: " + message
      : "";
  }

  async function saveInfoField(input) {
    const key = input.dataset.info;
    clearTimeout(infoTimers[key]);
    delete infoTimers[key];
    try {
      await apiCall("POST", "/aip/info", { [key]: input.value });
      setSchoolStatus("");
    } catch (err) {
      setSchoolStatus(err.message);
    }
  }

  async function flushInfo() {
    const seen = new Set();
    const pending = infoInputs.filter((i) => {
      const k = i.dataset.info;
      if (infoTimers[k] === undefined || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    await Promise.all(pending.map(saveInfoField));
  }

  infoInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.dataset.upper) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.toUpperCase();
        try {
          input.setSelectionRange(start, end);
        } catch (e) {
          /* not supported */
        }
      }
      // Inputs that share a key (Name of School Head and Prepared by) mirror each other as you type.
      infoInputs.forEach((other) => {
        if (other !== input && other.dataset.info === input.dataset.info)
          other.value = input.value;
      });
      syncInfo();
      clearTimeout(infoTimers[input.dataset.info]);
      infoTimers[input.dataset.info] = setTimeout(
        () => saveInfoField(input),
        600,
      );
    });
    input.addEventListener("blur", () => {
      if (infoTimers[input.dataset.info] !== undefined) saveInfoField(input);
    });
  });

  function fillInfo(data) {
    infoInputs.forEach((input) => {
      const v = data[input.dataset.info] || "";
      input.value = input.dataset.upper ? v.toUpperCase() : v;
    });
    syncInfo();
  }

  // ---- School and print details drawer ----
  const drawerOverlay = el("aip-drawer-overlay");
  const drawerEl = el("aip-drawer");
  let drawerReturnFocus = null;

  function openDrawer(sectionId) {
    drawerReturnFocus = document.activeElement;
    drawerOverlay.classList.add("visible");
    const sec = el(sectionId);
    const first = sec && sec.querySelector("input");
    if (sec) sec.scrollIntoView({ block: "start" });
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawerOverlay.classList.contains("visible")) return;
    flushInfo(); // save anything still waiting on its typing delay
    drawerOverlay.classList.remove("visible");
    if (drawerReturnFocus && drawerReturnFocus.focus) drawerReturnFocus.focus();
  }

  el("aip-school-open").addEventListener("click", () =>
    openDrawer("aip-sec-school"),
  );
  el("aip-drawer-close").addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("mousedown", (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });
  // Keep Tab inside the open drawer.
  drawerEl.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = Array.from(drawerEl.querySelectorAll("input, button")).filter(
      (x) => !x.disabled,
    );
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

  // ================= Print copy (layout of the school's AIP report) =================
  const printRoot = el("aip-print-root");
  const printBtn = el("aip-print-btn");
  if (printRoot) document.body.appendChild(printRoot);

  const pre = (s) => escapeHtml(s); // line breaks are kept by CSS (white-space: pre-wrap)

  function buildPrintHtml() {
    const headLines = [
      "Republic of the Philippines",
      "Department of Education",
      info.region,
      info.division,
      info.district,
    ]
      .filter(Boolean)
      .map((l) => `<div>${escapeHtml(l)}</div>`)
      .join("");

    const rows = state.projects.length
      ? state.projects
          .map((p) => {
            // Physical text, then "Finance: ₱x" when an amount was entered.
            // With a finance line the physical text is labelled too.
            const withFinance = (physical, finance) => {
              const n = parseMoney(finance);
              const amount = Number.isFinite(n)
                ? "Finance: " + PESO + formatMoney(n)
                : "";
              const text = physical.trim();
              return [text && amount ? "Physical: " + text : text, amount]
                .filter(Boolean)
                .join("\n\n");
            };
            // The objective sits at the top of the Target cell, then a blank line.
            const target = [
              p.objective.trim(),
              withFinance(p.target, p.targetFinance),
            ]
              .filter(Boolean)
              .join("\n\n");
            const accomplishment = withFinance(
              p.accomplishment,
              p.accomplishmentFinance,
            );
            // The source of fund goes under the title.
            const title = [
              p.title.trim(),
              p.sourceOfFund.trim()
                ? "Source of fund: " + p.sourceOfFund.trim()
                : "",
            ]
              .filter(Boolean)
              .join("\n\n");
            return `
              <tr class="ap-row">
                <td>${pre(title)}</td>
                <td>${pre(target)}</td>
                <td>${pre(accomplishment)}</td>
                <td>${pre(p.gainGap)}</td>
                <td>${pre(p.recommendation)}</td>
              </tr>
              <tr class="ap-band"><td colspan="5"></td></tr>`;
          })
          .join("")
      : `<tr class="ap-row"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr><tr class="ap-band"><td colspan="5"></td></tr>`;

    const sign = (label, name, position) => `
      <div class="ap-sign">
        <div class="ap-sign-label">${label}</div>
        <div class="ap-sign-name">${escapeHtml(name)}</div>
        <div class="ap-sign-pos">${escapeHtml(position)}</div>
      </div>`;

    return `
      <div class="ap-sheet">
        <div class="ap-head">
          ${headLines}
          <div class="ap-school">${escapeHtml((info.schoolName || "").toUpperCase())}</div>
          <div class="ap-plan">SCHOOL ANNUAL IMPLEMENTATION PLAN</div>
        </div>
        <div class="ap-title">${escapeHtml(info.reportTitle)}</div>
        ${info.schoolYear ? `<div class="ap-sy">School Year ${escapeHtml(info.schoolYear)}</div>` : ""}
        <table class="ap-table">
          <colgroup><col style="width:18%"><col style="width:29%"><col style="width:22%"><col style="width:11%"><col style="width:20%"></colgroup>
          <thead><tr><th>PROGRAM /PROJECT TITLE</th><th>TARGET</th><th>ACCOMPLISHMENT</th><th>GAINS / GAPS</th><th>RECOMMENDATION</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="ap-signs">
          ${sign("Prepared by:", info.schoolHead, info.headPosition)}
          ${sign("Checked by:", info.checkedByName, info.checkedByPosition)}
          ${sign("Noted by:", info.notedByName, info.notedByPosition)}
        </div>
      </div>`;
  }

  function refreshPrintRoot() {
    syncInfo();
    printRoot.innerHTML = buildPrintHtml();
  }

  if (printBtn && printRoot) {
    let builtForButton = false;
    printBtn.addEventListener("click", async () => {
      await Promise.all([flushAll(), flushInfo()]);
      const restore = () => {
        builtForButton = false;
        window.removeEventListener("afterprint", restore);
      };
      window.addEventListener("afterprint", restore);
      refreshPrintRoot();
      builtForButton = true;
      window.print();
    });
    // Ctrl+P / browser menu print gets the same layout.
    window.addEventListener("beforeprint", () => {
      if (!builtForButton) refreshPrintRoot();
    });
  }

  // ================= Initial load =================
  async function init() {
    syncInfo();
    renderList();
    renderEditor();
    try {
      const data = await apiCall("GET", "/aip/data");
      fillInfo(data.info || {});
      state.projects = (data.projects || []).map(projectFromServer);
      state.selectedId = state.projects.length ? state.projects[0].id : null;
      renderList();
      renderEditor();
    } catch (err) {
      workspaceEl.style.display = "none";
      errorEl.style.display = "";
      errorEl.textContent = "Couldn\u2019t load the AIP report: " + err.message;
    }
  }

  init();
})();
