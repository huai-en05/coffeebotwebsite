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
   If Gemini can't answer, ruleBased() writes the same panel from
   the rule engine alone, so admins always get a usable result.
   ========================================================= */

const CBAI = (function () {
  const RESULT_STORAGE = "coffeebot_ai_results_v1";

  const round1 = (n) => Math.round(n * 10) / 10;
  const round2 = (n) => Math.round(n * 100) / 100;
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

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

  // Forecast wet kg/day for the next `days` days, split across the regions
  // we can collect from — each region's share of the system total is held
  // at its known baseline proportion (from the Q&A cup-volume data).
  function forecastByRegion(days = 7) {
    const totals = forecastTotal(days);
    const baselines = CB.COLLECTABLE.map((r) => ({ region: r, daily: CB.dailyGroundsKg(r) }));
    const baselineSum = baselines.reduce((a, b) => a + b.daily, 0);

    return baselines.map(({ region, daily }) => {
      const share = baselineSum === 0 ? 1 / baselines.length : daily / baselineSum;
      return {
        region,
        values: totals.map((t) => round2(t * share)),
      };
    });
  }

  // Dried grounds that will be ready to hand over, per region and day.
  // Wet forecast × dry ratio (5–8g dry per 15g wet), then scaled by how
  // well each day dries (CBWeather). Without a forecast, weather = normal.
  function dryForecastByRegion(days = 7) {
    const f = typeof CBWeather !== "undefined" ? CBWeather.factors(days) : Array(days).fill(1);
    return forecastByRegion(days).map(({ region, values }) => ({
      region,
      values: values.map((v, i) => round2(CB.dryKg(v) * f[i])),
      unadjusted: values.map((v) => round2(CB.dryKg(v))),
    }));
  }

  /* ---------------- rule-based allocation recommendation ---------------- */
  // Scores each pending request against the factors CoffeeBot staff said
  // they actually weigh (Q&A answer #1 & #2): quantity the partner can
  // take, consistency/frequency of reuse, and what the grounds are for.
  // Then allocates the week's supply to the highest-scoring requests first.

  // An "Others" purpose Gemini rated: its category's points are scaled by
  // community benefit, so personal or just-for-fun use drops to the bottom.
  const BENEFIT_WEIGHT = { high: 1, medium: 0.6, low: 0 };

  // Gemini's latest sorting of requests that didn't pick a category, by id.
  function aiPurposeReviews() {
    const last = lastResult("allocation");
    const reviews = (last && last.result && last.result.purposeReviews) || [];
    return Object.fromEntries(reviews.map((r) => [r.requestId, r]));
  }

  // Where a request's purpose came from:
  //   partner  — picked from the request form's list
  //   ai       — Gemini sorted an "Others" or older free-text request
  //   keywords — sorted by keywords in the free text, until Gemini has looked
  //   review   — couldn't be sorted, so staff should check it
  function purposeFor(req, reviews) {
    const picked = req.purpose !== "other" && CB.purposeById(req.purpose);
    if (picked) return { purpose: picked, source: "partner", points: picked.points };
    const ai = reviews[req.id];
    const aiPurpose = ai && CB.purposeById(ai.category);
    if (aiPurpose) {
      return {
        purpose: aiPurpose, source: "ai", benefit: ai.communityBenefit, reason: ai.reason,
        points: round1(aiPurpose.points * (BENEFIT_WEIGHT[ai.communityBenefit] ?? 1)),
      };
    }
    const guess = CB.guessPurpose(req.purposeNote || req.useCase);
    if (guess) return { purpose: guess, source: "keywords", points: guess.points };
    return { purpose: CB.purposeById("other"), source: "review", points: 0 };
  }

  function scoreRequest(req, purposeInfo = purposeFor(req, aiPurposeReviews())) {
    let score = 0;
    // Prefer requests that can absorb a meaningful quantity (not oversized vs supply).
    score += Math.min(req.volumeKg, 10) * 2;
    // Recurring / regular commitments score higher than one-off (consistency).
    if (req.frequency === "Weekly") score += 20;
    else if (req.frequency === "Fortnightly") score += 12;
    else score += 4;
    // Impact first: research, composting and community use outrank products for sale.
    score += purposeInfo.points;
    return Math.round(score * 10) / 10;
  }

  // Amounts staff typed in on the Allocation page, by request id. They stay
  // in this browser until the request is approved or rejected.
  const EDIT_STORAGE = "coffeebot_alloc_edits_v1";
  function allocationEdits() {
    try {
      return JSON.parse(localStorage.getItem(EDIT_STORAGE) || "{}");
    } catch (e) {
      return {};
    }
  }
  // Pass null to drop the edit and go back to the recommendation.
  function setAllocationEdit(id, kg) {
    const all = allocationEdits();
    if (kg === null) delete all[id];
    else all[id] = kg;
    try {
      localStorage.setItem(EDIT_STORAGE, JSON.stringify(all));
    } catch (e) {}
  }

  function recommendAllocation() {
    const state = CB.getState();
    const pending = state.requests.filter((r) => r.status === "pending");
    // Partners receive dried grounds, so allocate from the 7-day
    // weather-adjusted dry supply rather than the wet intake. It's one pool:
    // every region's grounds are dried at the office and partners collect
    // there, so a South partner can be supplied even though South has no site.
    const supply = sum(dryForecastByRegion(7).map((f) => sum(f.values)));
    const reviews = aiPurposeReviews();
    const edits = allocationEdits();

    const ranked = pending
      .map((r) => {
        const purposeInfo = purposeFor(r, reviews);
        return { ...r, purposeInfo, score: scoreRequest(r, purposeInfo) };
      })
      .sort((a, b) => b.score - a.score);

    let remaining = supply;
    const decisions = ranked.map((r) => {
      // A staff edit wins, even past the forecast: they may know of stock on hand.
      const edited = r.id in edits;
      const allocate = edited ? edits[r.id] : Math.min(r.volumeKg, Math.max(0, remaining));
      remaining -= allocate;
      return {
        ...r,
        recommendedKg: round2(allocate),
        fulfilled: allocate >= r.volumeKg - 0.01,
        edited,
        needsReview: r.purposeInfo.purpose.id === "other",
      };
    });

    // remainingSupply goes negative when staff edits allocate more than the forecast.
    return { decisions, supply: round2(supply), remainingSupply: round2(remaining) };
  }

  /* ---------------- data sent to Gemini, per task ---------------- */
  function weatherData() {
    const days = typeof CBWeather !== "undefined" ? CBWeather.cached() : null;
    if (!days) return null;
    return days.map((d) => ({
      date: d.date, rainMm: d.rainMm, rainChancePct: d.rainChance,
      humidityPct: d.humidity, dryingConditions: d.rating,
    }));
  }

  function forecastData() {
    const state = CB.getState();
    const byRegion = forecastByRegion(7);
    const dry = dryForecastByRegion(7);
    return {
      next7DaysByRegion: byRegion.map((f, i) => ({
        region: f.region.name,
        location: f.region.location,
        dailyWetKg: f.values,
        totalWetKg: round1(sum(f.values)),
        dryReadyKgWeatherAdjusted: round1(sum(dry[i].values)),
        baselineWetKgPerDay: round1(CB.dailyGroundsKg(f.region)),
      })),
      noCollection: CB.REGIONS.filter((r) => !r.collectable).map((r) => ({ region: r.name, reason: r.note })),
      next7DayWetTotalKg: round1(sum(byRegion.map((f) => sum(f.values)))),
      next7DayDryReadyKg: round1(sum(dry.map((f) => sum(f.values)))),
      next7DayDryKgIfWeatherWereNormal: round1(sum(dry.map((f) => sum(f.unadjusted)))),
      last7DayWetTotalKg: round1(sum(state.wasteHistory.slice(-7).map((h) => h.kg))),
      last14DaysWetKg: state.wasteHistory.slice(-14).map((h) => h.kg),
      dryingWeather: weatherData(),
    };
  }

  function allocationData() {
    const { decisions, supply, remainingSupply } = recommendAllocation();
    return {
      rankedRequests: decisions.map((d, i) => ({
        rank: i + 1,
        requester: d.customer,
        region: CB.regionName(d.region),
        purpose: d.purposeInfo.purpose.label,
        purposeSource: d.purposeInfo.source,
        useCase: d.useCase,
        frequency: d.frequency,
        requestedKg: d.volumeKg,
        recommendedKg: d.recommendedKg,
        editedByStaff: d.edited,
        fullyFulfilled: d.fulfilled,
        score: d.score,
      })),
      weekDryReadySupplyKg: round1(supply),
      leftoverSupplyKg: round1(remainingSupply),
      // Requests that didn't pick a category (or predate the list) for Gemini to sort.
      purposeCategories: CB.PURPOSES.map((p) => ({ id: p.id, label: p.label })),
      purposesToReview: decisions.filter((d) => d.purposeInfo.source !== "partner").map((d) => ({
        requestId: d.id,
        requester: d.customer,
        explanation: d.purposeNote || d.useCase,
      })),
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
      openAlerts: typeof CBAlerts !== "undefined" ? CBAlerts.list().map((a) => a.title + " — " + a.body) : [],
      recentUsageLogs: state.usageLogs.slice(0, 5).map((u) => ({ partner: u.customer, compostKg: u.compostKg, soilRating: u.soilRating })),
      forecast: forecastData(),
    };
  }

  const TASK_DATA = { briefing: briefingData, forecast: forecastData, allocation: allocationData };

  /* ---------------- Gemini via Apps Script ---------------- */
  // text/plain keeps this a "simple" CORS request — Apps Script web
  // apps can't answer a preflight, but they do allow simple POSTs.
  // Gives up after GENERATE_TIMEOUT_MS so the panel falls back to the
  // rule-based summary instead of waiting minutes on a slow Gemini.
  const GENERATE_TIMEOUT_MS = 45000;
  async function generate(task) {
    const url = endpoint();
    if (!url) throw new Error("not_configured");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ task, data: TASK_DATA[task]() }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`Gemini didn't answer within ${GENERATE_TIMEOUT_MS / 1000} seconds`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`Endpoint returned HTTP ${res.status}`);
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error || "Unknown error from the AI endpoint");
    saveResult(task, payload);
    await recordFootprint(task, payload);
    return payload;
  }

  /* ---------------- rule-based fallback (no AI) ---------------- */
  // Same shape as a Gemini result, built only from the numbers above.
  const kg = (n) => (n < 1 ? round2(n) : round1(n)) + " kg";
  const list = (names) => names.length <= 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

  function allocationFallback() {
    const { decisions, supply, remainingSupply } = recommendAllocation();
    if (!decisions.length) {
      return {
        headline: "No pending requests — nothing to allocate this week.",
        stats: [
          { label: "Pending", value: "0", note: "Every request has been decided.", tone: "good" },
          { label: "7-day supply", value: kg(supply), note: "Dried grounds ready across all regions.", tone: "neutral" },
        ],
        insights: ["All forecast supply is currently unallocated."],
        actions: ["Invite recurring partners to submit next week's requests.", "Check whether any region's bins need an extra pickup."],
      };
    }
    const full = decisions.filter((d) => d.fulfilled);
    const partial = decisions.filter((d) => !d.fulfilled && d.recommendedKg > 0);
    const none = decisions.filter((d) => d.recommendedKg === 0);
    const unclear = decisions.filter((d) => d.needsReview);
    const lowBenefit = decisions.filter((d) => d.purposeInfo.benefit === "low");
    const requested = sum(decisions.map((d) => d.volumeKg));
    const allocated = sum(decisions.map((d) => d.recommendedKg));
    const leftover = remainingSupply >= 0.05 ? remainingSupply : 0;
    const top = decisions[0];

    const insights = [
      `${top.customer} ranks first (score ${top.score}): a ${top.frequency.toLowerCase()} request for ${top.volumeKg} kg for ${top.purposeInfo.purpose.label.toLowerCase()}.`,
    ];
    if (partial.length) insights.push(`${list(partial.map((d) => d.customer))} can only be partly supplied this week.`);
    if (none.length) insights.push(`${list(none.map((d) => d.customer))} get nothing this week — the supply is used up by higher-ranked requests.`);
    if (remainingSupply < -0.05) insights.push(`Staff edits allocate ${kg(-remainingSupply)} more than the week's forecast supply.`);
    if (leftover) insights.push(`${kg(leftover)} of dried grounds is still unallocated.`);

    const actions = [];
    if (full.length) actions.push(`Approve the full allocations for ${list(full.map((d) => d.customer))}.`);
    partial.forEach((d) => actions.push(`Offer ${d.customer} a partial pickup of ${d.recommendedKg} kg, or roll the rest to next week.`));
    none.forEach((d) => actions.push(`Tell ${d.customer} their request is waitlisted for next week's supply.`));
    unclear.forEach((d) => actions.push(`Check what ${d.customer} will use the grounds for — it doesn't fit a category.`));
    lowBenefit.forEach((d) => actions.push(`${d.customer}'s use looks personal rather than for the community — consider rejecting it.`));
    if (leftover) actions.push("Offer the leftover supply to recurring partners.");

    return {
      headline: `${full.length} of ${decisions.length} requests can be fully supplied from ${kg(supply)} of dried grounds.`,
      stats: [
        { label: "Pending", value: String(decisions.length), note: "Requests scored this week.", tone: "neutral" },
        { label: "Fully supplied", value: `${full.length} of ${decisions.length}`, note: "Requests covered by their region's forecast.", tone: full.length === decisions.length ? "good" : "watch" },
        { label: "Allocated", value: kg(allocated), note: `Out of ${kg(requested)} requested.`, tone: allocated >= requested ? "good" : "watch" },
        { label: "Leftover", value: kg(leftover), note: "Dried supply not yet claimed.", tone: "neutral" },
      ],
      insights,
      actions: actions.slice(0, 5),
    };
  }

  function forecastFallback() {
    const d = forecastData();
    const regions = [...d.next7DaysByRegion].sort((a, b) => b.totalWetKg - a.totalWetKg);
    const top = regions[0], low = regions[regions.length - 1];
    const trend = d.last7DayWetTotalKg > 0 ? Math.round(((d.next7DayWetTotalKg - d.last7DayWetTotalKg) / d.last7DayWetTotalKg) * 100) : 0;
    const share = d.next7DayWetTotalKg > 0 ? Math.round((top.totalWetKg / d.next7DayWetTotalKg) * 100) : 0;
    const wx = d.dryingWeather;
    const poorDays = wx ? wx.filter((w) => w.dryingConditions === "poor").length : 0;
    const lost = d.next7DayDryKgIfWeatherWereNormal - d.next7DayDryReadyKg;
    const insights = [
      `${top.region} (${top.location}) produces the most grounds at ~${kg(top.totalWetKg)} wet for the week.`,
      `${low.region} is lowest at ~${kg(low.totalWetKg)} wet, so smaller requests suit it best.`,
      `Of ${kg(d.next7DayWetTotalKg)} wet, about ${kg(d.next7DayDryReadyKg)} should be dry and ready to hand over.`,
    ];
    if (wx) insights.push(poorDays
      ? `${poorDays} of the next 7 days look poor for drying, holding back ~${kg(lost)} of dried grounds.`
      : "Drying weather looks reasonable all week.");
    if (d.noCollection.length) insights.push(`${list(d.noCollection.map((r) => r.region))} can't be collected from (sites under contract).`);
    return {
      headline: `About ${kg(d.next7DayWetTotalKg)} of wet grounds expected next week — ~${kg(d.next7DayDryReadyKg)} ready once dried.`,
      stats: [
        { label: "Wet intake", value: kg(d.next7DayWetTotalKg), note: `Last 7 days: ${kg(d.last7DayWetTotalKg)}.`, tone: "neutral" },
        { label: "Dry-ready", value: kg(d.next7DayDryReadyKg), note: wx ? "After 5–8g/cup drying, adjusted for weather." : "After 5–8g/cup drying (no weather data).", tone: poorDays >= 3 ? "watch" : "good" },
        { label: "Trend", value: (trend >= 0 ? "+" : "") + trend + "%", note: "Wet forecast vs. the last 7 days.", tone: trend >= 0 ? "good" : "watch" },
        { label: "Top region", value: top.region, note: `${top.location}, ~${share}% of supply.`, tone: "neutral" },
      ],
      insights: insights.slice(0, 5),
      actions: [
        poorDays >= 3 ? "Space out pickups on the wettest days so drying trays don't back up." : `Keep ${top.region} on its usual collection rounds.`,
        `Batch ${low.region} collections with a neighbouring region's round to save staff time.`,
        "Route new requests toward regions with the most dry-ready supply.",
      ],
    };
  }

  function briefingFallback() {
    const b = briefingData();
    const pendingKg = sum(b.pendingRequests.map((r) => r.kg));
    const collected = sum(b.collectionsLast7Days.map((c) => c.kg));
    const byRegion = {};
    b.collectionsLast7Days.forEach((c) => (byRegion[c.region] = (byRegion[c.region] || 0) + c.kg));
    const missing = CB.COLLECTABLE.map((r) => r.name).filter((n) => !byRegion[n]);
    const co2 = sum(b.partners.map((p) => p.co2eKg));
    const supply = b.forecast.next7DayDryReadyKg;
    const insights = [
      `${b.requestCounts.pending} request${b.requestCounts.pending === 1 ? "" : "s"} (${kg(pendingKg)}) waiting for a decision.`,
      `${kg(collected)} wet collected over the last 7 days; ~${kg(supply)} of dried grounds ready over the next 7.`,
      pendingKg > supply ? "Pending demand is higher than next week's dry-ready supply." : "Next week's dry-ready supply covers all pending demand.",
    ];
    if (missing.length) insights.push(`No collections logged this week for ${list(missing)}.`);
    const actions = [];
    if (b.requestCounts.pending) actions.push("Review pending requests on the Allocation page.");
    if (missing.length) actions.push(`Log any ${list(missing)} collections from this week's service rounds.`);
    actions.push("Ask partners to log last week's usage so impact figures stay current.");
    return {
      headline: `${b.requestCounts.pending} pending request${b.requestCounts.pending === 1 ? "" : "s"} and ~${kg(supply)} of dried grounds ready next week.`,
      stats: [
        { label: "Pending", value: String(b.requestCounts.pending), note: `${kg(pendingKg)} requested.`, tone: b.requestCounts.pending ? "watch" : "good" },
        { label: "Collected", value: kg(collected), note: "Wet grounds logged in the last 7 days.", tone: "neutral" },
        { label: "Dry-ready", value: kg(supply), note: "Dried grounds expected over the next 7 days.", tone: "neutral" },
        { label: "CO₂e saved", value: kg(co2), note: "Across all partners to date (est.).", tone: "good" },
      ],
      insights,
      actions,
    };
  }

  const FALLBACKS = { briefing: briefingFallback, forecast: forecastFallback, allocation: allocationFallback };

  // Not cached or added to the footprint ledger — no AI was used.
  function ruleBased(task, reason) {
    return {
      ok: true,
      fallback: true,
      reason,
      task,
      model: "Rule-based fallback",
      generatedAt: new Date().toISOString(),
      result: FALLBACKS[task](),
      footprint: null,
    };
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

  // Every staff member's generations, summed. Each run is stored in the
  // shared aiRuns collection with the midpoint of its EcoLogits ranges.
  function footprintTotals() {
    return (CB.getState().aiRuns || []).reduce((t, r) => ({
      count: t.count + 1,
      energyWh: t.energyWh + r.energyWh,
      gwpG: t.gwpG + r.gwpG,
      waterMl: t.waterMl + r.waterMl,
    }), { count: 0, energyWh: 0, gwpG: 0, waterMl: 0 });
  }
  // A failed save only loses this run from the ledger, so it never blocks the result.
  async function recordFootprint(task, payload) {
    const fp = payload.footprint;
    if (!fp) return;
    const mid = (r) => (r.min + r.max) / 2;
    try {
      await CB.addAiRun({
        task, model: String(payload.model || "gemini"),
        energyWh: mid(fp.energyWh), gwpG: mid(fp.gwpG), waterMl: mid(fp.waterMl),
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn("Couldn't save this AI run to the shared ledger.", e);
    }
  }

  return {
    endpoint,
    forecastTotal, forecastByRegion, dryForecastByRegion,
    scoreRequest, recommendAllocation, setAllocationEdit,
    generate, ruleBased, lastResult, footprintTotals,
  };
})();
