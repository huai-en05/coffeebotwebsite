/* =========================================================
   CoffeeBot Exchange — Gemini endpoint (Google Apps Script)

   Paste this whole file into a new Apps Script project, set the
   GEMINI_API_KEY script property, and deploy it as a Web App.
   Full steps: docs/gemini-apps-script-setup.md

   The website POSTs { task, data } here; this script builds the
   prompt, calls Gemini with the key stored in Script Properties
   (so the key never touches the browser or the repo), estimates
   the request's environmental footprint with the EcoLogits API,
   and returns structured JSON the admin pages render.
   ========================================================= */

const DEFAULT_MODEL = "gemini-3.8-flash";
// Used when the main model stays busy (HTTP 429/5xx) after retries.
// "-latest" aliases are kept current by Google, so this one won't be retired.
const DEFAULT_FALLBACK_MODEL = "gemini-flash-lite-latest";
const RETRYABLE = [429, 500, 502, 503, 504];
const RETRY_DELAYS_MS = [1500, 4000];

// EcoLogits (ecologits.ai) — open-source LCA-based estimates of an AI
// request's energy, emissions and water use. No key needed.
const ECOLOGITS_URL = "https://api.ecologits.ai/v1beta/estimations";
const ECOLOGITS_PROVIDER = "google_genai";

// Shared background so every task answers with CoffeeBot's real context.
const CONTEXT = [
  "CoffeeBot is a Singapore social enterprise that runs coffee vending machines in 5 regions",
  "(North: Republic Polytechnic, South: 100 Pasir Panjang, East: Changi General Hospital,",
  "West: NTU, Central: Singapore Business Federation). Staff collect used coffee grounds",
  "whenever they service a machine (there is no automated tracking) and give them to",
  "off-takers such as community gardens, schools and researchers, mostly for free.",
  "CoffeeBot's priority is impact and genuine reuse over revenue. When allocating, staff weigh:",
  "the quantity a partner can take, convenience of collection, and frequency/consistency of reuse.",
  "Ops staff spend roughly 6-8 hours a week on this programme.",
].join(" ");

// Every task returns the same shape, so the site has one renderer.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    stats: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          value: { type: "STRING" },
          note: { type: "STRING" },
          tone: { type: "STRING", enum: ["good", "watch", "neutral"] },
        },
        required: ["label", "value", "note", "tone"],
      },
    },
    insights: { type: "ARRAY", items: { type: "STRING" } },
    actions: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["headline", "stats", "insights", "actions"],
};

const OUTPUT_RULES = [
  "Respond as JSON matching the schema:",
  "- headline: one sentence (max 20 words) summarising the situation.",
  "- stats: exactly 4 generated stat tiles. 'value' is short (max 12 characters, e.g. '38.2 kg', '+6%', 'East', '3 of 4').",
  "  'note' is one short sentence explaining it. 'tone' is good, watch or neutral.",
  "- insights: 3 to 5 short sentences on what stands out.",
  "- actions: 2 to 4 concrete next steps an ops staffer can do this week.",
  "Only derive numbers from the data provided — never invent figures. Plain language, no markdown.",
].join("\n");

const TASKS = {
  // Admin home — weekly operations briefing across everything.
  briefing: function (data) {
    return [
      CONTEXT,
      "",
      "Write this week's operations briefing for CoffeeBot's admin team from the data below.",
      "Cover supply vs. demand, which requests need a decision, regional balance and partner impact.",
      "",
      "DATA:",
      JSON.stringify(data, null, 2),
      "",
      OUTPUT_RULES,
    ].join("\n");
  },

  // Forecast page — read the 7-day regional supply forecast.
  forecast: function (data) {
    return [
      CONTEXT,
      "",
      "Analyse this 7-day used-coffee-grounds supply forecast. It comes from a moving-average +",
      "linear-trend model over recent collection history, anchored to each region's cup-volume baseline.",
      "Call out regions trending up or down, how the forecast compares to last week, and anything",
      "operationally worth flagging (e.g. a region where collection frequency should change).",
      "",
      "DATA:",
      JSON.stringify(data, null, 2),
      "",
      OUTPUT_RULES,
    ].join("\n");
  },

  // Allocation page — review the ranked allocation before approval.
  allocation: function (data) {
    return [
      CONTEXT,
      "",
      "Review this week's ranked allocation recommendation before an ops staffer approves it.",
      "Each request was scored on requested quantity, recurring frequency and clarity of use case,",
      "then supplied from the 7-day regional forecast in score order. Point out partial or unfulfilled",
      "requests, regions with leftover or short supply, and any request worth a second look.",
      "",
      "DATA:",
      JSON.stringify(data, null, 2),
      "",
      OUTPUT_RULES,
    ].join("\n");
  },
};

