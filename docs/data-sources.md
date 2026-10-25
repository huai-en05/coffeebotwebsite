# Data sources & assumptions

This prototype's figures come from two places: the CoffeeBot staff Q&A
(real data, quoted below) and demo data invented to make the UI feel alive
where no real figures exist yet. Everything invented is marked as such so
it's easy to swap in real numbers later.

## From the CoffeeBot staff Q&A (real)

**Regional cup volumes** (approx. cups/month, from machine consumption data):

| Region  | Location                          | Cups / month |
|---------|------------------------------------|---------------|
| North   | Republic Polytechnic               | 700           |
| South   | 100 Pasir Panjang                  | 500           |
| East    | Changi General Hospital            | 1,000–1,200   |
| West    | NTU                                | 800–1,000     |
| Central | Singapore Business Federation      | 600–800       |

For ranges, this prototype uses the midpoint (East → 1,100; West → 900;
Central → 700) as a single planning figure — see `assets/js/data.js`.

**Grounds-generation assumptions** (stated directly by CoffeeBot staff):
- ~60% of beverages purchased are coffee-based (require beans → generate grounds).
- ~15g of used coffee grounds generated per coffee-based cup.
- These two assumptions are used throughout (`CB.monthlyGroundsKg()` /
  `CB.dailyGroundsKg()` in `assets/js/data.js`) to turn a region's cup
  volume into an expected kg/day of grounds.

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
- Estimated staff time: 6–8 hours/week — not surfaced in the UI itself,
  noted here for scoping/context.

## Regions — naming note

The CoffeeBot staff Q&A names five regions: **North, South, East, West,
Central**. An earlier piece of client feedback asked for categorisation
"by region (north, north-east, etc.)" — that finer-grained scheme (the
one used for Singapore's own planning areas) isn't what the Q&A data is
actually broken down by, so this build uses the Q&A's real five-region
split instead of inventing a mapping that isn't backed by real numbers.
If CoffeeBot can later provide cup-volume data at a finer regional
grain, `assets/js/data.js` → `REGIONS` is the only place that needs updating.

## Invented for demo purposes (not from the Q&A)

- Exact daily collection figures, individual request tickets, and usage
  logs shown on first load — seeded in `assets/js/data.js: defaultState()`
  so the dashboards aren't empty. Everything you add through the forms
  (new requests, usage logs, collections, approvals) persists in your
  browser's localStorage from then on.
- The CO2e-per-kg conversion factor (2.8) — carried over from the team's
  original HTML prototype, labelled there as a placeholder. Swap in a real
  factor in `assets/js/data.js` / `admin/operations.html` when CoffeeBot
  can supply one.
- The 6-week forecast-accuracy numbers on the Forecast page — illustrative
  only, to show the chart shape; replace with real predicted-vs-actual
  history once a few weeks of real forecasts have run.
