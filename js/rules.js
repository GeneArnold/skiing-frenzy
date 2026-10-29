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
  {
    name: "RUN 6", place: "Snowman Meadow", note: "Who built all these snowmen?",
    speed: 322, speedUp: 70, length: 11000, gap: [180, 250], busy: 2,
    things: { tree: 4, rock: 2, ice: 1, snowman: 6, creek: 1, reindeer: 1 }, kids: 0.65,
  },
  {
    name: "RUN 7", place: "Icicle Slide", note: "Slippery! Hop over the ice",
    speed: 334, speedUp: 70, length: 11500, gap: [175, 245], busy: 2.05,
    things: { tree: 5, rock: 2, ice: 6, snowman: 1, creek: 1, reindeer: 1 }, kids: 0.6,
  },
  {
    name: "RUN 8", place: "Rocky Ridge", note: "Jump, jump, jump!",
    speed: 346, speedUp: 75, length: 12000, gap: [175, 240], busy: 2.1,
    things: { tree: 5, rock: 7, ice: 2, snowman: 1, creek: 1, reindeer: 1 }, kids: 0.6,
  },
  {
    name: "RUN 9", place: "Three Creeks", note: "Hold JUMP to fly over the water",
    speed: 358, speedUp: 75, length: 12000, gap: [170, 240], busy: 2.15,
    things: { tree: 6, rock: 3, ice: 2, snowman: 1, creek: 4, reindeer: 1 }, kids: 0.6,
  },
  {
    name: "RUN 10", place: "The Reindeer Run", note: "The whole herd is out tonight",
    speed: 370, speedUp: 80, length: 12500, gap: [170, 235], busy: 2.2,
    things: { tree: 6, rock: 3, ice: 2, snowman: 1, creek: 1, reindeer: 5 }, kids: 0.6,
  },
  {
    name: "RUN 11", place: "Blizzard Pass", note: "Snowing so hard! Steady now",
    speed: 382, speedUp: 80, length: 13000, gap: [170, 235], busy: 2.2,
    things: { tree: 7, rock: 3, ice: 2, snowman: 1, creek: 1, reindeer: 2 }, kids: 0.6, weather: "blizzard",
  },
  {
    name: "RUN 12", place: "North Pole Peak", note: "The top of the world!",
    speed: 394, speedUp: 85, length: 14000, gap: [160, 230], busy: 2.4,
    things: { tree: 7, rock: 4, ice: 3, snowman: 2, creek: 2, reindeer: 3 }, kids: 0.6,
  },
];

// Every three runs is a new part of the mountain, with its own light, scenery along the edges and
// weather (Gene picked this, "D", on 2026-10-29), so going further feels like going somewhere new.
//   snow: the slope's colour.  light: the whole slope is multiplied by this (white = no change).
//   edges: { picture: weight } along both sides.  glow: those pictures light up (lanterns at dusk).
//   weather: clear | snow | wind | blizzard (a run can set its own).
export const AREAS = [
  {
    name: "SUNNY SLOPES", colour: "#ffe066", snow: 0xf4f8ff, light: 0xffffff,
    edges: { tree: 1 }, weather: "clear",
  },
  {
    name: "SUNSET WOODS", colour: "#ffa94d", snow: 0xfff4ea, light: 0xffdcb8,
    edges: { birch: 4, tree: 2, fence: 1 }, weather: "snow",
  },
  {
    name: "FROSTY FALLS", colour: "#9fd3ff", snow: 0xeaf2ff, light: 0xc0ceF4,
    edges: { icespire: 3, tree: 3, lantern: 1 }, glow: ["lantern"], weather: "wind",
  },
  {
    name: "NORTH POLE", colour: "#ff8fa3", snow: 0xe4eaff, light: 0x8e9ee0,
    edges: { xmastree: 3, candycane: 2, lantern: 1 }, glow: ["lantern", "xmastree"], weather: "snow",
  },
];
export const areaOf = (n) => AREAS[Math.floor(n / 3) % AREAS.length];

// Past the last run it keeps going, a little faster and busier each time.
export function runRules(n) {
  if (n < RUNS.length) return RUNS[n];
  const last = RUNS.at(-1);
  const extra = n - RUNS.length + 1;
  return {
    ...last,
    name: `RUN ${n + 1}`, place: "Even Bigger Mountain", note: "How far can Santa go?",
    speed: Math.min(480, last.speed + 10 * extra),
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
// Talking: how often a kid coming up the slope calls out, and who talks when a gift lands.
export const KID_CALL = 0.3;     // the chance a kid calls out (and never within 6 s of the last one)
export const KID_THANKS = 0.25;  // a gift: the kid says thanks
export const SANTA_GIFT = 0.25;  // ... or Santa says something; otherwise just the jingle
export const REACH = 80;         // how close (across) counts as skiing past a kid
export const SAFE_S = 1.6;       // after a crash, Santa can't crash again for this long
