// Lays out the slope, one row at a time, ahead of Santa. Pure logic (no Phaser), so
// node tools/test-course.mjs can check it: every row must leave a gap Santa fits through.
import { CREEK_H, KINDS, COCOA_CHANCE } from "./rules.js";

export const LEFT = 40;   // the edges of the open slope; the forest is beyond
export const RIGHT = 500;
export const MIN_GAP = 110; // the narrowest way through a row, edge to edge
export const KID_LOOKS = 7; // img/kid-1.png … kid-7.png
export const BOYS = [2, 3, 4, 5, 7]; // which of those talk in the boy's voice

// A row of things across the slope at height y. → [{ kind, x, y, w?, dir? }]
// Things take up "room" across the slope (their r on each side, or a creek's width); the row is
// built so at least one stretch of MIN_GAP stays clear of everything Santa can't jump.
export function makeRow(rules, y, rand = Math.random) {
  const out = [];
  const taken = []; // [from, to] across the slope, for things that must be steered round
  const count = 1 + Math.floor(rand() * rules.busy + 0.3);
  for (let i = 0; i < count; i++) {
    const kind = pick(rules.things, rand);
    if (kind === "creek") {
      if (out.some((o) => o.kind === "creek")) continue;
      const w = 160 + Math.floor(rand() * 140);
      const x = LEFT + w / 2 + rand() * (RIGHT - LEFT - w);
      out.push({ kind, x, y, w });
      continue; // a creek can be jumped, so it never closes the way through
    }
    const r = KINDS[kind].r;
    const room = kind === "reindeer" ? 0 : r + 10;
    // try a few spots; keep the first that leaves a way through
    for (let tries = 0; tries < 8; tries++) {
      const x = LEFT + r + rand() * (RIGHT - LEFT - 2 * r);
      const span = [x - room, x + room];
      if (taken.some(([a, b]) => span[0] < b + 30 && span[1] > a - 30)) continue;
      if (!leavesGap([...taken, span])) continue;
      if (room) taken.push(span);
      const thing = { kind, x, y: y + (rand() - 0.5) * 60 };
      if (kind === "reindeer") thing.dir = rand() < 0.5 ? -1 : 1;
      out.push(thing);
      break;
    }
  }
  if (rand() < COCOA_CHANCE) {
    const x = clearSpot(taken, rand);
    if (x !== null) out.push({ kind: "cocoa", x, y: y + 20 });
  }
  return out;
}

// A kid playing beside the way down, halfway between two rows. Kids stand clear of the edges.
export function makeKid(y, rand = Math.random) {
  return { kind: "kid", look: Math.floor(rand() * KID_LOOKS), x: LEFT + 30 + rand() * (RIGHT - LEFT - 60), y };
}

// The widest clear stretch across the slope, given the spans taken.
export function widestGap(taken) {
  const spans = [...taken].sort((a, b) => a[0] - b[0]);
  let edge = LEFT;
  let best = 0;
  for (const [a, b] of spans) {
    best = Math.max(best, a - edge);
    edge = Math.max(edge, b);
  }
  return Math.max(best, RIGHT - edge);
}

function leavesGap(taken) {
  return widestGap(taken) >= MIN_GAP;
}

function clearSpot(taken, rand) {
  for (let tries = 0; tries < 8; tries++) {
    const x = LEFT + 30 + rand() * (RIGHT - LEFT - 60);
    if (!taken.some(([a, b]) => x > a - 30 && x < b + 30)) return x;
  }
  return null;
}

// Picks a key from { kind: weight }.
function pick(weights, rand) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (const [k, w] of Object.entries(weights)) {
    roll -= w;
    if (roll < 0) return k;
  }
  return Object.keys(weights)[0];
}

export { CREEK_H };
