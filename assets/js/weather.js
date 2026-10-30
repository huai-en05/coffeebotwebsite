/* =========================================================
   CoffeeBot Exchange — drying weather (Open-Meteo)
   Grounds rest 2–4 days and are then dried before they can be
   passed on, and they dry badly on wet, humid days. This module
   pulls a free 7-day forecast from Open-Meteo (no key needed),
   rates each day for drying, and caches it for a few hours so
   every page can read it synchronously.
   ========================================================= */

const CBWeather = (function () {
  const CACHE_KEY = "coffeebot_weather_v1";
  const MAX_AGE_MS = 3 * 60 * 60 * 1000;

  // Where grounds are dried. Defaults to central Singapore; set
  // WEATHER_LAT / WEATHER_LON in config.js to the office's location.
  function coords() {
    const c = typeof CB_CONFIG !== "undefined" ? CB_CONFIG : {};
    return { lat: c.WEATHER_LAT ?? 1.3521, lon: c.WEATHER_LON ?? 103.8198 };
  }

  // How much of a normal day's drying gets done. Thresholds are our own
  // planning assumptions (see docs/data-sources.md), not CoffeeBot figures.
  const RATINGS = {
    good: { label: "Good", factor: 1.0 },
    fair: { label: "Fair", factor: 0.6 },
    poor: { label: "Poor", factor: 0.3 },
  };

  function rate(day) {
    if (day.rainMm >= 10 || day.humidity >= 90) return "poor";
    if (day.rainMm >= 2 || day.humidity >= 85 || day.rainChance >= 70) return "fair";
    return "good";
  }

  // WMO weather codes → a doodle icon name from app.js.
  function iconFor(code) {
    if (code >= 51) return "rain";   // drizzle, rain, showers, thunderstorms
    if (code >= 2) return "clouds";  // partly cloudy, overcast, fog
    return "sun";
  }

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return c && Array.isArray(c.days) ? c : null;
    } catch (e) {
      return null;
    }
  }

  // Last forecast we fetched (possibly stale), or null if we never got one.
  function cached() {
    const c = readCache();
    return c ? c.days : null;
  }

  async function load() {
    const c = readCache();
    if (c && Date.now() - c.fetchedAt < MAX_AGE_MS) return c.days;

    const { lat, lon } = coords();
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&daily=weather_code,precipitation_sum,precipitation_probability_max,relative_humidity_2m_mean,temperature_2m_max" +
      "&timezone=Asia%2FSingapore&forecast_days=7";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo returned HTTP " + res.status);
    const d = (await res.json()).daily;
    const days = d.time.map((date, i) => {
      const day = {
        date,
        code: d.weather_code[i],
        rainMm: d.precipitation_sum[i] ?? 0,
        rainChance: d.precipitation_probability_max[i] ?? 0,
        humidity: d.relative_humidity_2m_mean[i] ?? 0,
        tempMax: d.temperature_2m_max[i],
      };
      day.rating = rate(day);
      return day;
    });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), days }));
    } catch (e) {}
    return days;
  }

  // Drying factor for each of the next `n` days; 1.0 everywhere when
  // there's no forecast, so supply figures fall back to "normal weather".
  function factors(n = 7) {
    const days = cached();
    return Array.from({ length: n }, (_, i) => (days && days[i] ? RATINGS[days[i].rating].factor : 1));
  }

  function summary(days) {
    const poor = days.filter((d) => d.rating === "poor").length;
    const fair = days.filter((d) => d.rating === "fair").length;
    const wettest = days.reduce((a, b) => (b.rainMm > a.rainMm ? b : a), days[0]);
    return { poor, fair, good: days.length - poor - fair, wettest };
  }

  function daysHtml(days) {
    return `<div class="wx-days">${days.map((d, i) => `
      <div class="wx-day ${d.rating}">
        <div class="wx-name">${i === 0 ? "Today" : new Date(d.date + "T00:00").toLocaleDateString("en-SG", { weekday: "short" })}</div>
        ${CBUI.icon(iconFor(d.code))}
        <div class="wx-rain">${d.rainMm.toFixed(1)} mm</div>
        <div class="wx-meta">${d.rainChance}% rain · ${d.humidity}% RH</div>
        <span class="pill ${d.rating}">${RATINGS[d.rating].label}</span>
      </div>`).join("")}</div>`;
  }

  function noteHtml(days) {
    const s = summary(days);
    const lead = s.poor >= 3
      ? `A wet stretch: ${s.poor} of the next ${days.length} days are poor for drying.`
      : s.poor + s.fair
        ? `${s.good} good, ${s.fair} fair and ${s.poor} poor drying days ahead.`
        : "Dry, settled weather — a good week for drying.";
    return `<p class="wx-note">${lead} Grounds rest 2–4 days before drying, so rain now mostly slows what's handed over later this week.
      Forecast: <a class="link" href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0).</p>`;
  }

  // 7-day drying forecast card. Renders from cache straight away, then
  // refreshes when a newer forecast arrives; onUpdate lets the page
  // recompute any weather-adjusted numbers.
  function card(container, { title = "Drying weather", onUpdate } = {}) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    const draw = (days, error) => {
      el.innerHTML = `
        <div class="card">
          <div class="card-head"><h2>${title}</h2><span class="subtext">Next 7 days · where grounds are dried</span></div>
          ${days ? daysHtml(days) + noteHtml(days)
            : `<div class="empty-note">${error ? "Couldn't reach the weather service — supply figures assume normal drying weather." : "Loading the forecast…"}</div>`}
        </div>`;
    };
    draw(cached());
    load().then((days) => { draw(days); if (onUpdate) onUpdate(days); })
      .catch(() => { if (!cached()) draw(null, true); });
  }

  return { RATINGS, load, cached, factors, summary, iconFor, card };
})();
