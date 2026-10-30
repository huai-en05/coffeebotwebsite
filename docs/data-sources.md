# Data sources & assumptions

This prototype's figures come from two places: the CoffeeBot staff Q&A
(real data, quoted below) and demo data invented to make the UI feel alive
where no real figures exist yet. Everything invented is marked as such so
it's easy to swap in real numbers later.

## From the CoffeeBot staff Q&A (real)

**Collection sites** (the locations CoffeeBot staff offered for collection,
with estimated monthly consumption):

| Region  | Collection site            | Cups / month |
|---------|----------------------------|--------------|
| North   | Woodlands 11               | ~400         |
| South   | none                       | —            |
| East    | Changi Airport Terminal 2  | ~500         |
| West    | SAFRA Jurong               | ~500         |
| Central | Skypark by Kiztopia        | ~400         |

South's locations are under contractual agreements, so nothing can be
collected there. South is kept as a region so South-based partners can
still request grounds; it's marked `collectable: false` in
`assets/js/data.js`, has no supply forecast and never raises a
"missing data" alert.

These replace the machine-level volumes from the first Q&A (Republic
Polytechnic, 100 Pasir Panjang, Changi General Hospital, NTU, Singapore
Business Federation), which described where machines are, not where
grounds can be collected.

**Grounds-generation assumptions** (stated directly by CoffeeBot staff):
- ~60% of beverages purchased are coffee-based (require beans → generate grounds).
- ~15g of **wet** used coffee grounds per coffee-based cup.
- 5–8g per cup once **dried**, depending on moisture. The site uses the
  midpoint (6.5g, so dried ≈ 43% of wet weight) — `CB.DRY_RATIO`.
- These turn a site's cup volume into an expected kg/day of grounds
  (`CB.monthlyGroundsKg()` / `CB.dailyGroundsKg()` / `CB.dryKg()` in
  `assets/js/data.js`). Partners receive dried grounds, so allocation
  works from dry supply.

**Collection and drying** (CoffeeBot staff):
- Collection takes ~15 minutes per machine; staff move between locations
  through the day, which affects scheduling.
- Transport time to the office depends on where riders are stationed,
  distance and traffic (e.g. extra time if riders are in the west).
- The 6–8 hours/week covers collection and packing only. Admin work
  (finding partners, meetings) is extra and varies.
- Grounds wait ~2–4 days before drying, then dry for longer to remove as
  much moisture as possible. Drying time depends on humidity and ventilation.

**Named partners / off-takers** (used to seed the demo partner list):
- Temasek Polytechnic — ~20kg donated, used for sustainability research.
- Republic Polytechnic — FYP / student projects.
- GBTB — recurring donations for reuse/experimentation.
- Simei RC Community Garden — recurring, composting (carried over from the
  team's original HTML prototype — not explicitly in the Q&A, kept as the
  flagship "recurring partner" example).

**Operational context reflected in the UI:**
- No existing tracking system — grounds are collected opportunistically
  whenever staff service/restock machines (→ the Admin "Upload today's
  collection" form logs this manually, by region).
- No major restrictions on partners, but CoffeeBot weighs: quantity the
  partner can take, convenience of collection/delivery, and
  frequency/consistency of reuse (→ these three factors drive the
  allocation-recommendation scoring in `assets/js/ai.js: scoreRequest()`).
- CoffeeBot's stated priority is impact over revenue — most grounds are
  given away free (→ reflected in the "price offered" field being optional
  and explicitly deprioritized in the UI copy).

## Regions — naming note

The CoffeeBot staff Q&A names five regions: **North, South, East, West,
Central**. An earlier piece of client feedback asked for categorisation
"by region (north, north-east, etc.)" — that finer-grained scheme (the
one used for Singapore's own planning areas) isn't what the Q&A data is
actually broken down by, so this build uses the Q&A's real five-region
split instead of inventing a mapping that isn't backed by real numbers.
If CoffeeBot can later provide cup-volume data at a finer regional
grain, `assets/js/data.js` → `REGIONS` is the only place that needs updating.

## Our own planning assumptions (not from CoffeeBot)

- **Drying weather.** The 7-day forecast comes from
  [Open-Meteo](https://open-meteo.com) (free, no key, CC BY 4.0) for central
  Singapore — set `WEATHER_LAT` / `WEATHER_LON` in `assets/js/config.js` to
  the office where grounds are dried. Each day is rated:
  - **Poor** (30% of a normal day's drying): ≥10 mm rain or ≥90% mean humidity
  - **Fair** (60%): ≥2 mm rain, ≥85% humidity or ≥70% chance of rain
  - **Good** (100%): anything drier
  These thresholds and percentages are guesses to tune once CoffeeBot sees
  how long grounds really take to dry; they live in `assets/js/weather.js`.
- **Alerts** (`assets/js/alerts.js`):
  - *Missing data*: a collectable region with no collection logged for more
    than 7 days.
  - *Excess supply*: a region (with recent data) whose dried supply for the
    week, less pending requests, is at least 0.25 kg and at least half its supply.
  - *Wet week*: 3 or more poor drying days in the next 7.

## Invented for demo purposes (not from the Q&A)

- Exact daily collection figures (North's last one is 9 days old on
  purpose so the missing-data alert shows), individual request tickets, and usage
  logs shown on first load — seeded in `assets/js/data.js: defaultState()`
  so the dashboards aren't empty. Everything you add through the forms
  (new requests, usage logs, collections, approvals) persists in your
  browser's localStorage from then on.
- The CO2e-per-kg conversion factor (2.8) — carried over from the team's
  original HTML prototype, labelled there as a placeholder. Swap in a real
  factor in `assets/js/data.js` / `admin/operations.html` when CoffeeBot
  can supply one.
- The 6-week forecast-accuracy numbers on the Forecast page — illustrative
  only, scaled to the four sites (~3–4 kg wet a week) to show the chart shape; replace with real predicted-vs-actual
  history once a few weeks of real forecasts have run.