/* ---------------- web app entry points ---------------- */
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const build = TASKS[req.task];
    if (!build) return json_({ ok: false, error: "Unknown task: " + req.task });

    const gen = callGemini_(build(req.data || {}));
    return json_({
      ok: true,
      task: req.task,
      model: gen.model,
      generatedAt: new Date().toISOString(),
      result: gen.result,
      outputTokens: gen.outputTokens,
      footprint: estimateFootprint_(gen.model, gen.outputTokens, gen.latencySec),
    });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// Visiting the web app URL in a browser is a quick health check.
function doGet() {
  return json_({ ok: true, status: "CoffeeBot AI endpoint is running.", model: getModel_() });
}

/* ---------------- Gemini call ---------------- */
// Tries the main model (retrying briefly if Google is overloaded), then
// the fallback model. Other errors — bad key, bad request — fail at once.
function callGemini_(prompt) {
  const key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set in Script Properties.");

  const models = [getModel_(), getFallbackModel_()].filter(function (m, i, all) { return m && all.indexOf(m) === i; });
  let lastError = null;
  for (let m = 0; m < models.length; m++) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) Utilities.sleep(RETRY_DELAYS_MS[attempt - 1]);
      const res = requestGemini_(models[m], key, prompt);
      if (res.code === 200) return parseGemini_(models[m], res);
      lastError = new Error("Gemini HTTP " + res.code + " (" + models[m] + "): " + res.body.slice(0, 300));
      if (RETRYABLE.indexOf(res.code) === -1) throw lastError;
    }
  }
  throw lastError;
}

function requestGemini_(model, key, prompt) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
  const started = Date.now();
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": key },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  return { code: res.getResponseCode(), body: res.getContentText(), latencySec: (Date.now() - started) / 1000 };
}

function parseGemini_(model, res) {
  const data = JSON.parse(res.body);
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const text = parts.map(function (p) { return p.text || ""; }).join("");
  if (!text) throw new Error("Gemini returned an empty response.");

  // Thinking tokens are generated output too, so they count toward the footprint.
  const usage = data.usageMetadata || {};
  const outputTokens = (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
  return { model: model, result: JSON.parse(text), outputTokens: outputTokens, latencySec: res.latencySec };
}

/* ---------------- EcoLogits footprint ---------------- */
// Returns min/max ranges in friendly units, or null if EcoLogits is
// unreachable or doesn't know the model — the AI result still goes out.
function estimateFootprint_(model, outputTokens, latencySec) {
  try {
    const res = UrlFetchApp.fetch(ECOLOGITS_URL, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        provider: ECOLOGITS_PROVIDER,
        model_name: model,
        output_token_count: outputTokens,
        request_latency: latencySec,
      }),
    });
    if (res.getResponseCode() !== 200) return null;
    const impacts = JSON.parse(res.getContentText()).impacts;
    const range = function (impact, factor) {
      return { min: impact.value.min * factor, max: impact.value.max * factor };
    };
    return {
      energyWh: range(impacts.energy, 1000), // kWh → Wh
      gwpG: range(impacts.gwp, 1000),        // kgCO2eq → g
      waterMl: range(impacts.wcf, 1000),     // L → mL
      source: "EcoLogits",
    };
  } catch (err) {
    return null;
  }
}

// Optional GEMINI_MODEL / GEMINI_FALLBACK_MODEL script properties let you
// switch models without editing code.
function getModel_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") || DEFAULT_MODEL;
}
function getFallbackModel_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- run from the editor to test ---------------- */
// Select testGemini in the toolbar and click Run — check the Execution log.
function testGemini() {
  const sample = {
    next7DaysByRegion: [
      { region: "North", location: "Republic Polytechnic", kg: 1.5 },
      { region: "East", location: "Changi General Hospital", kg: 2.3 },
    ],
    next7DayTotalKg: 3.8,
    last7DayTotalKg: 3.6,
  };
  const gen = callGemini_(TASKS.forecast(sample));
  Logger.log("Model used: " + gen.model);
  Logger.log(JSON.stringify(gen.result, null, 2));
  Logger.log("Footprint: " + JSON.stringify(estimateFootprint_(gen.model, gen.outputTokens, gen.latencySec)));
}
