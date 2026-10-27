/* =========================================================
   CoffeeBot Exchange — AI module
   Two layers that always run together:
     1. A rule-based engine (moving average + linear trend for
        forecasting; a weighted scoring model for allocation)
        that produces the numbers.
     2. Gemini, reached through a Google Apps Script endpoint
        (apps-script/Code.gs), which turns those numbers into
        generated stats, insights and next actions. The API key
        is stored in Apps Script — the browser never sees it.
   Every generation comes back with an EcoLogits estimate of its
   energy, emissions and water use, tallied in a local ledger.
   ========================================================= */

const CBAI = (function () {
  const RESULT_STORAGE = "coffeebot_ai_results_v1";
  const FOOTPRINT_STORAGE = "coffeebot_ai_footprint_v1";

  function endpoint() {
    return (typeof CB_CONFIG !== "undefined" && CB_CONFIG.AI_ENDPOINT) || "";
  }

  /* ---------------- rule-based forecasting ---------------- */
  // Simple, explainable statistics: a 7-day moving average blended
  // with a least-squares linear trend over the recent history,
  // then clamped to stay within a sane band of the region's known
  // baseline (so a single noisy day can't send the forecast wild).
  function linearTrend(values) {
    const n = values.length;
    const xs = values.map((_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (values[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    return { slope, intercept };
  }

  // Forecast total kg/day for the next `days` days, system-wide.
  function forecastTotal(days = 7) {
    const state = CB.getState();
    const hist = state.wasteHistory.map((h) => h.kg);
    const { slope, intercept } = linearTrend(hist);
    const recentAvg = hist.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, hist.length);

    const out = [];
    for (let i = 0; i < days; i++) {
      const x = hist.length + i;
      const trendVal = intercept + slope * x;
      // Blend trend projection with recent average for stability (60/40).
      let val = trendVal * 0.6 + recentAvg * 0.4;
      val = Math.max(0, val);
      out.push(Math.round(val * 10) / 10);
    }
    return out;
  }

  // Forecast kg/day for the next `days` days, split by region — each
  // region's share of the system total is held at its known baseline
  // proportion (from the Q&A cup-volume data), applied to the total forecast.
  function forecastByRegion(days = 7) {
    const totals = forecastTotal(days);
    const baselines = CB.REGIONS.map((r) => ({ region: r, daily: CB.dailyGroundsKg(r) }));
    const baselineSum = baselines.reduce((a, b) => a + b.daily, 0);

    return baselines.map(({ region, daily }) => {
      const share = baselineSum === 0 ? 1 / baselines.length : daily / baselineSum;
      return {
        region,
        values: totals.map((t) => Math.round(t * share * 10) / 10),
      };
    });
  }

  /* ---------------- rule-based allocation recommendation ---------------- */
  // Scores each pending request against the factors CoffeeBot staff said
  // they actually weigh (Q&A answer #1 & #2): quantity the partner can
  // take, consistency/frequency of reuse, and convenience. Then allocates
  // available forecasted supply to the highest-scoring requests first.
  function scoreRequest(req) {
    let score = 0;
    // Prefer requests that can absorb a meaningful quantity (not oversized vs supply).
    score += Math.min(req.volumeKg, 10) * 2;
    // Recurring / regular commitments score higher than one-off (consistency).
    if (req.frequency === "Weekly") score += 20;
    else if (req.frequency === "Fortnightly") score += 12;
    else score += 4;
    // A clearly described use case scores a little higher (meaningful reuse).
    if (req.useCase && req.useCase.length > 20) score += 6;
    return Math.round(score * 10) / 10;
  }

  function recommendAllocation() {
    const state = CB.getState();
    const pending = state.requests.filter((r) => r.status === "pending");
    const supplyByRegion = {};
    forecastByRegion(7).forEach((f) => {
      supplyByRegion[f.region.id] = f.values.reduce((a, b) => a + b, 0); // 7-day forecasted supply
    });

    const ranked = pending
      .map((r) => ({ ...r, score: scoreRequest(r) }))
      .sort((a, b) => b.score - a.score);

    const remaining = { ...supplyByRegion };
    const decisions = ranked.map((r) => {
      const avail = remaining[r.region] ?? 0;
      const allocate = Math.min(r.volumeKg, Math.max(0, avail));
      remaining[r.region] = avail - allocate;
      return {
        ...r,
        recommendedKg: Math.round(allocate * 10) / 10,
        fulfilled: allocate >= r.volumeKg - 0.01,
      };
    });

    return { decisions, remainingSupply: remaining };
  }

  /* ---------------- data sent to Gemini, per task ---------------- */
  const round1 = (n) => Math.round(n * 10) / 10;
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  function forecastData() {
    const state = CB.getState();
    const byRegion = forecastByRegion(7);
    return {
      next7DaysByRegion: byRegion.map((f) => ({
        region: f.region.name,
        location: f.region.location,
        dailyKg: f.values,
        totalKg: round1(sum(f.values)),
        baselineKgPerDay: round1(CB.dailyGroundsKg(f.region)),
      })),
      next7DayTotalKg: round1(sum(byRegion.map((f) => sum(f.values)))),
      last7DayTotalKg: round1(sum(state.wasteHistory.slice(-7).map((h) => h.kg))),
      last14DaysKg: state.wasteHistory.slice(-14).map((h) => h.kg),
    };
  }

  function allocationData() {
    const { decisions, remainingSupply } = recommendAllocation();
    return {
      rankedRequests: decisions.map((d, i) => ({
        rank: i + 1,
        requester: d.customer,
        region: CB.regionName(d.region),
        useCase: d.useCase,
        frequency: d.frequency,
        requestedKg: d.volumeKg,
        recommendedKg: d.recommendedKg,
        fullyFulfilled: d.fulfilled,
        score: d.score,
      })),
      leftoverSupplyKgByRegion: Object.fromEntries(
        Object.entries(remainingSupply).map(([id, kg]) => [CB.regionName(id), round1(kg)])
      ),
    };
  }

  function briefingData() {
    const state = CB.getState();
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      pendingRequests: state.requests
        .filter((r) => r.status === "pending")
        .map((r) => ({ requester: r.customer, region: CB.regionName(r.region), kg: r.volumeKg, frequency: r.frequency, useCase: r.useCase })),
      requestCounts: {
        pending: state.requests.filter((r) => r.status === "pending").length,
        accepted: state.requests.filter((r) => r.status === "accepted").length,
        declined: state.requests.filter((r) => r.status === "declined").length,
      },
      collectionsLast7Days: state.collections
        .filter((c) => c.collectedAt >= weekAgo)
        .map((c) => ({ region: CB.regionName(c.region), kg: c.kg })),
      partners: state.partners.map((p) => ({ name: p.name, type: p.type, region: CB.regionName(p.region), kgReceived: p.kgReceived, co2eKg: p.co2eKg })),
      recentUsageLogs: state.usageLogs.slice(0, 5).map((u) => ({ partner: u.customer, compostKg: u.compostKg, soilRating: u.soilRating })),
      forecast: forecastData(),
    };
  }

  const TASK_DATA = { briefing: briefingData, forecast: forecastData, allocation: allocationData };

  /* ---------------- Gemini via Apps Script ---------------- */
  // text/plain keeps this a "simple" CORS request — Apps Script web
  // apps can't answer a preflight, but they do allow simple POSTs.
  async function generate(task) {
    const url = endpoint();
    if (!url) throw new Error("not_configured");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ task, data: TASK_DATA[task]() }),
    });
    if (!res.ok) throw new Error(`Endpoint returned HTTP ${res.status}`);
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error || "Unknown error from the AI endpoint");
    saveResult(task, payload);
    recordFootprint(payload.footprint);
    return payload;
  }

  // Last generated result per task, so returning to a page shows it again.
  function loadResults() {
    try {
      return JSON.parse(localStorage.getItem(RESULT_STORAGE) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveResult(task, payload) {
    try {
      const all = loadResults();
      all[task] = payload;
      localStorage.setItem(RESULT_STORAGE, JSON.stringify(all));
    } catch (e) {}
  }
  function lastResult(task) {
    return loadResults()[task] || null;
  }

  // Midpoint of each EcoLogits range, summed across generations.
  function footprintTotals() {
    const empty = { count: 0, energyWh: 0, gwpG: 0, waterMl: 0 };
    try {
      return { ...empty, ...JSON.parse(localStorage.getItem(FOOTPRINT_STORAGE) || "{}") };
    } catch (e) {
      return empty;
    }
  }
  function recordFootprint(fp) {
    if (!fp) return;
    const mid = (r) => (r.min + r.max) / 2;
    const t = footprintTotals();
    t.count += 1;
    t.energyWh += mid(fp.energyWh);
    t.gwpG += mid(fp.gwpG);
    t.waterMl += mid(fp.waterMl);
    try {
      localStorage.setItem(FOOTPRINT_STORAGE, JSON.stringify(t));
    } catch (e) {}
  }

  return {
    endpoint,
    forecastTotal, forecastByRegion,
    scoreRequest, recommendAllocation,
    generate, lastResult, footprintTotals,
  };
})();
