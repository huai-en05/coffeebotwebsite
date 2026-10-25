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

Built as two layers, both live on the **Forecast** and **Allocation**
admin pages:

1. **Rule-based engine (always on, free, no key needed)** — `assets/js/ai.js`
   - *Forecasting*: a 7-day-ahead projection per region, blending a
     7-day moving average with a least-squares linear trend over recent
     collection history, scaled by each region's known cup-volume baseline.
   - *Allocation recommendation*: scores each pending request on the
     factors CoffeeBot staff said they actually weigh — quantity
     requested, consistency/frequency (recurring > one-off), and clarity
     of the stated use case — then allocates forecasted supply to the
     highest-scoring requests first.
2. **Optional Gemini enhancement** — on either page, an admin can paste a
   Gemini API key (Google AI Studio, free tier under an edu account) to
   turn the numbers above into a short, plain-language note. The key is
   stored only in that browser's `localStorage`; it's never committed to
   this repo and never sent anywhere but Google's API. Without a key, the
   pages fall back to a rule-based written summary — nothing breaks.

**Why not the Claude API:** Claude Pro (a chat subscription) doesn't
include API access — that's billed separately, pay-as-you-go, via
console.anthropic.com. Gemini's free tier was the zero-cost option
available, so that's what's wired up; swapping in Claude (or any other
provider) later just means adding a second `callX()` function next to
`callGemini()` in `assets/js/ai.js`.

## Project structure

```
index.html              role-select landing page
customer/                login, home, order (request+usage log), dashboard, past-orders
admin/                   login, home, upload, operations, forecast, allocation
assets/css/style.css     shared brown coffee-theme design system
assets/js/data.js        region data, seed/demo state, localStorage persistence
assets/js/app.js         nav bar, icons, auth guard, bar-chart renderer
assets/js/ai.js          rule-based forecasting/allocation + optional Gemini layer
docs/data-sources.md     exactly which figures are real (Q&A) vs. demo-invented
```

## Status

This is a functioning prototype for a client check-in/demo, not a
production deployment — there is no real authentication, no server, and
no persistence beyond the current browser. It's designed so each piece
(auth, data storage, AI calls) is isolated enough to swap in a real
backend later without rewriting the UI.
