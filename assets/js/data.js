/* =========================================================
   CoffeeBot Exchange — data layer
   A static site has no real backend, so this module simulates
   one with localStorage. All seed figures below come straight
   from the CoffeeBot staff Q&A (see /docs/data-sources.md).
   ========================================================= */

const CB = (function () {
  // v2: regions moved to the sites CoffeeBot can actually collect from,
  // so older saved demo data is reseeded rather than mixed in.
  const STORAGE_KEY = "coffeebot_exchange_v2";

  /* ---------- real data from the CoffeeBot Q&A ---------- */
  // Collection points CoffeeBot staff offered, with estimated monthly
  // consumption. South's sites are all under contract, so nothing can be
  // collected there — South partners can still request grounds.
  const REGIONS = [
    { id: "north",   name: "North",   location: "Woodlands 11",           cupsPerMonth: 400, collectable: true  },
    { id: "south",   name: "South",   location: "No collection point",    cupsPerMonth: 0,   collectable: false,
      note: "South sites are under contract, so grounds can't be collected there." },
    { id: "east",    name: "East",    location: "Changi Airport T2",      cupsPerMonth: 500, collectable: true  },
    { id: "west",    name: "West",    location: "SAFRA Jurong",           cupsPerMonth: 500, collectable: true  },
    { id: "central", name: "Central", location: "Skypark by Kiztopia",    cupsPerMonth: 400, collectable: true  },
  ];
  const COLLECTABLE = REGIONS.filter((r) => r.collectable);

  // Assumptions stated directly by CoffeeBot staff:
  const ASSUMPTIONS = {
    coffeeShareOfBeverages: 0.60,     // ~60% of beverages purchased are coffee-based
    gramsPerCoffeeCup: 15,            // ~15g of wet used grounds per coffee-based cup
    dryGramsPerCup: { min: 5, max: 8 }, // what's left after drying, depending on moisture
    restDays: { min: 2, max: 4 },     // wait before drying starts
    minutesPerMachine: 15,            // collection time per machine
    staffHoursPerWeek: { min: 6, max: 8 }, // collection + packing only, not admin work
  };
  // Share of wet weight left once dried (midpoint of 5–8g out of 15g).
  const DRY_RATIO = (ASSUMPTIONS.dryGramsPerCup.min + ASSUMPTIONS.dryGramsPerCup.max) / 2 / ASSUMPTIONS.gramsPerCoffeeCup;

  function regionById(id) {
    return REGIONS.find((r) => r.id === id);
  }

  // Wet grounds generated per month for a region, in kg, from the stated assumptions.
  function monthlyGroundsKg(region) {
    const coffeeCups = region.cupsPerMonth * ASSUMPTIONS.coffeeShareOfBeverages;
    const grams = coffeeCups * ASSUMPTIONS.gramsPerCoffeeCup;
    return grams / 1000;
  }

  function dailyGroundsKg(region) {
    return monthlyGroundsKg(region) / 30;
  }

  function dryKg(wetKg) {
    return wetKg * DRY_RATIO;
  }

  /* ---------- seed / demo state ---------- */
  function defaultState() {
    const now = Date.now();
    const day = 86400000;

    return {
      // Off-takers to date — from CoffeeBot staff Q&A (answers #5 and dashboard prototype)
      partners: [
        { id: "p1", name: "Simei RC Community Garden", type: "Recurring", use: "Composting, garden beds", region: "east", kgReceived: 18.0, co2eKg: 50.4 },
        { id: "p2", name: "Temasek Polytechnic", type: "One-off", use: "Sustainability research", region: "east", kgReceived: 20.0, co2eKg: 56.0 },
        { id: "p3", name: "Republic Polytechnic", type: "Recurring", use: "FYP / student projects", region: "north", kgReceived: 9.5, co2eKg: 26.6 },
        { id: "p4", name: "GBTB", type: "Recurring", use: "Reuse / experimentation", region: "central", kgReceived: 6.0, co2eKg: 16.8 },
      ],

      // Customer requests (off-taker "submit this week's request" tickets)
      requests: [
        {
          id: "R-104", customer: "Simei RC Community Garden", region: "east",
          useCase: "Composting for raised garden beds, weekly", volumeKg: 2.5,
          frequency: "Weekly", priceOffered: 0, status: "pending",
          createdAt: now - 1 * day,
        },
        {
          id: "R-103", customer: "Temasek Polytechnic", region: "east",
          useCase: "Sustainability research — soil amendment trial", volumeKg: 5.0,
          frequency: "One-off", priceOffered: 0, status: "accepted",
          createdAt: now - 3 * day,
        },
        {
          id: "R-102", customer: "Republic Polytechnic", region: "north",
          useCase: "FYP project on compost acceleration", volumeKg: 3.0,
          frequency: "Fortnightly", priceOffered: 0, status: "accepted",
          createdAt: now - 6 * day,
        },
        {
          id: "R-101", customer: "GBTB", region: "central",
          useCase: "Experimental reuse trial", volumeKg: 1.5,
          frequency: "Weekly", priceOffered: 0, status: "declined",
          createdAt: now - 9 * day,
        },
      ],

      // Usage logs ("log last week's usage" — feeds impact dashboard)
      usageLogs: [
        { id: "U-30", customer: "Simei RC Community Garden", region: "east", compostKg: 12.0, soilRating: 4, loggedAt: now - 2 * day },
        { id: "U-29", customer: "Simei RC Community Garden", region: "east", compostKg: 9.0, soilRating: 5, loggedAt: now - 9 * day },
        { id: "U-28", customer: "Republic Polytechnic", region: "north", compostKg: 4.0, soilRating: 4, loggedAt: now - 10 * day },
      ],

      // Historical waste-diverted-by-day, last 14 days (kg) — for charts
      wasteHistory: buildWasteHistory(now, day),

      // Collections uploaded by admin staff (from "no tracking system — collected when staff services machines").
      // Wet kg, roughly one week of each site's output. North's last round is
      // deliberately old so the "missing data" alert shows in the demo.
      collections: [
        { id: "C-21", region: "east", kg: 1.1, collectedAt: now - 1 * day, staff: "Ops Team" },
        { id: "C-20", region: "west", kg: 1.0, collectedAt: now - 2 * day, staff: "Ops Team" },
        { id: "C-19", region: "central", kg: 0.8, collectedAt: now - 3 * day, staff: "Ops Team" },
        { id: "C-18", region: "north", kg: 0.9, collectedAt: now - 9 * day, staff: "Ops Team" },
      ],

      auth: { customer: null, admin: null },
    };
  }

  function buildWasteHistory(now, day) {
    const out = [];
    // Deterministic pseudo-variation around each region's daily baseline so the
    // chart looks like real operational data rather than a flat line, while
    // staying anchored to the real monthly-cup-volume assumptions.
    for (let i = 13; i >= 0; i--) {
      const ts = now - i * day;
      let total = 0;
      REGIONS.forEach((r, idx) => {
        const base = dailyGroundsKg(r);
        const wobble = Math.sin((i + idx) * 1.3) * base * 0.18;
        total += Math.max(0, base + wobble);
      });
      out.push({ date: ts, kg: Math.round(total * 10) / 10 });
    }
    return out;
  }

  /* ---------- persistence ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = defaultState();
        save(seeded);
        return seeded;
      }
      return JSON.parse(raw);
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore quota/availability errors — demo data still works in-memory */
    }
  }

  function getState() {
    if (!window.__cbState) window.__cbState = load();
    return window.__cbState;
  }

  function setState(mutator) {
    const state = getState();
    mutator(state);
    save(state);
    return state;
  }

  function resetDemoData() {
    const seeded = defaultState();
    window.__cbState = seeded;
    save(seeded);
    return seeded;
  }

  /* ---------- derived helpers ---------- */
  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  }

  function regionName(id) {
    const r = regionById(id);
    return r ? r.name : id;
  }

  function nextId(prefix, list) {
    const nums = list.map((x) => parseInt(String(x.id).split("-")[1], 10)).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return prefix + "-" + next;
  }

  return {
    REGIONS, COLLECTABLE, ASSUMPTIONS, DRY_RATIO,
    regionById, monthlyGroundsKg, dailyGroundsKg, dryKg,
    getState, setState, resetDemoData,
    fmtDate, regionName, nextId,
  };
})();
