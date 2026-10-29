// Fun Shed kit v1.4
// The card before each run: which run it is, where on the mountain, and how to play on the first.
// Tap or swipe to ski (it starts by itself after a few seconds).
import * as audio from "../audio.js";
import { listenForGestures } from "../gestures.js";
import { areaOf, runRules } from "../rules.js";
import { H, W, backdrop, setupCamera, text, woodSign } from "../ui.js";

export class DayScene extends Phaser.Scene {
  constructor() {
    super("Day");
  }

  // run: { run (0-based), score, gifts, lives }
  create(run) {
    setupCamera(this);
    this.run = run;
    const r = runRules(run.run);
    const area = areaOf(run.run);
    backdrop(this);
    this.add.rectangle(0, 0, W, H, area.light).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.3).setOrigin(0);
    // which part of the mountain; the first run in a new part says so
    const fresh = run.run > 0 && run.run % 3 === 0;
    text(this, W / 2, fresh ? 62 : 82, (fresh ? "NOW ENTERING\n" : "") + area.name, fresh ? 34 : 30, { color: area.colour, strokeThickness: 7 });

    woodSign(this, W / 2, 260, 460, 230);
    text(this, W / 2, 196, r.name, 60, { color: "#ffffff", strokeThickness: 10 });
    text(this, W / 2, 268, r.place, 34, { color: "#ffe066" });
    text(this, W / 2, 324, r.note, 24, { color: "#ffffff", strokeThickness: 5 });
    if (run.score > 0) text(this, W / 2, 420, `SCORE  ${Math.round(run.score).toLocaleString()}`, 26, { color: "#ffffff", strokeThickness: 5 });

    if (run.run === 0) {
      text(this, W / 2, 550, "◀ ▶  to steer\nJUMP  over rocks\n(hold JUMP for a big one)", 28, { color: "#ffffff", strokeThickness: 6 });
      text(this, W / 2, 680, "Ski close to the kids\nto give them presents!", 26, { color: "#7CFC9A", strokeThickness: 5 });
    }

    const go = text(this, W / 2, 840, "TAP TO SKI!", 44, { color: "#ffe066", strokeThickness: 8 });
    this.tweens.add({ targets: go, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    audio.play("jingle");

    this.started = false;
    listenForGestures(this, { lockMs: 600, onTap: () => this.start(), onSwipe: () => this.start() });
    this.time.delayedCall(run.run === 0 && !run.score ? 6000 : 3500, () => this.start());
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.scene.start("Play", this.run);
  }
}
