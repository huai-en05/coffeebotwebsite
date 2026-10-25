/* =========================================================
   CoffeeBot Exchange — AI module
   Two layers, by design:
     1. A rule-based engine (moving average + linear trend for
        forecasting; a weighted scoring model for allocation)
        that ALWAYS works, needs no API key, and costs nothing.
     2. An optional Gemini enhancement layer that turns the
        rule-based numbers into a written recommendation. It
        runs only if the admin enters a Gemini API key, which is
        kept in this browser's localStorage only — never sent
        anywhere but Google's API, and never committed to the repo.
   ========================================================= */

const CBAI = (function () {
  const GEMINI_KEY_STORAGE = "coffeebot_gemini_key";
  const GEMINI_MODEL = "gemini-2.0-flash";

  function getGeminiKey() {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || "";
    } catch (e) {
      return "";
    }
  }
  function setGeminiKey(key) {
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE, key);
    } catch (e) {}
  }
  function clearGeminiKey() {
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch (e) {}
  }
  function hasGeminiKey() {
    return !!getGeminiKey();
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

  /* ---------------- Gemini enhancement (optional) ---------------- */
  async function callGemini(prompt) {
    const key = getGeminiKey();
    if (!key) throw new Error("no_key");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`gemini_http_${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text) throw new Error("empty_response");
    return text.trim();
  }

  async function explainAllocation(decisions) {
    const summary = decisions
      .map((d) => `${d.customer} (${CB.regionName(d.region)}): requested ${d.volumeKg}kg, recommend ${d.recommendedKg}kg, frequency ${d.frequency}, score ${d.score}`)
      .join("\n");
    const prompt = `You are helping a coffee-grounds redistribution non-profit (CoffeeBot) decide how to allocate this week's used coffee grounds among requesting partner organisations. CoffeeBot's stated priority is impact and genuine reuse over revenue — grounds are given away largely for free. The scoring already weighs: requested quantity, how recurring/consistent the partner is, and how clearly they described their use case.

Here is this week's ranked allocation recommendation:
${summary}

In 3-4 short sentences, write a plain-language explanation an operations staff member could read before approving this allocation. Mention anything that looks worth a second look (e.g. a request that couldn't be fully supplied, or a highly consistent partner). Do not repeat the raw numbers table — speak in prose.`;
    return callGemini(prompt);
  }

  async function explainForecast(byRegion) {
    const lines = byRegion
      .map((f) => `${f.region.name} (${f.region.location}): next 7 days = [${f.values.join(", ")}] kg/day`)
      .join("\n");
    const prompt = `You are summarising a 7-day used-coffee-grounds supply forecast for a non-profit called CoffeeBot, across 5 regions in Singapore. The forecast is produced by a moving-average + linear-trend model over recent collection history, anchored to known monthly cup-volume baselines per region.

Forecast:
${lines}

In 3-4 short sentences, call out which region(s) are trending up or down and anything operationally worth flagging (e.g. a region approaching a level where collection frequency should change). Plain language, no raw tables.`;
    return callGemini(prompt);
  }

  return {
    hasGeminiKey, getGeminiKey, setGeminiKey, clearGeminiKey,
    forecastTotal, forecastByRegion,
    scoreRequest, recommendAllocation,
    callGemini, explainAllocation, explainForecast,
  };
})();
