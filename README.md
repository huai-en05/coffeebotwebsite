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

## Shared data (Firestore)

Requests, usage logs, collections, partners and the waste-by-day history,
along with approvals, are stored in **Cloud Firestore**. A request a partner submits shows up on the staff
Operations and Allocation pages on any device, and a status staff set shows
up for the partner. Pages load the latest data when they open, and fetch it
again when you return to the tab. They don't poll.

- The site talks to Firestore over plain REST calls, with no Firebase SDK,
  so no extra JavaScript is downloaded on any page.
- Each empty collection is seeded once with the Q&A demo data.
- `localStorage` stays as a cache, so pages still render if Firestore can't
  be reached.
- The regions and the staff's stated assumptions (cups per month, grams per
  cup and so on) are in Firestore too. Edit them in the Firebase console
  and every page's forecasts use the new values on the next load. The
  values in `data.js` are only the seed and the offline fallback.
- Login sessions stay in each browser.

**Setup:** follow **[docs/firebase-setup.md](docs/firebase-setup.md)**.
Leave `FIREBASE_PROJECT_ID` empty in `assets/js/config.js` to keep all data
in the browser only.

## Drying weather and alerts

- **Drying weather.** The Forecast page and Overview show a 7-day forecast
  from [Open-Meteo](https://open-meteo.com) (free, no API key). Each day is
  rated good, fair or poor for drying grounds. The **dry-ready** supply
  (15g wet per cup becomes 5–8g dried) is scaled down on wet days, and
  allocation uses that figure, because partners receive dried grounds.
- **Alerts.** A bell on every admin page, plus a **Needs attention** card on
  the Overview, flags:
  - a region with no collection logged for over a week (links to the form
    with that region picked),
  - excess dried supply nobody has requested, and
  - a wet week with 3+ poor drying days.
  Alerts can be hidden for a day.

## Region categorisation

Per CoffeeBot staff feedback ("add categorisation based on regions... so
it's easier for analysis"), every request, collection, and forecast is
tagged to one of the five regions CoffeeBot actually operates in — North,
South, East, West, Central. Supply comes from the four sites staff can
collect from (Woodlands 11, Changi Airport T2, SAFRA Jurong, Skypark by
Kiztopia); South's sites are under contract, so it has no collection point. See **[docs/data-sources.md](docs/data-sources.md)** for exactly which
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
     requested, consistency/frequency) plus its purpose. Research,
     composting and community use score highest, and products made to
     sell score low. The week's dry-ready supply is one pool, because
     every partner collects from the office. It goes to the
     highest-scoring requests first. Staff can edit an amount or reject
     a request before approving, and the approved amount is saved with
     the request. Each edit or rejection needs a reason. The reasons go
     into a shared **override log** (the `overrides` collection), shown on
     the Allocation page and sent to Gemini's allocation review.
   - *Learned scoring*: from the override log, Gemini suggests new points
     for a purpose when at least 2 overrides point the same way (for
     example, staff keep cutting business requests). Staff **Apply** or
     **Dismiss** each suggestion, so nothing changes without a person. An
     applied change is added to the shared `weightChanges` log, which
     every browser's scoring reads. Staff can reset a purpose to its
     default. Gemini also uses past override reasons as precedent when
     sorting "Others" requests.
   - *Purpose sorting*: partners pick a purpose from a list. An "Others"
     request (or an older free-text one) is sorted by keywords until
     Gemini's allocation review sorts it and rates its community benefit.
     A low rating (personal use, fun) scores no purpose points. Anything
     neither can sort is flagged **Needs review** for staff.
2. **Gemini via Google Apps Script** (`apps-script/Code.gs`) turns those
   numbers into generated stats, insights and next actions. Each of these
   admin pages has a **Generate** button:
   - **Home** → this week's operations briefing
   - **Forecast** → forecast insights by region
   - **Allocation** → a review of the ranked allocation before approval

The Gemini API key is stored in Apps Script's Script Properties, so it's
never in the browser or this repo. The site only knows the Apps Script
URL, set in `assets/js/config.js`.

### When Gemini is unavailable

If Gemini can't answer (endpoint not set, key problem, or Google
overloaded even after the Apps Script's retries and fallback model), the
panel shows a **rule-based version** in the same layout. It's built only
from the rule engine's numbers, labelled with the reason Gemini failed,
and not counted in the footprint ledger. For allocation, it lists which
requests are fully or partly supplied, who is waitlisted, which requests'
purposes need checking, and where supply is left over.

### Measuring the AI's own footprint (EcoLogits)

Because this is a sustainability project, every AI generation reports its
own environmental cost. After each Gemini call, Apps Script sends the
model name, output-token count and response time to the free
[EcoLogits](https://ecologits.ai) API, an open-source, life-cycle-based
estimator. It returns ranges for electricity (Wh), emissions (g CO₂e) and
water (mL). The site shows:

- a footprint line under every generated result, and
- a **Green AI ledger** on the admin Overview that totals every staff
  member's generations (each run is saved to the shared `aiRuns` collection
  in Firestore) and compares them with the CO₂e the programme has saved.

EcoLogits uses a world-average electricity mix, since Google doesn't
publish which data centre served a request. If EcoLogits is unreachable,
the AI result still shows, just without a footprint.

**Setup:** follow **[docs/gemini-apps-script-setup.md](docs/gemini-apps-script-setup.md)**
(about 10 minutes: get a key, paste the script, deploy, paste the URL).

## Project structure

```
index.html              landing page (how it works, impact, partner/staff entry)
customer/                login, home, order (request+usage log), dashboard, past-orders
admin/                   login, home, upload, operations, forecast, allocation
assets/css/style.css     shared design system (Gaegu + Nunito; doodle notebook in beige, latte and medium browns)
assets/doodles/          free doodle illustrations and squiggles — credits in docs/image-credits.md
assets/js/config.js      AI_ENDPOINT (Apps Script URL) and FIREBASE_PROJECT_ID
assets/js/data.js        region data, seed/demo state, Firestore sync with a localStorage cache
firestore.rules          Firestore security rules: record shapes, status-only updates, no deletes
assets/js/app.js         top nav, footer, doodle icons, auth guard, charts, AI panel, Green AI ledger
assets/js/ai.js          rule-based forecasting/allocation (wet + dry), Gemini calls, footprint tally
assets/js/weather.js     Open-Meteo drying forecast, cached; weather card
assets/js/alerts.js      missing-data / excess-supply / wet-week alerts, bell + Needs attention card
apps-script/Code.gs      Google Apps Script: prompts, Gemini call, EcoLogits estimate
docs/data-sources.md     exactly which figures are real (Q&A) vs. demo-invented
docs/gemini-apps-script-setup.md   step-by-step Gemini / Apps Script setup
docs/firebase-setup.md   creating the Firestore database and publishing the rules
docs/image-credits.md    where every doodle and icon comes from, and its licence
```

## Status

This is a functioning prototype for a client check-in/demo, not a
production deployment. There is no real authentication, so anyone who can
open the site can read the shared records, add new ones and change a
request's status. `firestore.rules` restricts what each record can contain
and blocks deletes, but it can't tell staff from partners. The server
pieces are Firestore and the Apps Script endpoint used for Gemini. It's designed so each piece
(auth, data storage, AI calls) is isolated enough to swap in a real
backend later without rewriting the UI.
