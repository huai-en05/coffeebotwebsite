# CoffeeBot Exchange

A working prototype website for CoffeeBot's used-coffee-grounds redistribution
programme — built from the team's Figma design and original HTML prototypes,
supplemented with real figures from the CoffeeBot staff Q&A (IS463 project).

Two portals:
- **Customer / Off-taker** — submit weekly grounds requests, log usage, view
  an impact dashboard, browse past orders.
- **Admin / CoffeeBot staff** — log daily collections by region, accept or
  decline requests, view a 5-region supply forecast, and generate an
  AI-assisted weekly allocation recommendation.

## Live demo

No build step — it's plain HTML/CSS/JS. Open `index.html` directly, or serve
the folder locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

Demo logins are prefilled on both login screens — just click **Log In**:
- Customer: `customer@gmail.com`
- Admin: `admin@gmail.com`

There's no real backend: all data (requests, usage logs, collections,
approvals) is stored in your browser's `localStorage`, seeded with demo data
on first load. Clearing site data resets it.

## Region categorisation

Per CoffeeBot staff feedback ("add categorisation based on regions... so
it's easier for analysis"), every request, collection, and forecast is
tagged to one of the five regions CoffeeBot actually operates in — North,
South, East, West, Central — using the real cup-volume figures from the
Q&A. See **[docs/data-sources.md](docs/data-sources.md)** for exactly which
numbers are real vs. invented for the demo, and a note on why this build
uses those five regions rather than a finer "North, North-East, ..." split.

## AI features

AI is built into the admin side, not an optional add-on. Two layers run
together:

1. **Rule-based engine** (`assets/js/ai.js`) produces the numbers:
   - *Forecasting*: a 7-day-ahead projection per region, blending a
     7-day moving average with a least-squares linear trend over recent
     collection history, scaled by each region's known cup-volume baseline.
   - *Allocation recommendation*: scores each pending request on the
     factors CoffeeBot staff said they actually weigh (quantity
     requested, consistency/frequency, clarity of use case), then
     allocates forecasted supply to the highest-scoring requests first.
2. **Gemini via Google Apps Script** (`apps-script/Code.gs`) turns those
   numbers into generated stats, insights and next actions. Each of these
   admin pages has a **Generate** button:
   - **Home** → this week's operations briefing
   - **Forecast** → forecast insights by region
   - **Allocation** → a review of the ranked allocation before approval

The Gemini API key is stored in Apps Script's Script Properties, so it's
never in the browser or this repo. The site only knows the Apps Script
URL, set in `assets/js/config.js`.

**Setup:** follow **[docs/gemini-apps-script-setup.md](docs/gemini-apps-script-setup.md)**
(about 10 minutes: get a key, paste the script, deploy, paste the URL).

## Project structure

```
index.html              role-select landing page
customer/                login, home, order (request+usage log), dashboard, past-orders
admin/                   login, home, upload, operations, forecast, allocation
assets/css/style.css     shared café design system (Fraunces + DM Sans, espresso/cream palette)
assets/js/config.js      AI_ENDPOINT — your deployed Apps Script URL
assets/js/data.js        region data, seed/demo state, localStorage persistence
assets/js/app.js         nav bar, icons, auth guard, bar-chart renderer, AI Generate panel
assets/js/ai.js          rule-based forecasting/allocation + Gemini calls via Apps Script
apps-script/Code.gs      Google Apps Script: prompts + Gemini call (holds the API key)
docs/data-sources.md     exactly which figures are real (Q&A) vs. demo-invented
docs/gemini-apps-script-setup.md   step-by-step Gemini / Apps Script setup
```

## Status

This is a functioning prototype for a client check-in/demo, not a
production deployment — there is no real authentication, no server, and
no persistence beyond the current browser. The only server piece is the
Apps Script endpoint used for Gemini. It's designed so each piece
(auth, data storage, AI calls) is isolated enough to swap in a real
backend later without rewriting the UI.
