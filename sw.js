// The service worker: on the first visit it stores every file of the game on the phone, and from
// then on it answers from that copy, so the game starts with no internet at all.
// VERSION must change whenever any file changes; the next online visit then fetches the new copy.
// Amplify does that on every release (amplify.yml stamps in the commit); "dev" is for local runs.
// Every file the game needs must be in FILES, new pictures in img/ too, or it won't work offline.
const VERSION = "skiing-dev";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "vendor/phaser.min.js",
  "js/audio.js",
  "js/config.js",
  "js/course.js",
  "js/gestures.js",
  "js/install.js",
  "js/main.js",
  "js/rules.js",
  "js/sayings.js",
  "js/share.js",
  "js/storage.js",
  "js/textures.js",
  "js/ui.js",
  "js/update.js",
  "js/version.js",
  "js/scenes/BoardScene.js",
  "js/scenes/BootScene.js",
  "js/scenes/DayScene.js",
  "js/scenes/NameScene.js",
  "js/scenes/PauseScene.js",
  "js/scenes/PlayScene.js",
  "js/scenes/ResultsScene.js",
  "js/scenes/TitleScene.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "sayings/sayings.json",
  // the voices (node tools/make-voices.mjs) and the cartoon art (img/): add each new file here
  "sayings/voices/boy-call-1.mp3",
  "sayings/voices/boy-call-2.mp3",
  "sayings/voices/boy-call-3.mp3",
  "sayings/voices/boy-call-4.mp3",
  "sayings/voices/boy-thanks-1.mp3",
  "sayings/voices/boy-thanks-2.mp3",
  "sayings/voices/boy-thanks-3.mp3",
  "img/santa.png", "img/santa-turn.png", "img/santa-jump.png", "img/santa-crash.png",
  "img/tree.png", "img/rock.png", "img/snowman.png", "img/reindeer.png", "img/ice.png", "img/cocoa.png", "img/gift.png",
  "img/kid-1.png", "img/kid-2.png", "img/kid-3.png", "img/kid-4.png", "img/kid-5.png", "img/kid-6.png", "img/kid-7.png",
  "img/house-red.png", "img/house-blue.png", "img/house-green.png", "img/house-brown.png",
  "sayings/voices/cocoa-1.mp3",
  "sayings/voices/cocoa-2.mp3",
  "sayings/voices/crash-1.mp3",
  "sayings/voices/crash-2.mp3",
  "sayings/voices/crash-3.mp3",
  "sayings/voices/crash-4.mp3",
  "sayings/voices/crash-5.mp3",
  "sayings/voices/gift-1.mp3",
  "sayings/voices/gift-2.mp3",
  "sayings/voices/gift-3.mp3",
  "sayings/voices/gift-4.mp3",
  "sayings/voices/gift-5.mp3",
  "sayings/voices/kid-call-1.mp3",
  "sayings/voices/kid-call-2.mp3",
  "sayings/voices/kid-call-3.mp3",
  "sayings/voices/kid-call-4.mp3",
  "sayings/voices/kid-thanks-1.mp3",
  "sayings/voices/kid-thanks-2.mp3",
  "sayings/voices/kid-thanks-3.mp3",
  "sayings/voices/leap-1.mp3",
  "sayings/voices/leap-2.mp3",
  "sayings/voices/madeit-1.mp3",
  "sayings/voices/madeit-2.mp3",
  "sayings/voices/skid-1.mp3",
  "sayings/voices/skid-2.mp3",
  "sayings/voices/splash-1.mp3",
  "sayings/voices/splash-2.mp3",
  "sayings/voices/start-1.mp3",
  "sayings/voices/start-2.mp3",
  "sayings/voices/start-3.mp3",
  "sayings/voices/start-4.mp3",
  "sayings/voices/wipeout-1.mp3",
  "sayings/voices/wipeout-2.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(FILES);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache first: the stored copy answers at once, online or not.
self.addEventListener("fetch", (event) => {
  // Only the game's own files; anything elsewhere is left to the browser.
  // version.json, which says whether a newer release is out, is never answered from the stored copy.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.endsWith("/version.json")) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)),
  );
});
