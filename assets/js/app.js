/* =========================================================
   CoffeeBot Exchange — shared UI helpers
   ========================================================= */

const CBUI = (function () {
  // Folder holding css/js/doodles, worked out from this script's own URL so
  // the same helpers work from index.html and from admin/ or customer/ pages.
  const ASSETS = new URL("../", document.currentScript.src).href;

  // Hand-drawn icons from Oreo Doodle Icons by Nicole Tang (MIT) and one from
  // Pepicons Pencil by CyCraft (CC BY 4.0), copied from Iconify.
  // Plain strings use the doodle set's 48×48 grid; arrays carry their own viewBox.
  const ICONS = {
      "home": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M8.5 24c5-5.4 10.1-10.4 15.5-15c5.4 4.6 10.5 9.6 15.5 15\"/><path d=\"M12 21.5c-.4 6-.3 12.1.2 18c7.8.8 15.8.7 23.6 0c.5-5.9.6-12 .2-18\"/><path d=\"M20.5 39.5c-.2-3.8-.1-7.2.5-10q3-.45 6 0c.6 2.8.7 6.2.5 10\"/></g>",
      "upload": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M9.5 31c.1 2.6.3 4.6.7 6.2c9.1.9 18.4.9 27.5 0c.4-1.7.6-3.7.7-6.2M24 9.8c.2 6.2.2 12.5 0 18.7\"/><path d=\"M17 16.5c2.3-2.3 4.6-4.6 7-6.9c2.4 2.3 4.7 4.6 7 6.9\"/></g>",
      "dashboard": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M10 11c9.4-.8 18.8-.7 28 0c.7 8.6.6 17.4-.1 25.9c-9.3.8-18.6.7-27.8 0c-.7-8.6-.7-17.4-.1-25.9\"/><path d=\"M24 11c.15 8.6.15 17.3 0 25.9\"/><path d=\"M9.8 24c9.5.2 18.9.2 28.4 0\"/></g>",
      "calendar": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M9.5 14c9.7-.8 19.4-.7 29 0c.8 6.9.7 14.1 0 20.9c-9.6.9-19.3.8-28.9 0c-.7-6.9-.7-14.1-.1-20.9\"/><path d=\"M9.8 20.5c9.6.6 19.2.5 28.4-.1m-22.7-9.8q.15 2.1 0 4.2m5.7-4.4q.15 2.1 0 4.2m5.6-4.2q.15 2.1 0 4.2m5.6-4q.15 2.1 0 4.2M15 26h.01m5.99.3h.01m5.99-.1h.01M33 26h.01M15 30.8h.01M21 31h.01m5.99-.1h.01\"/></g>",
      "bell": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M24 9v3m-8.5 8.5c.1-5 3.5-8.5 8.5-8.5s8.4 3.5 8.5 8.5c.1 4 1.1 7.5 3.5 10.3q-12 1.8-24 0c2.4-2.8 3.4-6.3 3.5-10.3m5.3 14c.6 1.9 1.7 2.8 3.2 2.8s2.6-.9 3.2-2.8\"/>",
      "check": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M24 8.5c8.8 0 15.5 6.7 15.5 15.5S32.8 39.5 24 39.5S8.5 32.8 8.5 24S15.2 8.5 24 8.5\"/><path d=\"M16.5 24.5c2 2.2 3.9 4.4 5.7 6.7c3.1-4.7 6.4-9.2 9.8-13.6\"/></g>",
      "x": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M13 13.5c7 7 14 14.1 21.5 21\"/><path d=\"M34.7 13.3c-7.2 7.1-14.3 14.2-21.4 21.4\"/></g>",
      "sparkle": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M18.4 20.2c1 2.4 1.9 4.7 3 7c2.5.2 5 .5 7.5 1c-1.9 1.7-3.7 3.3-5.6 4.8c.6 2.5 1.1 5 1.4 7.5c-2-1.2-4.2-2.6-6.3-3.9c-2.2 1.3-4.3 2.7-6.4 3.9q.6-3.75 1.5-7.5c-1.9-1.5-3.8-3.1-5.6-4.8c2.5-.5 5-.8 7.4-1c1.1-2.3 2.1-4.6 3.1-7M32.7 7.5c.7 1.7 1.4 3.3 2.1 5c1.8.2 3.6.4 5.3.7c-1.3 1.2-2.6 2.3-4 3.5c.5 1.8.8 3.5 1.1 5.2q-2.25-1.2-4.5-2.7c-1.6 1-3.1 1.9-4.6 2.7c.3-1.7.6-3.4 1.1-5.2c-1.4-1.2-2.7-2.3-4-3.5c1.7-.3 3.5-.5 5.3-.7c.7-1.7 1.4-3.3 2.2-5\"/>",
      "trend": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"m12 36l23.5-23.5M21 11.8c5-.4 10-.3 15 .2c.5 5 .5 10 .1 15\"/>",
      "map": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M24 6c8 0 14 6.2 14 14c0 8-9.5 15.6-14 22c-4.5-6.4-14-14-14-22c0-7.8 6-14 14-14\"/><path d=\"M24 14.6c3.1-.1 5.1 1.9 5 5c-.1 3-2.1 4.9-5 4.8s-4.8-2-4.8-4.9s2-4.8 4.8-4.9\"/></g>",
      "logout": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M20 9.5c-2.8-.1-5.3 0-7.6.4q-.9 14.1 0 28.2c2.3.4 4.8.5 7.6.4m.5-14.5c5.3-.2 10.7-.2 16 0\"/><path d=\"M30.5 17.5c2.2 2.1 4.3 4.3 6.3 6.5c-2 2.2-4.1 4.3-6.3 6.4\"/></g>",
      "user": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M24 9.5c3.9-.1 6.4 2.4 6.4 6.2c0 3.7-2.5 6.2-6.3 6.2s-6.3-2.5-6.3-6.2s2.5-6.1 6.2-6.2M11.5 38.8c.2-7.3 5.5-12.4 12.5-12.4s12.3 5.1 12.5 12.4c-8.3.8-16.7.8-25 0\"/>",
      "mail": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M8 14c11-1.2 22-1.1 32 0c1 6.6.9 13.6 0 19.8c-11 1.1-22 1-31.9 0c-1-6.3-1-13.4-.1-19.8\"/><path d=\"M9.5 15.5C14.3 20.2 19 24 24 26.2c5-2.4 9.8-6.3 14.4-10.8\"/></g>",
      "lock": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M15 25.5c6-.7 13-.6 18.5 0c1.1 4.7 1 10.5.3 15c-6.8.9-13.3.7-19.2 0c-.8-4.8-.7-10.4.4-15\"/><path d=\"M16.5 24.8c-.3-5.9.7-11.4 5.4-12.7s8.7 1.3 9.3 6.3c.2 2.1.3 4.3.2 6.5m-7.3 5.7h.01m-.01 4.2v2.6\"/></g>",
      "arrow": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M9.5 24c9 .2 18.5.2 28 0\"/><path d=\"M29 15.5c3 2.8 6 5.6 8.8 8.5c-2.8 2.9-5.8 5.7-8.8 8.5\"/></g>",
      "leaf": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M37 11c.8 10.5-1.5 19-8.5 22.5c-6.5 3-13-.1-15-6C20 17.6 27.5 12.4 37 11\"/><path d=\"M10 38.5c6.5-9 14.5-17.5 24-24.5\"/></g>",
      "box": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M9 11.5q15-1.2 30 0c.4 2.3.4 4.6.1 6.8c-10 .7-20.1.7-30.1 0c-.4-2.3-.4-4.6 0-6.8m2.5 7.5c-.3 6.5-.1 12.9.5 19q12 1.2 24 0c.6-6.1.8-12.5.5-19\"/><path d=\"M20 24.5c2.6-.2 5.3-.2 7.9 0\"/></g>",
      "sprout": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M26 15c.1-.8.1-1.6.1-2.4c.2-.5.3-1.1.3-1.7c.4-.4.7-.7.9-1.2c.4-.2.9-.7 1.2-1c.5.1 1.1 0 1.7-.1c.5 0 .9 0 1.4-.1c0 .1.2.2.2.1c.1.2.1.2.2 0c-.1.2 0 .3.2.3c0 .1 0 .1.1 0c-.2.5-.3 1-.3 1.6c-.2.5-.2.9-.2 1.5c-.3.4-.6.9-.7 1.4c-.6.2-1.1.5-1.5 1c-.5-.1-1 0-1.4.1q-.75 0-1.5.3c-.6.3-1 .6-1.4 1.1c-.4.3-.8.8-.9 1.3c-.3.6-.4 1.1-.3 1.6c0 .8 0 1.6.3 2.4c0 1 .3 1.8.7 2.6c-.3.6-.5 1.2-.5 1.7c-.2.4-.5.8-.6 1.2\"/><path d=\"M15.8 14.6c.6-.1 1.3-.4 1.7-.8c.7 0 1.3 0 2-.3c.6.3 1.1.6 1.6.7c.5.4 1 .8 1.6 1.2c.1.5.5 1 .9 1.4c0 .6.2 1.1.5 1.7c-.7.2-1.3.6-1.9 1c-.6 0-1.1 0-1.8.1c-.6-.2-1.1-.4-1.7-.4c-.5-.5-1-.8-1.6-1.1q-.3-.9-.9-1.5c0-.8-.2-1.5-.4-2.2m-1.1 13.5c-.1-.1-.1-.2.1-.3c-.1-.3 0-.5.2-.7s.3-.2.5-.1c.1-.1.3-.1.4 0c5.4-.5 10.7-.6 16.1.1c.2 0 .3 0 .4-.2c.3-.1.5 0 .6.2c.2.2.3.5.1.8c.3.1.5.3.5.6c.1.3.1.6-.1.8c0 .4-.1.8-.4 1.1c.1.1.2.1 0 .1c-.1.3-.3.4-.6.4c-.1.1-.2.2-.4 0c-5.3.6-10.6.8-15.9.2c-.3 0-.6-.1-.7-.4c-.2-.1-.3-.1-.4.1c-.3-.2-.5-.4-.6-.7s0-.5.2-.8q-.15-.6 0-1.2\"/><path d=\"M16.7 30.6q.3 3.45 1.2 6.9c-.1.4 0 .8.2 1.1c.1.2.3.3.6.2c.1.4.4.5.7.6c.3.2.5.2.8 0c2.4.1 4.9.1 7.4-.1c.3.2.5.2.8.1c.4 0 .6-.1.8-.4c.3-.1.6-.4.7-.7q.3-.45 0-.9c.7-2.1 1.1-4.2 1.3-6.5\"/></g>",
      "sun": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M24 17c4-.1 6.7 2.5 6.7 6.5c0 3.9-2.6 6.5-6.6 6.5c-3.9 0-6.6-2.5-6.6-6.4s2.6-6.5 6.5-6.6m0-8.5v5.1m0 19.9v5.1M8.9 23.5H14m20 0h5.1M13.2 12.8c1.3 1.2 2.5 2.4 3.7 3.7m14.2 14.1c1.2 1.2 2.4 2.4 3.6 3.7m.1-21.4c-1.3 1.2-2.5 2.4-3.7 3.7M16.9 30.7c-1.2 1.2-2.5 2.4-3.7 3.7\"/>",
      "rain": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M13 26.5c-3.1-.1-5.2-2.2-5-5c.2-2.5 2-4.2 4.6-4.3c.6-3.2 3.2-5.3 6.4-5c1.5-2.3 4.1-3.5 6.8-3c3.3.6 5.4 3.2 5.4 6.5c2.6.2 4.5 2 4.7 4.6c.2 3.1-2 5.6-5.2 5.8c-5.9.5-11.8.5-17.7.4m1 4.5h.01M19 32h.01m4.99-.5h.01M29 32h.01M16.5 36.5h.01m4.99.5h.01m4.99-.5h.01\"/>",
      "clouds": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M12 17.5c-2-.1-3.2-1.4-3-3c.2-1.4 1.3-2.3 2.8-2.3c.5-1.6 2-2.6 3.7-2.4c1.8.2 3 1.5 3.2 3.2c1.2.3 2 1.3 1.9 2.6s-1.2 2.1-2.6 2.1c-2 0-4-.1-6-.2M15.5 36c-3.1-.1-5.2-2.2-5.1-5c.1-2.6 2-4.4 4.6-4.5c.6-3.2 3.2-5.3 6.5-5c1.5-2.3 4.1-3.5 6.8-3c3.3.6 5.4 3.2 5.4 6.5c2.6.2 4.5 2 4.7 4.6c.2 3.1-2 5.6-5.2 5.8c-5.9.5-11.8.6-17.7.6\"/>",
      "warning": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M24 9.5c5.8 9.1 11.3 18.4 16.4 27.9c-5.4.9-10.9 1.3-16.4 1.3s-11-.4-16.4-1.3C12.7 27.9 18.2 18.6 24 9.5\"/><path d=\"M24 20.5q.15 4.2 0 8.1m0 4.4h.01\"/></g>",
      "alert": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M24 8.5c8.8 0 15.5 6.7 15.5 15.5S32.8 39.5 24 39.5S8.5 32.8 8.5 24S15.2 8.5 24 8.5\"/><path d=\"M24 15.5c.1 3.3.1 6.5 0 9.7m0 6.3h.01\"/></g>",
      "info": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M24 8.5c8.8 0 15.5 6.7 15.5 15.5S32.8 39.5 24 39.5S8.5 32.8 8.5 24S15.2 8.5 24 8.5m0 8h.01\"/><path d=\"M24 22.5c.1 3.5.1 6.9 0 10.3\"/></g>",
      "umbrella": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M24 6.5v3.3m0 0c-9.5.4-16 6-16.8 12.8c2-2 5-1.9 6.7.2c1.9-2.5 5.3-2.5 7.1-.2c1.8-2.1 4.3-2.1 6 0c1.9-2.3 5.3-2.3 7.1.2c1.8-2.1 4.7-2.2 6.7-.2C40 15.8 33.5 10.2 24 9.8m.2 14.7c.2 3.9.2 7.3-.1 10.7c-.2 3-1.9 4.6-3.9 3.9c-1.7-.6-2.3-2.3-1.7-4\"/>",
      "gauge": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M8.5 33C8.2 22.8 15 14.8 24 14.8s15.8 8 15.5 18.2c-.1 1.3-1 2.2-2.3 2.2c-8.7.4-17.7.4-26.4 0c-1.3 0-2.2-.9-2.3-2.2m5-6.2h.01m4.09-5h.01m6.39-2h.01m6.39 2h.01m4.09 5h.01\"/><path d=\"M24.2 29.8c1.5-1.4 2.9-2.9 4.3-4.5\"/></g>",
      "flower": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\"><path d=\"M33 24.1c1.1.2 2.2.5 3.2 1c.6.4 1 1 1.4 1.6c.5.6.9 1.3 1.1 2c.4.7.6 1.4.7 2.1c.1.8.1 1.6-.1 2.3c0 .7-.2 1.3-.5 1.9c-.2.6-.5 1.1-1 1.6c-.3.5-.8 1-1.3 1.3c-.5.6-1 .9-1.6 1.2c-.6.4-1.2.5-1.8.5c-.7.1-1.3 0-2-.2c-.8-.1-1.5-.4-2.2-.8c-.7-.3-1.4-.6-2-1.1c-.7-.5-1.2-1.1-1.7-1.7q-.75-1.35-1.2-2.7c-.3 1-.8 1.9-1.5 2.8c-.3.7-.8 1.2-1.4 1.7c-.5.4-1.1.8-1.7 1.1c-.8.4-1.6.7-2.4.8c-.7.1-1.4.1-2-.1c-.7 0-1.4-.1-2-.4c-.6-.2-1.1-.5-1.6-1c-.5-.4-1-.9-1.3-1.5c-.5-.4-.8-.8-1-1.4c-.3-.7-.4-1.5-.4-2.3c-.1-.6-.1-1.1.1-1.7c-.1-.8 0-1.5.3-2.2c.3-.8.8-1.5 1.4-2.1q.6-1.05 1.5-1.8c.8-.5 1.7-.8 2.7-1c-.9-.3-1.7-.8-2.5-1.4c-.6-.4-1.2-.9-1.6-1.5c-.6-.5-1-1.1-1.3-1.8c-.4-.6-.7-1.2-.9-1.9c-.2-.9-.2-1.7-.1-2.6c0-.7.2-1.3.6-2c.3-.5.7-1 1.2-1.4c.4-.5.8-1 1.4-1.3c.5-.5 1-.8 1.7-1c.6-.4 1.3-.5 2.1-.6c.7-.1 1.3 0 2 .2q1.05 0 2.1.3c.6.3 1.1.8 1.6 1.3c.7.5 1.4 1.1 1.9 1.8c.5.9.9 1.9 1.1 2.9c.2-1 .6-1.9 1.2-2.8c.4-.7.9-1.2 1.6-1.7c.6-.6 1.3-1.1 2.1-1.4c.6-.4 1.2-.6 1.9-.7c.8-.2 1.5-.2 2.3-.1c.7.2 1.3.4 1.9.9c.6.1 1.1.4 1.6.8c.5.3 1 .6 1.3 1.1c.5.7.8 1.4 1.1 2.2c.3.6.4 1.3.5 2c.2.5.2 1.1.1 1.7c-.1.7-.2 1.4-.6 2c-.4.8-.9 1.4-1.5 2c-.4.6-.8 1.2-1.4 1.7c-.9.6-2 1.1-3.1 1.4\"/><path d=\"M24.8 21.1c1.6.4 2.6 2.2 2.1 3.8c-.3 1.8-2.4 2.6-3.8 2.1c-1.7-.3-2.4-2.2-2-3.9c.5-1.4 2.1-2.7 3.8-2Z\"/></g>",
      "chat": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M9 12c10-1.1 21-1 29.5 0c1.1 5.5.9 12 .1 17c-7.6 1-16.1.9-23.1.4c-2 2.6-4 4.8-6.3 6.8c.2-3.2.1-5.5-.2-7.2c-.8-5.5-.7-11.8 0-17m7.5 8.5h.01m7.09.1h.01m6.99-.1h.01\"/>",
      "bolt": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M27 6c-4.5 6.5-8.5 13-12 20q3.75.45 7.5.3C21 31.5 19.8 36.6 19 42c5-6.4 9.6-13 13.8-20c-2.6-.2-5.1-.3-7.6-.1Q26.4 13.8 27 6\"/>",
      "heart": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"3\" d=\"M19.4 38.8c-4.8-3.7-9.2-7.3-10.6-11.9c-1-3.4.7-6.5 3.7-7.1c2.8-.4 5.3 1.2 6.9 3.7c1.5-2.6 4.1-4.2 6.8-3.7c3.1.7 4.8 3.7 3.7 7.1c-1.4 4.7-5.8 8.3-10.5 11.9M34.3 9.2c.5 1.4.7 2.8.9 4.3c1.5.1 2.9.5 4.3 1c-1.4.4-2.8.8-4.4.9c-.1 1.5-.3 2.9-.9 4.3q-.6-2.1-.9-4.2c-1.5-.2-3-.6-4.3-1.1q1.95-.75 4.2-.9c.3-1.5.6-2.9 1.1-4.3\"/>",
      cup: ["0 0 26 26", "<g fill=\"currentColor\"><path fill-rule=\"evenodd\" d=\"M15 4.5H3a.5.5 0 0 0-.5.5c0 4.668 2.874 8.5 6.5 8.5s6.5-3.832 6.5-8.5a.5.5 0 0 0-.5-.5m-.512 1c-.19 3.932-2.608 7-5.488 7s-5.298-3.068-5.488-7z\" clip-rule=\"evenodd\"/><path d=\"m13.862 10.329l.276-.961c.303.086.63.132.97.132C16.46 9.5 17.5 8.78 17.5 8s-1.04-1.5-2.393-1.5v-1C16.95 5.5 18.5 6.572 18.5 8s-1.55 2.5-3.393 2.5c-.431 0-.852-.058-1.245-.171M3.5 14.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1 0-1.5\"/></g>"],
  };

  function icon(name, cls) {
    const entry = ICONS[name] || "";
    const [viewBox, body] = Array.isArray(entry) ? entry : ["0 0 48 48", entry];
    return `<svg class="icon ${cls || ""}" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
  }

  // Full illustration from assets/doodles (Open Doodles, recoloured).
  function doodle(name, cls) {
    return `<img class="doodle ${cls || ""}" src="${ASSETS}doodles/${name}.svg" alt="" aria-hidden="true">`;
  }

  // Single-colour squiggle from assets/doodles/marks (dddoodle), tinted by CSS.
  function mark(name, cls, style) {
    return `<span class="mark ${cls || ""}" style="--m:url('${ASSETS}doodles/marks/${name}.svg');${style || ""}" aria-hidden="true"></span>`;
  }

  const NAV = {
    customer: [
      ["home.html", "Home"],
      ["order.html", "Request & Log"],
      ["dashboard.html", "Impact"],
      ["past-orders.html", "Past Orders"],
    ],
    admin: [
      ["home.html", "Overview"],
      ["upload.html", "Collections"],
      ["operations.html", "Operations"],
      ["forecast.html", "Forecast"],
      ["allocation.html", "Allocation"],
    ],
  };

  function topbar({ role, activePage }) {
    const linksHtml = NAV[role]
      .map(([href, label]) => `<a href="${href}" class="${activePage === href ? "active" : ""}">${label}</a>`)
      .join("");
    const session = CB.getState().auth[role];

    return `
    <header class="topbar">
      <div class="topbar-inner">
        <nav class="nav-links">${linksHtml}</nav>
        <a class="brand" href="home.html">${icon("cup")}CoffeeBot <em>Exchange</em></a>
        <div class="nav-right">
          ${role === "admin" ? '<div class="alert-bell" data-alert-bell></div>' : ""}
          <span class="nav-user">${session ? icon("user", "icon-sm") + esc(session.email.split("@")[0]) : ""}</span>
          <button class="btn-secondary btn-sm" onclick="CBUI.logout('${role}')">Log out</button>
        </div>
      </div>
    </header>`;
  }

  // Shared page footer. role is "admin", "customer" or "public" (index.html).
  function footer({ role }) {
    const links = role === "public"
      ? [["customer/login.html", "Partner log in"], ["admin/login.html", "Staff log in"], ["#how", "How it works"]]
      : NAV[role].slice(0, 4);
    return `
    <footer class="site-footer">
      <div class="footer-inner">
        ${doodle("strolling")}
        <div class="footer-copy">
          <div class="footer-brand">CoffeeBot <em>Exchange</em></div>
          <p>Used grounds from CoffeeBot's machines, dried and passed on to gardens, schools and researchers around Singapore.</p>
        </div>
        <nav class="footer-links">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}</nav>
      </div>
      <div class="footer-credits">
        IS463 prototype · Illustrations: <a href="https://www.opendoodles.com" target="_blank" rel="noopener">Open Doodles</a> (CC0) ·
        Doodles: <a href="https://fffuel.co/dddoodle" target="_blank" rel="noopener">dddoodle</a> by fffuel (CC BY 4.0) ·
        Icons: <a href="https://icon-sets.iconify.design/doodle-icons/" target="_blank" rel="noopener">Oreo Doodle Icons</a> (MIT),
        <a href="https://pepicons.com" target="_blank" rel="noopener">Pepicons</a> (CC BY 4.0)
      </div>
    </footer>`;
  }

  function mount(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  function requireAuth(role) {
    const state = CB.getState();
    const session = state.auth[role];
    if (!session) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  function login(role, email) {
    CB.setState((s) => {
      s.auth[role] = { email, loginAt: Date.now() };
    });
  }

  function logout(role) {
    CB.setState((s) => {
      s.auth[role] = null;
    });
    window.location.href = "login.html";
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // collectableOnly: just the regions staff can log collections for.
  function regionOptions(selectedId, { collectableOnly = false } = {}) {
    return (collectableOnly ? CB.COLLECTABLE : CB.REGIONS).map(
      (r) =>
        `<option value="${r.id}" ${r.id === selectedId ? "selected" : ""}>${r.name} — ${r.location}</option>`
    ).join("");
  }

  /* ---------- lightweight bar chart (SVG, gridlines + axis labels) ---------- */
  function barChart({ container, labels, series, height = 220, formatY = (v) => v }) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    const w = el.clientWidth || 640;
    const h = height;
    const padL = 42, padB = 28, padT = 10, padR = 14;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Round tick step (1, 2, 2.5 or 5 × 10^n) giving about four gridlines.
    const rawMax = Math.max(...series.flatMap((s) => s.values), 0) || 1;
    const rough = rawMax / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
    const gridCount = Math.ceil(rawMax / step);
    const maxVal = step * gridCount;

    const n = labels.length;
    const groupW = plotW / n;
    const barGap = series.length > 1 ? 4 : 0;
    const barW = Math.max(4, (groupW - 14) / series.length - barGap);

    let gridLines = "";
    let yLabels = "";
    for (let i = 0; i <= gridCount; i++) {
      const v = parseFloat((step * i).toFixed(2));
      const y = padT + plotH - (v / maxVal) * plotH;
      gridLines += `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" stroke="var(--gridline)" stroke-width="1.5" stroke-dasharray="4 5"/>`;
      yLabels += `<text class="chart-label" x="${padL - 8}" y="${y + 4}" text-anchor="end">${formatY(v)}</text>`;
    }

    let bars = "";
    let xLabels = "";
    labels.forEach((label, i) => {
      const groupX = padL + i * groupW + 7;
      series.forEach((s, si) => {
        const val = s.values[i] || 0;
        const barH = (val / maxVal) * plotH;
        const x = groupX + si * (barW + barGap);
        const y = padT + plotH - barH;
        if (barH > 0) bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="${Math.min(5, barW / 2)}" fill="${s.color}" stroke="var(--ink)" stroke-width="1.5"></rect>`;
      });
      xLabels += `<text class="chart-label" x="${groupX + (groupW - 14) / 2}" y="${h - 8}" text-anchor="middle">${label}</text>`;
    });

    el.innerHTML = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${gridLines}${yLabels}${bars}${xLabels}
      <line x1="${padL}" x2="${w - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--edge)" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  /* ---------- AI generator panel (Gemini via Apps Script) ---------- */
  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // EcoLogits gives a min–max range; show the midpoint with sensible precision.
  function mid(range) {
    return (range.min + range.max) / 2;
  }
  function fmtImpact(v, unit) {
    return (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)) + " " + unit;
  }
  function footprintHtml(fp, fallback) {
    if (fallback) return `<span class="eco-line">${icon("leaf", "icon-sm")} No AI used for this run — no extra energy or water.</span>`;
    if (!fp) return `<span>Footprint estimate unavailable for this run.</span>`;
    return `<span class="eco-line">${icon("leaf", "icon-sm")}
      This run: ~${fmtImpact(mid(fp.energyWh), "Wh")} · ${fmtImpact(mid(fp.gwpG), "g CO₂e")} · ${fmtImpact(mid(fp.waterMl), "mL water")}</span>
      <span>Estimated by <a href="https://ecologits.ai" target="_blank" rel="noopener">EcoLogits</a></span>`;
  }

  function aiResultHtml(payload) {
    const r = payload.result || {};
    const when = payload.generatedAt ? CB.fmtDate(new Date(payload.generatedAt).getTime()) : "";
    const stats = (r.stats || []).map((s) => `
      <div class="ai-stat ${esc(s.tone)}">
        <div class="ai-stat-lbl">${esc(s.label)}</div>
        <div class="ai-stat-num">${esc(s.value)}</div>
        <div class="ai-stat-note">${esc(s.note)}</div>
      </div>`).join("");
    const list = (items) => (items || []).map((t) => `<li>${esc(t)}</li>`).join("");
    return `
      ${payload.fallback ? fallbackNoticeHtml(payload.reason) : ""}
      <p class="ai-headline">${esc(r.headline)}</p>
      <div class="ai-stats">${stats}</div>
      <div class="ai-columns">
        <div><h4>What stands out</h4><ul class="ai-list">${list(r.insights)}</ul></div>
        <div><h4>Next actions</h4><ul class="ai-list actions">${list(r.actions)}</ul></div>
      </div>
      <div class="ai-foot">
        ${footprintHtml(payload.footprint, payload.fallback)}
        <span>Generated ${esc(when)} · ${esc(payload.model || "Gemini")}</span>
      </div>`;
  }

  // The full reason stays on the payload (and in the console) for debugging.
  function fallbackNoticeHtml(reason) {
    if (reason) console.warn("Gemini unavailable:", reason);
    return `
      <div class="ai-fallback">
        <strong>Gemini is down right now.</strong>
        <p>Showing the rule-based version instead. Click Regenerate to try again.</p>
      </div>`;
  }

  // Mounts an AI insights card with a Generate button for one task
  // (briefing | forecast | allocation). Shows the last result on load.
  function aiGenerator({ container, task, title, buttonLabel = "Generate", onGenerated }) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    el.innerHTML = `
      <section class="ai-card">
        <div class="ai-card-head">
          <div>
            <div class="kicker">AI insights · Gemini</div>
            <h2>${mark("sparkle")}${esc(title)}</h2>
          </div>
          <button class="btn-primary" type="button">${esc(buttonLabel)}</button>
        </div>
        <div class="ai-body"></div>
      </section>`;
    const body = el.querySelector(".ai-body");
    const btn = el.querySelector("button");
    const last = CBAI.lastResult(task);
    body.innerHTML = last
      ? aiResultHtml(last)
      : `<div class="ai-empty">${doodle("meditating")}
          <p><strong>Nothing generated yet.</strong>Press ${esc(buttonLabel)} and Gemini will read this week's numbers.</p></div>`;
    if (last) btn.textContent = "Regenerate";

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Generating…";
      body.innerHTML = `<div class="ai-loading"></div><div class="ai-loading-note">Reading this week's data…</div>`;
      try {
        body.innerHTML = aiResultHtml(await CBAI.generate(task));
        if (onGenerated) onGenerated();
      } catch (err) {
        body.innerHTML = aiResultHtml(CBAI.ruleBased(task, err.message));
      } finally {
        btn.disabled = false;
        btn.textContent = "Regenerate";
      }
    });
  }

  // Running total of every AI generation's EcoLogits footprint in this browser.
  function greenLedger(container) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    const t = CBAI.footprintTotals();
    const savedKg = CB.getState().partners.reduce((a, p) => a + p.co2eKg, 0);
    const ratio = t.gwpG > 0 ? Math.round((savedKg * 1000) / t.gwpG) : 0;
    el.innerHTML = `
      <div class="card">
        <h2>Green AI ledger</h2>
        <div class="ledger">
          <div><div class="num">${t.count}</div><div class="lbl">AI generations</div></div>
          <div><div class="num">${fmtImpact(t.energyWh, "Wh")}</div><div class="lbl">Electricity</div></div>
          <div><div class="num">${fmtImpact(t.gwpG, "g")}</div><div class="lbl">CO₂e emitted</div></div>
          <div><div class="num">${fmtImpact(t.waterMl, "mL")}</div><div class="lbl">Water consumed</div></div>
        </div>
        <p class="subtext" style="font-size:.82rem;">${t.count
          ? `CO₂e saved by diverted grounds is ~${ratio.toLocaleString("en-SG")}× what our AI emitted. `
          : ""}Estimates by <a class="link" href="https://ecologits.ai" target="_blank" rel="noopener">EcoLogits</a>.</p>
      </div>`;
  }

  return { icon, doodle, mark, topbar, footer, mount, requireAuth, login, logout, toast, regionOptions, barChart, aiGenerator, greenLedger, esc };
})();
