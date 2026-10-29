// How each run down the mountain plays: how fast, how far, what's in the way. Tune the game here.
// Distances are in pixels of slope (the screen is 540 wide). A run of 9,000 at 240 to 300 a second
// takes about 35 seconds. node tools/test-course.mjs checks every row of the course leaves a way through.
//
// Santa skis down; the mountain scrolls up past him. Trees (and snowmen and reindeer) must be steered
// round. A jump clears anything except trees: rocks, ice and creeks. Landing on ice slides Santa
// about; landing in a creek is a splash. Hitting anything costs a life. Ski close to a kid and they
// get a gift.

// What each thing does when Santa meets it on the ground.
//   crash: lose a life.  slide: Santa skids, no steering for a moment.  r: how close counts, in px
export const KINDS = {
  tree: { hit: "crash", r: 24, tall: true },
  rock: { hit: "crash", r: 20 },
  snowman: { hit: "crash", r: 22 },
  reindeer: { hit: "crash", r: 30 },
  ice: { hit: "slide", r: 40 },
  creek: { hit: "crash" }, // a band of water, w wide and CREEK_H tall
};

export const RUNS = [
  {
    name: "RUN 1", place: "Bunny Hill", note: "A gentle one to warm up",
    speed: 230, speedUp: 50, length: 8000, gap: [230, 300], busy: 1.2,
    things: { tree: 6, rock: 2, ice: 1 }, kids: 0.6,
  },
  {
    name: "RUN 2", place: "Pine Forest", note: "Lots of trees. Watch out!",
    speed: 250, speedUp: 60, length: 9000, gap: [210, 280], busy: 1.5,
    things: { tree: 7, rock: 3, ice: 2, snowman: 1 }, kids: 0.6,
  },
  {
    name: "RUN 3", place: "Frozen Creek", note: "Hold JUMP for a big one!",
    speed: 270, speedUp: 60, length: 9500, gap: [200, 270], busy: 1.7,
    things: { tree: 6, rock: 3, ice: 2, snowman: 1, creek: 2 }, kids: 0.6,
  },
  {
    name: "RUN 4", place: "Reindeer Crossing", note: "Reindeer don't look both ways",
    speed: 290, speedUp: 70, length: 10000, gap: [190, 260], busy: 1.8,
    things: { tree: 6, rock: 3, ice: 2, snowman: 1, creek: 1, reindeer: 2 }, kids: 0.6,
  },
  {
    name: "RUN 5", place: "The Big Mountain", note: "The village is waiting!",
    speed: 310, speedUp: 70, length: 11000, gap: [180, 250], busy: 2,
    things: { tree: 7, rock: 3, ice: 2, snowman: 2, creek: 2, reindeer: 2 }, kids: 0.6,
  },
];

// Past the last run it keeps going, a little faster and busier each time.
export function runRules(n) {
  if (n < RUNS.length) return RUNS[n];
  const last = RUNS.at(-1);
  const extra = n - RUNS.length + 1;
  return {
    ...last,
    name: `RUN ${n + 1}`, place: "Even Bigger Mountain", note: "How far can Santa go?",
    speed: last.speed + 12 * extra,
    gap: [Math.max(150, last.gap[0] - 6 * extra), Math.max(210, last.gap[1] - 6 * extra)],
    busy: Math.min(2.6, last.busy + 0.1 * extra),
  };
}

export const POINTS = {
  gift: 100,   // each kid who gets a present
  metre: 1,    // every METRE of slope
  run: 500,    // making it to the village
};
export const METRE = 20; // px of slope per point

export const LIVES = 3;
export const MAX_LIVES = 5;
export const COCOA_CHANCE = 0.05; // a row brings a mug of hot cocoa: one life back

// Steering: an arrow tap moves Santa at least NUDGE px; holding glides at STEER px a second.
export const STEER = 300;
export const NUDGE = 34;
// Jumping: a quick tap is a hop; holding JUMP crouches, and letting go jumps higher the longer it was
// held, up to BIG_HOLD ms.
export const HOP_S = 0.55;
export const BIG_S = 1.2;
export const BIG_HOLD = 700;
export const SLIDE_S = 0.9;      // how long ice takes away the steering
export const CREEK_H = 150;      // how tall a creek is, top to bottom
export const REACH = 80;         // how close (across) counts as skiing past a kid
export const SAFE_S = 1.6;       // after a crash, Santa can't crash again for this long
