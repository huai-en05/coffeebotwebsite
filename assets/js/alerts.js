/* =========================================================
   CoffeeBot Exchange — supply alerts
   Rules that watch the data and flag what an ops staffer should
   look at: a region with no collections logged, dried supply
   nobody has asked for, and a wet week that will slow drying.
   Shown in the bell on every admin page and on the Overview.
   ========================================================= */

const CBAlerts = (function () {
  const DISMISS_KEY = "coffeebot_alerts_hidden_v1";
  const DAY = 86400000;
  const MISSING_AFTER_DAYS = 7;  // no collection logged for longer than this
  const EXCESS_MIN_KG = 0.25;    // unclaimed dried grounds in a region…
  const EXCESS_MIN_SHARE = 0.5;  // …that's at least half of its weekly supply
  const WET_WEEK_POOR_DAYS = 3;  // poor drying days in the next 7

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const fmtKg = (n) => (n < 1 ? n.toFixed(2) : n.toFixed(1)) + " kg";
  const joinNames = (names) => names.length <= 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

  function missingAlerts(state, now) {
    return CB.COLLECTABLE.flatMap((r) => {
      const times = state.collections.filter((c) => c.region === r.id).map((c) => c.collectedAt);
      const last = times.length ? Math.max(...times) : null;
      const days = last ? Math.floor((now - last) / DAY) : null;
      if (last && days <= MISSING_AFTER_DAYS) return [];
      return [{
        id: "missing-" + r.id,
        icon: "warning",
        title: last ? `No ${r.name} data for ${days} days` : `No ${r.name} collections logged yet`,
        body: (last ? `Nothing logged from ${r.location} since ${new Date(last).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}.` : `Nothing has been logged from ${r.location}.`) +
          ` ${r.name}'s forecast is running on its baseline until a round is logged.`,
        action: { label: "Log a collection", href: "upload.html?region=" + r.id },
      }];
    });
  }

  // Dried supply for the week (normal weather — the grounds still exist,
  // they just dry slower) minus what pending requests in that region want.
  // Regions already flagged as missing data are skipped: their supply is a guess.
  function excessAlert(state, missingIds) {
    const regions = CBAI.dryForecastByRegion(7).filter((f) => !missingIds.includes(f.region.id)).map((f) => {
      const supply = sum(f.unadjusted);
      const wanted = sum(state.requests.filter((q) => q.status === "pending" && q.region === f.region.id).map((q) => q.volumeKg));
      return { region: f.region, supply, unclaimed: Math.max(0, supply - wanted) };
    }).filter((x) => x.unclaimed >= EXCESS_MIN_KG && x.unclaimed >= x.supply * EXCESS_MIN_SHARE)
      .sort((a, b) => b.unclaimed - a.unclaimed);
    if (!regions.length) return [];
    const total = sum(regions.map((x) => x.unclaimed));
    return [{
      id: "excess-" + regions.map((x) => x.region.id).join("-"),
      icon: "box",
      title: `Excess supply in ${joinNames(regions.map((x) => x.region.name))}`,
      body: `~${fmtKg(total)} of dried grounds this week has no request yet (${regions.map((x) => `${x.region.name} ${fmtKg(x.unclaimed)}`).join(", ")}). Offer it to recurring partners or find a new off-taker.`,
      action: { label: "Open allocation", href: "allocation.html" },
    }];
  }

  function weatherAlert() {
    const days = CBWeather.cached();
    if (!days) return [];
    const poor = days.filter((d) => d.rating === "poor");
    if (poor.length < WET_WEEK_POOR_DAYS) return [];
    const names = poor.map((d) => new Date(d.date + "T00:00").toLocaleDateString("en-SG", { weekday: "short" }));
    const dry = CBAI.dryForecastByRegion(7);
    const lost = sum(dry.map((f) => sum(f.unadjusted) - sum(f.values)));
    return [{
      id: "wet-" + days[0].date,
      icon: "rain",
      title: `Wet week ahead: ${poor.length} poor drying days`,
      body: `Rain or high humidity on ${joinNames(names)}. Expect ~${fmtKg(lost)} less dried grounds than usual — leave extra drying time before handing over.`,
      action: { label: "See the forecast", href: "forecast.html" },
    }];
  }

  function hidden() {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  // Active alerts. A hidden alert comes back after a day if it still applies.
  function list() {
    const state = CB.getState();
    const now = Date.now();
    const h = hidden();
    const missing = missingAlerts(state, now);
    return [...missing, ...excessAlert(state, missing.map((a) => a.id.replace("missing-", ""))), ...weatherAlert()]
      .filter((a) => !(h[a.id] && now - h[a.id] < DAY));
  }

  function hide(id) {
    const h = hidden();
    h[id] = Date.now();
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(h));
    } catch (e) {}
    refresh();
  }

  function itemHtml(a) {
    return `
      <li class="alert-item">
        <span class="alert-icon">${CBUI.icon(a.icon)}</span>
        <div class="alert-text">
          <strong>${CBUI.esc(a.title)}</strong>
          <p>${CBUI.esc(a.body)}</p>
          <div class="alert-actions">
            <a class="link" href="${a.action.href}">${CBUI.esc(a.action.label)}</a>
            <button type="button" data-hide="${a.id}">Hide for today</button>
          </div>
        </div>
      </li>`;
  }

  function listHtml(alerts) {
    return alerts.length
      ? `<ul class="alert-list">${alerts.map(itemHtml).join("")}</ul>`
      : `<div class="empty-note">All clear — every region has recent data and nothing's piling up.</div>`;
  }

  function wireHide(root) {
    root.querySelectorAll("[data-hide]").forEach((b) => b.addEventListener("click", () => hide(b.dataset.hide)));
  }

  function renderBell(el) {
    const alerts = list();
    const open = el.classList.contains("open");
    el.innerHTML = `
      <button type="button" class="bell-btn" aria-label="${alerts.length} alerts" aria-expanded="${open}">
        ${CBUI.icon("bell")}${alerts.length ? `<span class="bell-count">${alerts.length}</span>` : ""}
      </button>
      <div class="alert-panel">
        <div class="alert-panel-head"><h3>Alerts</h3><span class="subtext">${alerts.length || "No"} to look at</span></div>
        ${listHtml(alerts)}
      </div>`;
    el.querySelector(".bell-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      el.classList.toggle("open");
      el.querySelector(".bell-btn").setAttribute("aria-expanded", el.classList.contains("open"));
    });
    el.querySelector(".alert-panel").addEventListener("click", (e) => e.stopPropagation());
    wireHide(el);
  }

  // "Needs attention" card for the Overview page.
  function renderCard(el) {
    const alerts = list();
    el.innerHTML = `
      <div class="card alert-card">
        <div class="card-head"><h2>Needs attention</h2><span class="subtext">${alerts.length ? alerts.length + " alert" + (alerts.length > 1 ? "s" : "") : "All clear"}</span></div>
        ${listHtml(alerts)}
      </div>`;
    wireHide(el);
  }

  function refresh() {
    document.querySelectorAll("[data-alert-bell]").forEach(renderBell);
    document.querySelectorAll("[data-alert-card]").forEach(renderCard);
  }

  // Runs after each page's own script has mounted the top bar.
  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    document.addEventListener("click", () => document.querySelectorAll("[data-alert-bell].open").forEach((b) => b.classList.remove("open")));
    CBWeather.load().then(refresh).catch(() => {});
  });

  return { list, hide, refresh };
})();
