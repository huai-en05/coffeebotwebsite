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
    };
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
  }

  function topbar({ role, activePage, title }) {
    const custLinks = [
      ["home.html", "Home"],
      ["order.html", "Request & Log"],
      ["dashboard.html", "Dashboard"],
      ["past-orders.html", "Past Orders"],
    ];
    const adminLinks = [
      ["home.html", "Home"],
      ["upload.html", "Upload"],
      ["operations.html", "Operations"],
      ["forecast.html", "Forecast"],
      ["allocation.html", "Allocation"],
    ];
    const links = role === "admin" ? adminLinks : custLinks;
    const base = role === "admin" ? "" : "";
    const linksHtml = links
      .map(([href, label]) => `<a href="${href}" class="${activePage === href ? "active" : ""}">${label}</a>`)
      .join("");

    return `
    <header class="topbar">
      <a class="brand" href="home.html">
        <span class="mark">${icon("coffee", "icon-sm")}</span>
        CoffeeBot Exchange
      </a>
      <div class="nav-right">
        <nav class="nav-links">${linksHtml}</nav>
        <span class="role-tag">${role === "admin" ? "Admin" : "Customer"}</span>
        <button class="bell" title="Notifications">${icon("bell", "icon-sm")}</button>
        <button class="logout-btn" onclick="CBUI.logout('${role}')">Log out</button>
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
      gridLines += `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" stroke="var(--gridline)" stroke-width="1"/>`;
      yLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="var(--brown-text)">${formatY(Math.round(v))}</text>`;
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
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(0, barH)}" rx="2.5" fill="${s.color}"></rect>`;
      });
      xLabels += `<text x="${groupX + (groupW - 14) / 2}" y="${h - 8}" text-anchor="middle" font-size="10.5" fill="var(--brown-text)">${label}</text>`;
    });

    el.innerHTML = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${gridLines}${yLabels}${bars}${xLabels}
      <line x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT + plotH}" stroke="var(--divider)" stroke-width="1"/>
      <line x1="${padL}" x2="${w - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--divider)" stroke-width="1"/>
    </svg>`;
  }

  return { icon, topbar, mount, requireAuth, login, logout, toast, regionOptions, barChart };
})();
