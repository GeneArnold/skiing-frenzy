// Trash talk: share a run by text, with a picture of the results and a dare link.
// A dare link opens the game with "GEN DARES YOU: BEAT 4,250" on the title screen.
import * as store from "./storage.js";
import { CONFIG } from "./config.js";

const TRASH = [
  "Santa skied {score} points down the mountain. Ho ho ho!",
  "{score} points and not one tree hugged. Your turn.",
  "I delivered {score} points of Christmas cheer on skis. Beat that.",
  "{score}! Santa's sleigh is jealous.",
];

// ?beat=GEN-4250  (initials, score)
// Testing on a computer or the home network (plain http) keeps links pointing at that copy.
export function challengeLink(initials, score) {
  const home = location.protocol === "https:" && CONFIG.homeUrl ? CONFIG.homeUrl : location.origin + location.pathname;
  return `${home}?beat=${initials}-${score}`;
}

// Reads a dare from the address, keeps it until it is played, and tidies the address.
export function readChallenge() {
  const params = new URLSearchParams(location.search);
  const beat = params.get("beat");
  if (!beat) return;
  const m = /^([A-Z]{1,3})-(\d{1,7})$/.exec(beat);
  if (m) store.set("challenge", { initials: m[1], score: Number(m[2]) });
  params.delete("beat");
  const rest = params.toString();
  history.replaceState(history.state, "", location.pathname + (rest ? `?${rest}` : ""));
}

// run: { score, gifts, picture (a PNG Blob or null) }
// → "shared", "texted" (fell back to a text message), or "cancelled"
export async function shareRun(run) {
  const me = store.get("player");
  const brag = TRASH[Math.floor(Math.random() * TRASH.length)].replaceAll("{score}", run.score.toLocaleString());
  const url = challengeLink(me.initials, run.score);
  const words = `${brag} (${me.initials} gave out ${run.gifts} presents.)\nBeat that 👉`;

  if (navigator.share) {
    const file = run.picture && new File([run.picture], "skiing-frenzy.png", { type: "image/png" });
    const withPicture = { text: `${words} ${url}`, files: [file] };
    try {
      if (file && navigator.canShare?.(withPicture)) await navigator.share(withPicture);
      else await navigator.share({ text: words, url });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  // No share sheet (plain http, or an old browser): open a text message instead.
  location.href = `sms:?&body=${encodeURIComponent(`${words} ${url}`)}`;
  return "texted";
}

// A PNG of what is on screen right now, for the share picture.
export function snapshot(game) {
  return new Promise((resolve) => {
    game.renderer.snapshot((img) => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        c.toBlob((blob) => resolve(blob), "image/png");
      } catch {
        resolve(null);
      }
    });
  });
}
