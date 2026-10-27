/* =========================================================
   CoffeeBot Exchange — Gemini endpoint (Google Apps Script)

   Paste this whole file into a new Apps Script project, set the
   GEMINI_API_KEY script property, and deploy it as a Web App.
   Full steps: docs/gemini-apps-script-setup.md

   The website POSTs { task, data } here; this script builds the
   prompt, calls Gemini with the key stored in Script Properties
   (so the key never touches the browser or the repo), and returns
   structured JSON the admin pages render as generated stats.
   ========================================================= */

const DEFAULT_MODEL = "gemini-2.5-flash";

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

    const result = callGemini_(build(req.data || {}));
    return json_({
      ok: true,
      task: req.task,
      model: getModel_(),
      generatedAt: new Date().toISOString(),
      result: result,
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
function callGemini_(prompt) {
  const key = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set in Script Properties.");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + getModel_() + ":generateContent";
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

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) throw new Error("Gemini HTTP " + code + ": " + body.slice(0, 300));

  const data = JSON.parse(body);
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const text = parts.map(function (p) { return p.text || ""; }).join("");
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(text);
}

// Optional GEMINI_MODEL script property lets you switch models without editing code.
function getModel_() {
  return PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") || DEFAULT_MODEL;
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
  Logger.log(JSON.stringify(callGemini_(TASKS.forecast(sample)), null, 2));
}
