// Checks the course and the difficulty climb without a browser:  node tools/test-course.mjs
import { KINDS, RUNS, runRules } from "../js/rules.js";
import { LEFT, MIN_GAP, RIGHT, makeRow, widestGap } from "../js/course.js";

let failed = 0;
const check = (ok, what) => {
  if (!ok) {
    failed++;
    console.log("FAIL", what);
  }
};

// Every row leaves a way through that doesn't need a jump.
for (let n = 0; n < 12; n++) {
  const rules = runRules(n);
  for (let i = 0; i < 4000; i++) {
    const row = makeRow(rules, 0);
    const blocked = row
      .filter((t) => KINDS[t.kind] && t.kind !== "creek" && t.kind !== "reindeer")
      .map((t) => [t.x - KINDS[t.kind].r - 10, t.x + KINDS[t.kind].r + 10]);
    check(widestGap(blocked) >= MIN_GAP, `run ${n + 1}: a row with no way through ${JSON.stringify(row)}`);
    for (const t of row) check(t.x >= LEFT && t.x <= RIGHT, `run ${n + 1}: ${t.kind} off the slope at ${t.x}`);
    if (failed > 5) break;
  }
}

// The climb is gentle: each run a little faster, never a big jump.
for (let n = 1; n < 12; n++) {
  const a = runRules(n - 1);
  const b = runRules(n);
  check(b.speed >= a.speed, `run ${n + 1} slower than run ${n}`);
  check(b.speed - a.speed <= 25, `run ${n + 1} is ${b.speed - a.speed} faster than run ${n}: too big a step`);
}
check(RUNS[0].things.creek === undefined && RUNS[0].things.reindeer === undefined, "run 1 should be gentle");

console.log(failed ? `${failed} failed` : "all good");
process.exit(failed ? 1 : 0);
