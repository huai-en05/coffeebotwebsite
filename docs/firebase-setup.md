# Setting up Firestore for shared data

Requests, usage logs, collections, partners and the waste-by-day history
are stored in Cloud Firestore, so a
request a partner submits shows up for staff on any device. The site uses
Firestore's REST API directly, with no Firebase SDK and no API key. Access
is controlled by the security rules in [`firestore.rules`](../firestore.rules).

The project ID is set in `assets/js/config.js`:

```js
FIREBASE_PROJECT_ID: "coffeebot-8fea5",
```

## 1. Create the Firestore database

1. Open the [Firebase console](https://console.firebase.google.com/), pick
   the project, and go to **Build → Firestore Database → Create database**.
2. **Edition**: Standard.
3. **Location**: this can't be changed later.
   - Data centres differ a lot in how clean their electricity is. Google
     publishes a carbon-free energy (CFE) percentage for each region and
     marks the cleanest ones **Low CO₂**. See
     <https://cloud.google.com/sustainability/region-carbon>.
   - Singapore (`asia-southeast1`) is close to users but scores low, because
     the grid runs mostly on gas. A low-CO₂ region further away adds a few
     hundred milliseconds per request.
   - The data here is a few KB and is read a handful of times per page load,
     so either choice has a tiny footprint. Pick whichever trade-off you can
     justify.
4. **Rules**: choose **production mode**. The real rules are published in
   step 2.

## 2. Publish the security rules

1. Go to **Firestore Database → Rules**.
2. Replace the contents with [`firestore.rules`](../firestore.rules) and
   click **Publish**.

The rules allow anyone to:
- read requests, usage logs and collections
- add records that have exactly the expected fields and types
- change a request's `status` to pending, accepted or declined

Everything else is blocked, including deletes. The site has no real
sign-in, so the rules can't tell staff from partners.

## 3. Check it works

1. Open the site and log in on either side. The first page load finds the
   database empty and seeds it with the demo data from the staff Q&A. In
   the console you should see `requests`, `usageLogs`, `collections`,
   `partners`, `wasteHistory`, `regions` and `assumptions` collections.
2. In one browser, log in as a customer and submit a request on
   **Order**. A new `R-n` document appears in the console.
3. In another browser or an incognito window, log in as admin and open
   **Operations**. The new request is listed. Accept it, and its `status`
   field in the console changes to `accepted`.
4. Pages that are already open pick up changes when you switch back to
   their tab.

## Editing regions and assumptions

The forecasts are built on two settings collections. Edit them in the
Firebase console; the console isn't bound by the security rules. Pages
use the new values the next time they load.

- **`regions`**: one document per region, for example `east`.
  - `cupsPerMonth`: drives that region's forecast.
  - `collectable`: `false` means staff can't collect there.
  - `note`: shown when a region isn't collectable.
  - `order`: the display order.
  - To add a region, create a document with the same fields and set
    `id` to match the document ID. Requests and collections for that
    region are then accepted.
- **`assumptions/current`**:
  - `coffeeShareOfBeverages`: a number from 0 to 1.
  - `gramsPerCoffeeCup`: wet grams per cup.
  - `dryGramsPerCup.min` and `.max`: these set the dry ratio.
  - `restDays`, `minutesPerMachine`, `staffHoursPerWeek`.

Keep each field's type the same: numbers stay numbers and `collectable`
stays a boolean. The site's text paragraphs, such as the landing page's
"15g wet becomes 5–8g", are written into the HTML and don't change with
these settings.

## Troubleshooting

Open DevTools → Console.

| What you see | Fix |
|---|---|
| `Shared data unavailable, using this device's copy.` with HTTP 403 | The database doesn't exist yet (step 1), or the rules weren't published (step 2). |
| `Couldn't submit request: Missing or insufficient permissions.` | The record failed the rules. Check that the published rules match `firestore.rules`. |
| Data doesn't reset after clearing site data | It's in Firestore now. Delete the documents in the console; the next page load re-seeds an empty database. |

To go back to browser-only storage, set `FIREBASE_PROJECT_ID: ""`.
