/* =========================================================
   CoffeeBot Exchange — data layer
   Shared records (requests, usage logs, collections, partners,
   waste history) and the settings behind the forecasts (regions,
   assumptions) live in Firestore when FIREBASE_PROJECT_ID is set
   in config.js, with localStorage as a cache; otherwise everything
   stays in localStorage. All seed figures below come straight from the
   CoffeeBot staff Q&A (see /docs/data-sources.md).
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

  // Regions and assumptions below are the defaults and the seed for
  // Firestore's `regions` and `assumptions` collections. Once the cloud
  // copy loads, applySettings() swaps it in place, so edits made in the
  // Firebase console take effect without changing this file.
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
  const dryRatio = () => (ASSUMPTIONS.dryGramsPerCup.min + ASSUMPTIONS.dryGramsPerCup.max) / 2 / ASSUMPTIONS.gramsPerCoffeeCup;
  let DRY_RATIO = dryRatio();

  // Seed copies, taken before any cloud values replace the live ones.
  // Every region gets a note (empty unless it can't be collected from)
  // and an order, which keeps the display order in Firestore.
  const SEED_REGIONS = REGIONS.map((r, i) => ({ note: "", ...r, order: i + 1 }));
  const SEED_ASSUMPTIONS = { id: "current", ...JSON.parse(JSON.stringify(ASSUMPTIONS)) };

  // Swaps in regions and assumptions from state, keeping the same array
  // and object references other scripts already hold.
  function applySettings(s) {
    if (s.regions && s.regions.length) {
      REGIONS.splice(0, REGIONS.length, ...s.regions);
      COLLECTABLE.splice(0, COLLECTABLE.length, ...REGIONS.filter((r) => r.collectable));
    }
    const a = s.assumptions && s.assumptions[0];
    if (a) {
      const { id, ...values } = a;
      Object.assign(ASSUMPTIONS, values);
    }
    DRY_RATIO = dryRatio();
  }

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
        { id: "C-21", region: "east", kg: 1.1, collectedAt: now - 1 * day, address: "Changi Airport T2" },
        { id: "C-20", region: "west", kg: 1.0, collectedAt: now - 2 * day, address: "SAFRA Jurong" },
        { id: "C-19", region: "central", kg: 0.8, collectedAt: now - 3 * day, address: "Skypark by Kiztopia" },
        { id: "C-18", region: "north", kg: 0.9, collectedAt: now - 9 * day, address: "Woodlands 11" },
      ],

      // Settings the forecasts are built on; see applySettings().
      regions: SEED_REGIONS.map((r) => ({ ...r })),
      assumptions: [JSON.parse(JSON.stringify(SEED_ASSUMPTIONS))],

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
      // Defaults fill in anything an older saved copy doesn't have yet.
      return { ...defaultState(), ...JSON.parse(raw) };
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
    if (!window.__cbState) {
      window.__cbState = load();
      applySettings(window.__cbState);
    }
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

  /* ---------- cloud sync (Firestore REST) ---------- */
  // Requests, usage logs and collections are shared through Firestore, so a
  // request a partner submits shows up for staff on any device. It uses
  // plain REST calls rather than the Firebase SDK to keep every page light.
  // Login sessions stay in this browser, and localStorage remains a cache
  // so pages still work if Firestore is down.
  const newestFirst = (field) => (a, b) => b[field] - a[field];
  const CLOUD = {
    requests:     { prefix: "R", order: newestFirst("createdAt") },
    usageLogs:    { prefix: "U", order: newestFirst("loggedAt") },
    collections:  { prefix: "C", order: newestFirst("collectedAt") },
    partners:     { order: (a, b) => a.id.localeCompare(b.id, "en", { numeric: true }) },
    // Oldest first, as the charts expect; only the latest 30 days are kept in view.
    wasteHistory: { order: (a, b) => a.date - b.date, keep: 30 },
    // Settings: regions in display order, and one "current" assumptions doc.
    regions:      { order: (a, b) => a.order - b.order },
    assumptions:  { order: () => 0 },
  };
  const ordered = (coll, list) => {
    const sorted = [...list].sort(CLOUD[coll].order);
    return CLOUD[coll].keep ? sorted.slice(-CLOUD[coll].keep) : sorted;
  };
  // wasteHistory entries had no id; they're keyed by their timestamp.
  const wasteEntry = (date, kg) => ({ id: "W-" + date, date, kg });

  function projectId() {
    return (typeof CB_CONFIG !== "undefined" && CB_CONFIG.FIREBASE_PROJECT_ID) || "";
  }
  const cloudEnabled = () => !!projectId();
  const dbPath = () => `projects/${projectId()}/databases/(default)/documents`;
  const docName = (coll, id) => `${dbPath()}/${coll}/${id}`;

  function toValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
    if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    return { stringValue: String(v) };
  }
  function fromValue(v) {
    if ("mapValue" in v) return fromFields(v.mapValue.fields);
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("nullValue" in v) return null;
    return v.stringValue;
  }
  const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
  const fromFields = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, fromValue(v)]));
  const fromDoc = (doc) => fromFields(doc.fields);

  async function fetchCollection(coll) {
    const docs = [];
    let token = "";
    do {
      const url = `https://firestore.googleapis.com/v1/${dbPath()}/${coll}?pageSize=300` +
        (token ? "&pageToken=" + encodeURIComponent(token) : "");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Firestore ${coll}: HTTP ${res.status}`);
      const body = await res.json();
      (body.documents || []).forEach((d) => docs.push(fromDoc(d)));
      token = body.nextPageToken;
    } while (token);
    return ordered(coll, docs);
  }

  // All writes go through one atomic commit call.
  async function commit(writes) {
    const res = await fetch(`https://firestore.googleapis.com/v1/${dbPath()}:commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    });
    if (res.ok) return;
    const body = await res.json().catch(() => ({}));
    const err = new Error((body.error && body.error.message) || `Firestore HTTP ${res.status}`);
    err.status = body.error && body.error.status;
    throw err;
  }

  const createWrite = (coll, rec) => ({
    update: { name: docName(coll, rec.id), fields: toFields(rec) },
    currentDocument: { exists: false },
  });

  // An empty collection gets the seed data from the Q&A, once. If another
  // visitor seeds at the same moment, theirs wins and this fails harmlessly.
  async function seedCloud(colls) {
    const seed = defaultState();
    seed.wasteHistory = seed.wasteHistory.map((h) => wasteEntry(h.date, h.kg));
    const writes = [];
    colls.forEach((coll) => seed[coll].forEach((rec) => writes.push(createWrite(coll, rec))));
    await commit(writes).catch((e) => console.warn("Couldn't seed " + colls.join(", "), e));
  }

  // Order-insensitive fingerprint, since Firestore doesn't keep field order.
  const canon = (v) => (v && typeof v === "object" ? Object.keys(v).sort().map((k) => [k, canon(v[k])]) : v);
  const sig = (list) => JSON.stringify((list || []).map(canon));

  // Replaces the cached shared collections with Firestore's. A collection
  // that can't be read keeps its cached copy. Resolves true if anything changed.
  async function pull(seeded) {
    const names = Object.keys(CLOUD);
    const results = await Promise.allSettled(names.map(fetchCollection));
    if (results.every((r) => r.status === "rejected")) throw results[0].reason;
    const empty = names.filter((_, i) => results[i].status === "fulfilled" && results[i].value.length === 0);
    if (!seeded && empty.length) {
      await seedCloud(empty);
      return pull(true);
    }
    let changed = false;
    setState((s) => names.forEach((coll, i) => {
      const r = results[i];
      if (r.status === "rejected") return console.warn(r.reason);
      if (sig(s[coll]) !== sig(r.value)) { s[coll] = r.value; changed = true; }
    }));
    if (changed) applySettings(getState());
    return changed;
  }

  const withTimeout = (p, ms) =>
    Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

  // Pages wait on this before rendering. It falls back to the cached copy
  // if Firestore is slow, unreachable or not configured.
  let readyPromise = null;
  function ready() {
    if (!readyPromise) {
      readyPromise = cloudEnabled()
        ? withTimeout(pull(), 6000).catch((e) => console.warn("Shared data unavailable, using this device's copy.", e))
        : Promise.resolve();
    }
    return readyPromise;
  }

  // Coming back to the tab picks up changes made elsewhere; pages listen
  // for "cb:synced" to re-render. One fetch per return, no polling.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !readyPromise || !cloudEnabled()) return;
    pull()
      .then((changed) => { if (changed) document.dispatchEvent(new CustomEvent("cb:synced")); })
      .catch(() => {});
  });

  // Adds a record under the next free id (R-105, ...). The id is claimed with
  // an exists:false check, so two people saving at once can't both get it;
  // whoever loses refetches and takes the next one. Firestore runs the
  // security rules before that check, so a taken id usually comes back as
  // PERMISSION_DENIED (rules treat it as an edit), not ALREADY_EXISTS.
  // `linked(rec)` returns [collection, record] pairs saved in the same commit.
  async function addRecord(coll, fields, linked = () => []) {
    const { prefix } = CLOUD[coll];
    const keep = (rec, extra) => setState((s) => {
      [[coll, rec], ...extra].forEach(([c, r]) => { s[c] = ordered(c, [...s[c], r]); });
    });
    if (!cloudEnabled()) {
      const rec = { id: nextId(prefix, getState()[coll]), ...fields };
      keep(rec, linked(rec));
      return rec;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = { id: nextId(prefix, getState()[coll]), ...fields };
      const extra = linked(rec);
      try {
        await commit([createWrite(coll, rec), ...extra.map(([c, r]) => createWrite(c, r))]);
        keep(rec, extra);
        return rec;
      } catch (e) {
        if (!["FAILED_PRECONDITION", "ALREADY_EXISTS", "PERMISSION_DENIED"].includes(e.status)) throw e;
        const fresh = await fetchCollection(coll);
        setState((s) => { s[coll] = fresh; });
        if (!fresh.some((r) => r.id === rec.id)) throw e; // a genuine rules rejection, not a clash
      }
    }
    throw new Error("Couldn't save, please try again.");
  }

  async function setRequestStatus(ids, status) {
    if (cloudEnabled() && ids.length) {
      await commit(ids.map((id) => ({
        update: { name: docName("requests", id), fields: { status: toValue(status) } },
        updateMask: { fieldPaths: ["status"] },
        currentDocument: { exists: true },
      })));
    }
    setState((s) => s.requests.forEach((r) => { if (ids.includes(r.id)) r.status = status; }));
  }

  return {
    REGIONS, COLLECTABLE, ASSUMPTIONS,
    get DRY_RATIO() { return DRY_RATIO; },
    regionById, monthlyGroundsKg, dailyGroundsKg, dryKg,
    getState, setState, resetDemoData,
    fmtDate, regionName, nextId,
    ready, setRequestStatus,
    addRequest: (fields) => addRecord("requests", fields),
    addUsageLog: (fields) => addRecord("usageLogs", fields),
    // A collection also adds its weight to the waste-by-day history.
    addCollection: (fields) => addRecord("collections", fields,
      (rec) => [["wasteHistory", wasteEntry(rec.collectedAt, rec.kg)]]),
  };
})();
