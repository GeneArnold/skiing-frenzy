// Everything the game remembers, in localStorage on this phone only.
// The browser may clear it (clearing site data, or uninstalling the app); that only costs scores.
const KEY = "skiing.v1";
const BOARD_SIZE = 10;
const SCORING = 2; // raise this to clear every phone's scores when the scoring changes
export const BOARD = "slope"; // one high-score board: every game starts on run 1

const DEFAULTS = {
  player: null,    // { initials }: who plays on this phone
  sound: true,
  board: [],       // this phone's top 10, [{ initials, score, run, at }], best first; run = the run Santa reached
  totals: { gifts: 0, games: 0 },
  challenge: null, // { initials, score } from a dare link, until it is played
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    cache = { ...DEFAULTS };
  }
  delete cache.outbox; // left over from when scores went online
  // Scores from before points came from skill (2026-10-30) included distance and aren't comparable,
  // so they go, once. Initials and sound stay.
  if (cache.scoring !== SCORING) {
    cache.board = [];
    cache.challenge = null;
    cache.scoring = SCORING;
    persist();
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked (private window): keep playing, just without saving.
  }
}

export function get(name) {
  return load()[name];
}

export function set(name, value) {
  load()[name] = value;
  persist();
}

export function setInitials(initials) {
  const data = load();
  data.player = { initials };
  persist();
}

export function board() {
  return load().board;
}

export function topScore() {
  return Math.max(0, ...load().board.map((r) => r.score));
}

// Saves a finished game. run: the run Santa was on when it ended (1 = the first).
// → { rank (1-10, or 0 if it missed the board), previousTop }
export function recordRun(score, run, gifts) {
  const data = load();
  const previousTop = topScore();
  const entry = { initials: data.player.initials, score, run, at: Date.now() };
  if (score > 0) {
    data.board = [...data.board, entry].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, BOARD_SIZE);
  }
  const t = { ...DEFAULTS.totals, ...data.totals };
  t.gifts += gifts;
  t.games++;
  data.totals = t;
  persist();
  return { rank: score > 0 ? data.board.indexOf(entry) + 1 : 0, previousTop };
}
