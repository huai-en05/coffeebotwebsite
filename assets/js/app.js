/* =========================================================
   CoffeeBot Exchange — shared UI helpers
   ========================================================= */

const CBUI = (function () {
  function icon(name, cls) {
    const paths = {
      coffee: '<path d="M3 8h13a3 3 0 0 1 0 6h-1"/><path d="M3 8v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8"/><path d="M6 2v2M9 2v2M12 2v2"/>',
      home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
      upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
      dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
      bell: '<path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2h15Z"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0"/>',
      check: '<path d="M4 12l5 5L20 6"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
      sparkle: '<path d="M12 3v4M12 17v4M4.2 12H8M16 12h3.8M6.5 6.5l2.3 2.3M15.2 15.2l2.3 2.3M6.5 17.5l2.3-2.3M15.2 8.8l2.3-2.3"/><circle cx="12" cy="12" r="2"/>',
      trend: '<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>',
      map: '<path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
      leaf: '<path d="M4 20c8 0 14-6 16-16-10 2-16 8-16 16Z"/><path d="M6 18c2-4 5-7 11-10"/>',
      box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
      bean: '<ellipse cx="12" cy="12" rx="6" ry="9" transform="rotate(-30 12 12)"/><path d="M15 4.5c-4 4-.5 9-6 15"/>',
      sprout: '<path d="M12 21v-9"/><path d="M12 13c-4 0-7-2.5-7-7 4 0 7 2.5 7 7Z"/><path d="M12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6Z"/><path d="M5 21h14"/>',
      scale: '<path d="M5 20h14"/><path d="M12 4v16"/><path d="M5 8h14"/><path d="M5 8l-3 6a3 3 0 0 0 6 0Z"/><path d="M19 8l-3 6a3 3 0 0 0 6 0Z"/>',
      cup: '<path d="M5 8h12l-1.5 11a2 2 0 0 1-2 1.7h-5a2 2 0 0 1-2-1.7Z"/><path d="M4 8h14"/><path d="M16.5 11h1.5a2.5 2.5 0 0 1 0 5h-2"/><path d="M9 2.5c-1 1 1 2 0 3M13 2.5c-1 1 1 2 0 3"/>',
    };
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
  }

  /* ---------- hand-drawn line doodles (single stroke, currentColor) ---------- */
  const DOODLES = {
    // CoffeeBot mascot: a takeaway cup with a face, antenna and a sprout in hand
    mascot: '<path d="M100 34V18"/><circle cx="100" cy="13" r="5"/><path d="M60 48q40-18 80 0"/><rect x="54" y="48" width="92" height="14" rx="7"/><path d="M60 62l12 110q2 10 12 10h32q10 0 12-10l12-110"/><path d="M64 98h72M68 140h64"/><circle cx="88" cy="114" r="3.5" fill="currentColor"/><circle cx="112" cy="114" r="3.5" fill="currentColor"/><path d="M90 124q10 8 20 0"/><path d="M65 110q-19 6-23 24"/><path d="M42 134v-22"/><path d="M42 120q-12-4-14-16 12 2 14 16Z"/><path d="M42 114q10-8 14-18-12 4-14 18Z"/><path d="M135 104q19-8 23-26"/><circle cx="159" cy="74" r="4"/><path d="M88 182v12h-8M112 182v12h8"/><path d="M76 30q-6-6 0-12t0-12M124 30q-6-6 0-12t0-12"/>',
    // mug of grounds with a sprout growing out
    sproutCup: '<path d="M44 84l12 82q2 10 12 10h52q10 0 12-10l12-82Z"/><path d="M142 102q28-2 24 24-4 22-30 20"/><path d="M48 100q22-6 46 0t46 0"/><circle cx="66" cy="114" r="2.4" fill="currentColor"/><circle cx="90" cy="124" r="2.4" fill="currentColor"/><circle cx="114" cy="112" r="2.4" fill="currentColor"/><circle cx="124" cy="132" r="2.4" fill="currentColor"/><path d="M94 98q-4-28 4-58"/><path d="M93 72q-25-4-33-28 26 0 33 28Z"/><path d="M96 56q16-20 40-20-8 26-40 20Z"/>',
    // seedling in a soil mound, with a worm
    seedling: '<path d="M20 160q80-50 160 0"/><path d="M100 136V80"/><path d="M100 102q-26-4-34-28 26 0 34 28Z"/><path d="M100 90q18-22 42-20-8 26-42 20Z"/><circle cx="62" cy="150" r="2.4" fill="currentColor"/><circle cx="138" cy="148" r="2.4" fill="currentColor"/><circle cx="84" cy="142" r="2.4" fill="currentColor"/><circle cx="120" cy="140" r="2.4" fill="currentColor"/><path d="M50 182q8-8 16 0t16 0t16 0"/><circle cx="102" cy="178" r="2" fill="currentColor"/>',
    // a bag of collected grounds with a label
    bag: '<path d="M62 64l-10 112h96l-10-112Z"/><path d="M62 64q38-16 76 0"/><path d="M80 60q2-22 20-22t20 22"/><rect x="72" y="102" width="56" height="42" rx="8"/><path d="M84 116h32M88 130h24"/><path d="M40 182h120"/>',
    bean: '<ellipse cx="100" cy="100" rx="46" ry="68" transform="rotate(-25 100 100)"/><path d="M123 50C92 74 118 120 77 150"/>',
  };

  function doodle(name, cls) {
    return `<svg class="${cls || "doodle"}" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DOODLES[name] || ""}</svg>`;
  }

  // Big, faint background strokes.
  function swirl() {
    return `<svg class="swirl" viewBox="0 0 1200 600" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="46" stroke-linecap="round" aria-hidden="true"><path d="M-60 430C180 120 420 110 520 300S820 580 990 300 1180 40 1280 150"/></svg>`;
  }

  // Ragged "torn paper" edge; fill colour comes from CSS `color`.
  function torn(cls) {
    let d = "M0 22 L0 12";
    for (let x = 16, i = 0; x <= 1200; x += 16, i++) d += ` L${x} ${4 + ((i * 7) % 11)}`;
    d += " L1200 22 Z";
    return `<svg class="torn ${cls || ""}" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
  }

  // Fill any <span data-doodle="name"> placeholders on the page.
  function fillDoodles(root) {
    (root || document).querySelectorAll("[data-doodle]").forEach((el) => {
      el.outerHTML = doodle(el.dataset.doodle, el.className || "doodle");
    });
    (root || document).querySelectorAll("[data-swirl]").forEach((el) => (el.outerHTML = swirl()));
    (root || document).querySelectorAll("[data-torn]").forEach((el) => (el.outerHTML = torn(el.dataset.torn)));
  }

  function topbar({ role, activePage }) {
    const custLinks = [
      ["home.html", "Home"],
      ["order.html", "Request & Log"],
      ["dashboard.html", "Impact"],
      ["past-orders.html", "Past Orders"],
    ];
    const adminLinks = [
      ["home.html", "Overview"],
      ["upload.html", "Collections"],
      ["operations.html", "Operations"],
      ["forecast.html", "Forecast"],
      ["allocation.html", "Allocation"],
    ];
    const links = role === "admin" ? adminLinks : custLinks;
    const linksHtml = links
      .map(([href, label]) => `<a href="${href}" class="${activePage === href ? "active" : ""}">${label}</a>`)
      .join("");
    const session = CB.getState().auth[role];

    return `
    <header class="topbar">
      <div class="topbar-inner">
        <nav class="nav-links">${linksHtml}</nav>
        <a class="brand" href="home.html">
          <span class="mark">${doodle("mascot", "")}</span>
          <span class="brand-name">CoffeeBot<span>${role === "admin" ? "staff portal" : "partner portal"}</span></span>
        </a>
        <div class="nav-right">
          <span class="nav-user">${session ? esc(session.email.split("@")[0]) : ""}</span>
          <button class="btn-secondary btn-sm" onclick="CBUI.logout('${role}')">Log out</button>
        </div>
      </div>
    </header>`;
  }

  function mount(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  function requireAuth(role) {
    const state = CB.getState();
    const session = state.auth[role];
    if (!session) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  function login(role, email) {
    CB.setState((s) => {
      s.auth[role] = { email, loginAt: Date.now() };
    });
  }

  function logout(role) {
    CB.setState((s) => {
      s.auth[role] = null;
    });
    window.location.href = "login.html";
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function regionOptions(selectedId) {
    return CB.REGIONS.map(
      (r) =>
        `<option value="${r.id}" ${r.id === selectedId ? "selected" : ""}>${r.name} — ${r.location}</option>`
    ).join("");
  }

  /* ---------- lightweight bar chart (SVG, gridlines + axis labels) ---------- */
  function barChart({ container, labels, series, height = 220, formatY = (v) => v }) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    const w = el.clientWidth || 640;
    const h = height;
    const padL = 42, padB = 28, padT = 10, padR = 14;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const allVals = series.flatMap((s) => s.values);
    let maxVal = Math.max(...allVals, 1);
    // nice round max
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
    maxVal = Math.ceil(maxVal / (magnitude / 2)) * (magnitude / 2);
    if (maxVal === 0) maxVal = 1;

    const n = labels.length;
    const groupW = plotW / n;
    const barGap = series.length > 1 ? 4 : 0;
    const barW = Math.max(4, (groupW - 14) / series.length - barGap);

    const gridCount = 4;
    let gridLines = "";
    let yLabels = "";
    for (let i = 0; i <= gridCount; i++) {
      const v = (maxVal / gridCount) * i;
      const y = padT + plotH - (v / maxVal) * plotH;
      gridLines += `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" stroke="var(--gridline)" stroke-width="1" stroke-dasharray="3 4"/>`;
      yLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" font-family="Manrope, sans-serif" fill="var(--muted)">${formatY(maxVal < 10 ? parseFloat(v.toFixed(2)) : Math.round(v))}</text>`;
    }

    let bars = "";
    let xLabels = "";
    labels.forEach((label, i) => {
      const groupX = padL + i * groupW + 7;
      series.forEach((s, si) => {
        const val = s.values[i] || 0;
        const barH = (val / maxVal) * plotH;
        const x = groupX + si * (barW + barGap);
        const y = padT + plotH - barH;
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, barH)}" rx="${Math.min(6, barW / 2)}" fill="${s.color}"></rect>`;
      });
      xLabels += `<text x="${groupX + (groupW - 14) / 2}" y="${h - 8}" text-anchor="middle" font-size="11" font-family="Manrope, sans-serif" fill="var(--muted)">${label}</text>`;
    });

    el.innerHTML = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${gridLines}${yLabels}${bars}${xLabels}
      <line x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT + plotH}" stroke="var(--line)" stroke-width="1"/>
      <line x1="${padL}" x2="${w - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--line)" stroke-width="1"/>
    </svg>`;
  }

  /* ---------- AI generator panel (Gemini via Apps Script) ---------- */
  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // EcoLogits gives a min–max range; show the midpoint with sensible precision.
  function mid(range) {
    return (range.min + range.max) / 2;
  }
  function fmtImpact(v, unit) {
    return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)) + " " + unit;
  }
  function footprintHtml(fp) {
    if (!fp) return `<span>Footprint estimate unavailable for this run.</span>`;
    return `<span class="eco-line">${icon("leaf", "icon-sm")}
      This run: ~${fmtImpact(mid(fp.energyWh), "Wh")} · ${fmtImpact(mid(fp.gwpG), "g CO₂e")} · ${fmtImpact(mid(fp.waterMl), "mL water")}</span>
      <span>Estimated by <a href="https://ecologits.ai" target="_blank" rel="noopener">EcoLogits</a></span>`;
  }

  function aiResultHtml(payload) {
    const r = payload.result || {};
    const when = payload.generatedAt ? CB.fmtDate(new Date(payload.generatedAt).getTime()) : "";
    const stats = (r.stats || []).map((s) => `
      <div class="ai-stat ${esc(s.tone)}">
        <div class="ai-stat-lbl">${esc(s.label)}</div>
        <div class="ai-stat-num">${esc(s.value)}</div>
        <div class="ai-stat-note">${esc(s.note)}</div>
      </div>`).join("");
    const list = (items) => (items || []).map((t) => `<li>${esc(t)}</li>`).join("");
    return `
      <p class="ai-headline">${esc(r.headline)}</p>
      <div class="ai-stats">${stats}</div>
      <div class="ai-columns">
        <div><h4>What stands out</h4><ul class="ai-list">${list(r.insights)}</ul></div>
        <div><h4>Next actions</h4><ul class="ai-list actions">${list(r.actions)}</ul></div>
      </div>
      <div class="ai-foot">
        ${footprintHtml(payload.footprint)}
        <span>Generated ${esc(when)} · ${esc(payload.model || "Gemini")}</span>
      </div>`;
  }

  function aiErrorHtml(err) {
    const notConfigured = err.message === "not_configured";
    return `
      <div class="ai-error">
        <strong>${notConfigured ? "AI endpoint not connected yet" : "Couldn't generate insights"}</strong>
        <p>${notConfigured
          ? "Set <code>AI_ENDPOINT</code> in <code>assets/js/config.js</code> to your deployed Apps Script URL — see <code>docs/gemini-apps-script-setup.md</code>."
          : esc(err.message)}</p>
      </div>`;
  }

  // Mounts an AI insights card with a Generate button for one task
  // (briefing | forecast | allocation). Shows the last result on load.
  function aiGenerator({ container, task, title, description, buttonLabel = "Generate", onGenerated }) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    el.innerHTML = `
      <section class="ai-card">
        ${doodle("mascot", "ai-doodle")}
        <div class="ai-card-head">
          <div>
            <div class="ai-tag">ai insights, by Gemini</div>
            <h2>${esc(title)}</h2>
            <p>${esc(description)}</p>
          </div>
          <button class="btn-primary" type="button">${esc(buttonLabel)}</button>
        </div>
        <div class="ai-body"></div>
      </section>`;
    const body = el.querySelector(".ai-body");
    const btn = el.querySelector("button");
    const last = CBAI.lastResult(task);
    body.innerHTML = last
      ? aiResultHtml(last)
      : `<div class="ai-empty">Nothing generated yet. Click <strong>${esc(buttonLabel)}</strong> and Gemini will read the latest data and write up the key numbers, what stands out, and what to do next.</div>`;
    if (last) btn.textContent = "Regenerate";

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Generating…";
      body.innerHTML = `<div class="ai-loading"></div><div class="ai-loading-note">Reading this week's data…</div>`;
      try {
        body.innerHTML = aiResultHtml(await CBAI.generate(task));
        if (onGenerated) onGenerated();
      } catch (err) {
        body.innerHTML = aiErrorHtml(err);
      } finally {
        btn.disabled = false;
        btn.textContent = "Regenerate";
      }
    });
  }

  // Running total of every AI generation's EcoLogits footprint in this browser.
  function greenLedger(container) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    const t = CBAI.footprintTotals();
    const savedKg = CB.getState().partners.reduce((a, p) => a + p.co2eKg, 0);
    const ratio = t.gwpG > 0 ? Math.round((savedKg * 1000) / t.gwpG) : 0;
    el.innerHTML = `
      <div class="card">
        <div class="eyebrow">green AI ledger</div>
        <h2>What our AI use costs the planet</h2>
        <div class="ledger">
          <div><div class="num">${t.count}</div><div class="lbl">AI generations</div></div>
          <div><div class="num">${fmtImpact(t.energyWh, "Wh")}</div><div class="lbl">Electricity</div></div>
          <div><div class="num">${fmtImpact(t.gwpG, "g")}</div><div class="lbl">CO₂e emitted</div></div>
          <div><div class="num">${fmtImpact(t.waterMl, "mL")}</div><div class="lbl">Water consumed</div></div>
        </div>
        <p class="subtext" style="font-size:.82rem;">${t.count
          ? `Grounds diverted so far have saved ~${savedKg.toFixed(1)} kg CO₂e — about ${ratio.toLocaleString("en-SG")}× what our AI generations emitted.`
          : "Each generation's energy, emissions and water use will be tallied here."}
          Estimates by <a class="link" href="https://ecologits.ai" target="_blank" rel="noopener">EcoLogits</a>.</p>
      </div>`;
  }

  // Pages load this script near the end of <body>, so placeholders already exist.
  if (typeof document !== "undefined") fillDoodles();

  return { icon, doodle, topbar, mount, requireAuth, login, logout, toast, regionOptions, barChart, aiGenerator, greenLedger, esc };
})();
