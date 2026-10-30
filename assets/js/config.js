/* =========================================================
   CoffeeBot Exchange — site config
   AI_ENDPOINT is the Web App URL from deploying apps-script/Code.gs
   (ends in /exec). See docs/gemini-apps-script-setup.md.
   The Gemini API key lives in Apps Script, never here.
   WEATHER_LAT / WEATHER_LON: where grounds are dried, for the
   Open-Meteo drying forecast (defaults to central Singapore).
   ========================================================= */

const CB_CONFIG = {
  WEATHER_LAT: 1.3521,
  WEATHER_LON: 103.8198,
  AI_ENDPOINT: "https://script.google.com/macros/s/AKfycbxfgWYzo44Lj9aSbr3hk_Q_e-3ReEjnVqqkGqsT1riA7hPq4Z4aj5ieZ_X7Zs8Lh7jHeQ/exec",
};
