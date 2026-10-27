# Setting up Gemini via Google Apps Script

The admin pages' **Generate** buttons (Home → briefing, Forecast → forecast
insights, Allocation → allocation review) call a small Google Apps Script
web app, which calls Gemini and returns generated stats, insights and next
actions. The Gemini API key is stored inside Apps Script, so it never
appears in the browser or in this repo.

```
Admin clicks Generate
  → site POSTs { task, data } to your Apps Script /exec URL
    → Apps Script builds the prompt and calls Gemini with the stored key
      → returns { headline, stats[4], insights[], actions[] } as JSON
        → site renders it in the AI panel
```

Setup takes about 10 minutes.

## 1. Get a Gemini API key

1. Go to <https://aistudio.google.com/apikey> and sign in with your Google
   account.
2. Click **Create API key**, pick or create a Google Cloud project, and
   copy the key. Keep it private. You will paste it into Apps Script in
   step 3, not into the website.

The free tier is enough for this prototype.

## 2. Create the Apps Script project

1. Go to <https://script.google.com> and click **New project**.
2. Rename it (top left) to something like `CoffeeBot AI endpoint`.
3. Delete the starter code in `Code.gs`, then paste in the whole of
   [`apps-script/Code.gs`](../apps-script/Code.gs) from this repo.
4. Click **Save** (the disk icon).

## 3. Store the API key in Script Properties

1. In the left sidebar, click **Project Settings** (the gear icon).
2. Scroll to **Script Properties** and click **Add script property**.
3. Add:
   - Property: `GEMINI_API_KEY`
   - Value: the key from step 1
4. Optional: add `GEMINI_MODEL` to use a different model. The default is
   `gemini-2.5-flash`. If Google retires that model, change this property
   to a current one (see <https://ai.google.dev/gemini-api/docs/models>);
   you don't need to edit any code.
5. Click **Save script properties**.

## 4. Test it from the editor

1. Go back to **Editor** (the `< >` icon).
2. In the toolbar's function dropdown, select `testGemini` and click **Run**.
3. The first run asks for permission. Click **Review permissions**, choose
   your account, then **Advanced → Go to CoffeeBot AI endpoint (unsafe)**
   → **Allow**. ("Unsafe" only means Google hasn't verified your personal
   script; it's your own code.)
4. Open the **Execution log**. You should see a JSON object with
   `headline`, `stats`, `insights` and `actions`. If you get an error,
   see Troubleshooting below.

## 5. Deploy as a web app

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set:
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone** (this is required so the website can call
     it without a Google sign-in)
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
5. Optional check: open that URL in a browser tab. You should see
   `{"ok":true,"status":"CoffeeBot AI endpoint is running.", ...}`.

## 6. Connect the website

Open [`assets/js/config.js`](../assets/js/config.js) and paste the URL:

```js
const CB_CONFIG = {
  AI_ENDPOINT: "https://script.google.com/macros/s/XXXXXXXX/exec",
};
```

Reload any admin page (Home, Forecast or Allocation) and click
**Generate**. The result is cached in that browser, so it's still there
when you come back; click **Regenerate** for a fresh one.

## Updating the script later

If you edit `Code.gs`, the live URL keeps running the old version until
you redeploy: **Deploy → Manage deployments → ✏️ edit → Version: New
version → Deploy**. Editing the existing deployment this way keeps the
same `/exec` URL, so `config.js` doesn't need changing.

## Troubleshooting

| What you see | Fix |
|---|---|
| "AI endpoint not connected yet" | `AI_ENDPOINT` in `assets/js/config.js` is empty. |
| `GEMINI_API_KEY is not set in Script Properties.` | Repeat step 3 and check the property name is spelled exactly right. |
| `Gemini HTTP 400 ... API key not valid` | The key was mistyped or deleted. Create a new one in AI Studio. |
| `Gemini HTTP 404 ... model ... not found` | The model was retired. Set `GEMINI_MODEL` to a current model name. |
| `Gemini HTTP 429` | You hit the free-tier rate limit. Wait a minute and try again. |
| `Failed to fetch` / CORS error in the browser console | The deployment's access isn't set to **Anyone**, or you copied the editor URL instead of the `/exec` URL. Redeploy per step 5. |
| Old behaviour after editing `Code.gs` | Redeploy a new version (see "Updating the script later"). |

## Notes

- The `/exec` URL is public: anyone who has it can use your Gemini free-tier
  quota. That's fine for a class prototype. Don't share the URL widely,
  and you can remove the deployment after the project ends.
- The prompts live in `apps-script/Code.gs` (`CONTEXT`, `TASKS`,
  `OUTPUT_RULES`). To change what Gemini writes, edit them there and
  redeploy. The data each task sends is built in `assets/js/ai.js`
  (`forecastData`, `allocationData`, `briefingData`).
