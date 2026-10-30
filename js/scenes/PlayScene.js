// A run down the mountain. Santa stays near the top of the screen and the slope scrolls up past him.
// Old-school arcade buttons along the bottom: ◀ and ▶ steer (tap for a small step, hold to glide),
// JUMP hops (tap) or leaps (hold, then let go). Ski close to a kid and they get a present.
// Trees, rocks, snowmen and reindeer cost a life; a jump clears everything but trees. Ice skids,
// creeks splash. Hot cocoa gives a life back. Reach the village at the bottom and the next run starts.
import * as audio from "../audio.js";
import * as sayings from "../sayings.js";
import * as store from "../storage.js";
import { BOYS, CREEK_H, LEFT, RIGHT, makeKid, makeRow } from "../course.js";
import {
  BIG_HOLD, BIG_S, HOP_S, KID_CALL, KID_THANKS, KINDS, LIVES, MAX_LIVES, NUDGE, POINTS, REACH, SAFE_S, SANTA_GIFT, SLIDE_S, STEER, STREAK, areaOf, runRules,
} from "../rules.js";
import { sized } from "../textures.js";
import { H, W, fingerAt, floatText, inside, setupCamera, snowfall, speech, text } from "../ui.js";

const SANTA_Y = 290;        // where Santa's skis touch the snow, on screen
const FIELD_H = 800;        // the slope shows above the buttons
const PAUSE = { x: W / 2 - 34, y: 0, w: 68, h: 70 };
// The buttons, old-school arcade style.
const PAD_Y = 812;
const PAD_H = 136;
const PADS = {
  left: { x: 14, y: PAD_Y, w: 160, h: PAD_H },
  jump: { x: 186, y: PAD_Y, w: 168, h: PAD_H },
  right: { x: 366, y: PAD_Y, w: 160, h: PAD_H },
};
const TAP_MS = 180;         // a JUMP press shorter than this is a hop
const JUMPED = { rock: "NICE JUMP!", ice: "OVER THE ICE!", snowman: "SNOWMAN HOP!", reindeer: "REINDEER LEAP!" };
const GAGS = { tree: "BONK!", rock: "OOF!", snowman: "SPLAT!", reindeer: "OH DEER!", creek: "SPLASH!" };

// The light (dusk, night) is laid over the slope at this depth: above everything on the snow and
// Santa, under the speech bubbles, the score and the buttons.
const LIGHT_D = 4400;
// Falling snow for each kind of weather (see snowfall() in ui.js).
const WEATHER = {
  snow: { count: 45 },
  wind: { count: 60, wind: 140, fall: 1.3 },
  blizzard: { count: 220, wind: 280, fall: 2 },
};
// The village cottages at the bottom of each run: x, y (where it stands), colour. Back row first.
const HOUSES = [[380, 110, "red"], [90, 120, "blue"], [235, 160, "brown"], [475, 190, "green"], [150, 260, "red"], [340, 280, "blue"]];
// How tall each edge picture is shown (the pine tree is sized like the ones on the slope).
const EDGE_H = { birch: 150, fence: 55, lantern: 115, icespire: 130, candycane: 105, xmastree: 135 };

function pickEdge(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) if ((roll -= w) < 0) return k;
  return "tree";
}

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("Play");
  }

  // run: { run (0-based), score, gifts, lives }
  create(run) {
    setupCamera(this);
    // Phaser keeps a scene's paused clock and tweens through a restart; a new run starts fresh.
    this.time.paused = false;
    this.tweens.resumeAll();

    this.run = { run: 0, score: 0, gifts: 0, lives: LIVES, streak: 0, bestStreak: 0, ...run };
    this.kidsMissed = 0;     // kids on this run who didn't get a present (all get one: a bonus)
    this.giftsAtStart = this.run.gifts;
    this.rules = runRules(this.run.run);
    this.phase = "ski";      // ski | crash | made-it | over
    this.leaving = false;    // the scene object is reused, so this must be reset every run
    this.sinkT = -1;         // seconds since Santa fell in a creek (-1: he didn't)
    this.ring = null;
    this.dist = 0;           // px of slope skied this run
    this.x = W / 2;
    this.vx = 0;
    this.held = { left: false, right: false, jump: false };
    this.nudge = 0;          // px still to go from an arrow tap
    this.nudgeDir = 0;
    this.jumpDownAt = 0;
    this.airT = 0;           // seconds into a jump; airS is how long it lasts (0 = on the snow)
    this.airS = 0;
    this.airH = 0;
    this.slideT = 0;
    this.slideV = 0;
    this.safeT = 0;
    this.ease = 1;           // speed builds back up after a crash
    this.things = [];
    this.nextRow = 420;
    this.kidSide = 0;
    this.tracks = [];
    this.trees = [];
    this.nextEdge = -SANTA_Y;
    this.villageAt = this.rules.length;
    this.hintedKid = this.run.run > 0;

    // the part of the mountain this run is on: its snow, its light and its weather
    this.area = areaOf(this.run.run);
    this.add.rectangle(0, 0, W, FIELD_H, this.area.snow).setOrigin(0).setDepth(-10);
    this.snow = this.add.tileSprite(0, 0, W, FIELD_H, "snow").setOrigin(0).setDepth(-9).setTint(this.area.snow);
    if (this.area.light !== 0xffffff) {
      this.add.rectangle(0, 0, W, FIELD_H, this.area.light).setOrigin(0).setDepth(LIGHT_D).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
    const weather = this.rules.weather ?? this.area.weather;
    if (WEATHER[weather]) snowfall(this, LIGHT_D + 300, WEATHER[weather]);
    if (weather === "blizzard") this.add.rectangle(0, 0, W, FIELD_H, 0xffffff, 0.25).setOrigin(0).setDepth(LIGHT_D + 200);
    this.trackG = this.add.graphics().setDepth(-5);
    this.shadow = this.add.ellipse(this.x, SANTA_Y, 56, 18, 0x1b2440, 0.18).setDepth(-4);
    this.santa = sized(this.add.image(this.x, SANTA_Y, "santa").setOrigin(0.5, 0.97), 0.8).setDepth(SANTA_Y);
    this.baseScale = this.santa.scaleX;
    this.village = this.makeVillage();
    this.makeHud();
    this.makePads();

    this.listen();
    const away = () => document.hidden && this.pause();
    document.addEventListener("visibilitychange", away);
    this.events.once("shutdown", () => document.removeEventListener("visibilitychange", away));
    this.bubble = null;
    this.lastCall = 0;
    this.time.delayedCall(500, () => this.say("start", this.santa));
  }

  // ---- talking: Santa's lines, and the kids calling out ----

  // Says a random line of a kind, out loud if it's recorded, in a bubble above and to the left of
  // whoever says it (Santa, or a kid's sprite).
  say(kind, who) {
    const line = sayings.random(kind);
    if (!line.text) return;
    audio.playVoice(sayings.clip(line));
    this.bubble?.c.destroy();
    const [g, label] = speech(this, 0, 0, line.text, 19, 230);
    const c = this.add.container(0, 0, [g, label]).setDepth(5600);
    this.bubble = { c, who, w: label.width + 28 };
    this.time.delayedCall(1800, () => {
      if (this.bubble?.c !== c) return;
      c.destroy();
      this.bubble = null;
    });
  }

  // ---- input: the three buttons (several fingers at once), and the keyboard ----

  listen() {
    this.input.addPointer(2);
    const fingers = new Map(); // pointer id → which pad it is on
    this.input.on("pointerdown", (p) => {
      audio.unlock();
      const at = fingerAt(this, p);
      if (inside(at.x, at.y, PAUSE)) return this.pause();
      const pad = this.padAt(at);
      if (!pad) return;
      fingers.set(p.id, pad);
      this.press(pad);
    });
    // Sliding a finger from one arrow onto the other switches direction.
    this.input.on("pointermove", (p) => {
      if (!fingers.has(p.id)) return;
      const pad = this.padAt(fingerAt(this, p));
      const was = fingers.get(p.id);
      if (!pad || pad === was || pad === "jump" || was === "jump") return;
      this.release(was);
      fingers.set(p.id, pad);
      this.press(pad);
    });
    const up = (p) => {
      audio.unlock(); // phones only allow sound once a touch has ended
      const pad = fingers.get(p.id);
      if (!pad) return;
      fingers.delete(p.id);
      if (![...fingers.values()].includes(pad)) this.release(pad);
    };
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);
    // Arrow keys and space, for playing on a computer.
    const KEYS = { ArrowLeft: "left", ArrowRight: "right", Space: "jump", ArrowUp: "jump" };
    this.input.keyboard?.on("keydown", (e) => {
      if (e.code === "Escape") return this.pause();
      if (KEYS[e.code] && !e.repeat) this.press(KEYS[e.code]);
    });
    this.input.keyboard?.on("keyup", (e) => KEYS[e.code] && this.release(KEYS[e.code]));
  }

  // The pads reach a little past what's drawn, so a thumb near the edge still counts.
  padAt(at) {
    for (const [name, r] of Object.entries(PADS)) {
      if (at.x >= r.x - 8 && at.x <= r.x + r.w + 8 && at.y >= r.y - 30) return name;
    }
    return null;
  }

  press(pad) {
    this.held[pad] = true;
    this.drawPads();
    if (pad === "jump") {
      this.jumpDownAt = performance.now();
      return;
    }
    this.nudgeDir = pad === "left" ? -1 : 1;
    this.nudge = NUDGE;
  }

  release(pad) {
    if (!this.held[pad]) return;
    this.held[pad] = false;
    this.drawPads();
    if (pad === "jump") this.jump(performance.now() - this.jumpDownAt);
  }

  // A quick tap hops; the longer JUMP was held, the bigger the leap.
  jump(heldMs) {
    if (this.phase !== "ski" || this.airS > 0) return;
    const f = heldMs < TAP_MS ? 0 : Phaser.Math.Clamp((heldMs - TAP_MS) / (BIG_HOLD - TAP_MS), 0, 1);
    this.airS = HOP_S + (BIG_S - HOP_S) * f;
    this.airH = 46 + 70 * f;
    this.airT = 0;
    audio.play(f > 0.5 ? "leap" : "jump");
    if (f > 0.5 && Math.random() < 0.6) this.say("leap", this.santa);
  }

  pause() {
    if (this.phase !== "ski" || !this.scene.isActive()) return;
    for (const pad in this.held) this.held[pad] = false;
    this.drawPads();
    this.scene.pause();
    this.scene.launch("Pause");
  }

  // From the pause screen: the run ends here, with the score saved.
  quit() {
    this.scene.resume();
    this.finish();
  }

  // ---- every frame ----

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000;
    this.safeT = Math.max(0, this.safeT - dt);
    if (this.phase === "ski" || this.phase === "made-it") this.ski(dt);
    this.layOut();
    this.place();
    this.updateHud();
  }

  ski(dt) {
    const r = this.rules;
    this.ease = Math.min(1, this.ease + dt * 0.8);
    let speed = (r.speed + (r.speedUp * Math.min(this.dist, r.length)) / r.length) * this.ease;
    if (this.phase === "made-it") speed = Math.max(0, (this.speedAtEnd -= dt * 220));
    this.speed = speed;
    this.dist += speed * dt;

    // steering: held arrows glide; a tap still moves NUDGE px
    if (this.slideT > 0) {
      this.slideT -= dt;
      this.vx = this.slideV;
    } else {
      const dir = this.held.left && !this.held.right ? -1 : this.held.right && !this.held.left ? 1 : this.nudge > 0 ? this.nudgeDir : 0;
      this.vx = dir * STEER;
    }
    if (this.phase !== "ski") this.vx *= 0.9;
    const before = this.x;
    this.x = Phaser.Math.Clamp(this.x + this.vx * dt, LEFT, RIGHT);
    if (this.slideT <= 0) this.nudge = Math.max(0, this.nudge - Math.abs(this.x - before));
    if (this.x === LEFT || this.x === RIGHT) this.slideV = -this.slideV * 0.5;

    if (this.airS > 0) {
      this.airT += dt;
      if (this.airT >= this.airS) {
        this.airS = 0;
        audio.play("land");
      }
    }

    if (this.phase === "ski") {
      this.meet();
      if (this.dist >= this.villageAt) this.madeIt();
    } else if (this.phase === "made-it" && this.speed === 0 && !this.leaving) {
      this.leaving = true;
      this.time.delayedCall(1200, () => this.scene.start("Day", { ...this.run, run: this.run.run + 1 }));
    }
  }

  // Santa meets whatever is at his skis.
  meet() {
    const air = this.airS > 0;
    for (const t of this.things) {
      if (t.done) continue;
      const dy = t.y - this.dist; // how far below Santa's skis, in slope px
      const dx = Math.abs(t.x - this.x);
      if (t.kind === "kid") {
        if (Math.abs(dy) < 40 && dx < REACH) this.giveGift(t);
        else if (dy < -40) this.missKid(t);
        continue;
      }
      if (t.kind === "cocoa") {
        if (Math.abs(dy) < 34 && dx < 40) this.drinkCocoa(t);
        continue;
      }
      if (t.kind === "creek") {
        if (!air && dx < t.w / 2 && Math.abs(dy + CREEK_H / 2) < creekHalf(dx, t.w) - 6) this.crash(t);
        else if (air && dx < t.w / 2 && dy < 0 && dy > -CREEK_H) t.flown = true;
        else if (t.flown && dy <= -CREEK_H) this.jumpBonus(t, POINTS.creekJump, "BIG AIR!");
        continue;
      }
      const k = KINDS[t.kind];
      if (!k.tall) {
        // everything but a tree can be jumped, and a clean jump scores once it's behind him
        if (air && Math.abs(dy) <= k.r && dx <= k.r + 14) t.flown = true;
        else if (t.flown && dy < -k.r) this.jumpBonus(t, t.kind === "reindeer" ? POINTS.reindeerJump : POINTS.jump, JUMPED[t.kind]);
      }
      if (Math.abs(dy) > k.r || dx > k.r + 14) continue;
      if (air && !k.tall) continue;
      if (k.hit === "slide") {
        if (this.slideT <= 0) this.skid();
        continue;
      }
      this.crash(t);
    }
  }

  giveGift(kid) {
    kid.done = true;
    this.run.gifts++;
    this.run.streak++;
    this.run.bestStreak = Math.max(this.run.bestStreak, this.run.streak);
    const times = this.times();
    this.run.score += POINTS.gift * times;
    if (STREAK.includes(this.run.streak)) floatText(this, W / 2, 420, `GIFT STREAK! x${times}`, "#ffe066", 40);
    audio.play("jingle");
    // not every gift gets words, or it's too noisy: sometimes the kid says thanks, sometimes Santa talks
    const roll = Math.random();
    if (roll < KID_THANKS) this.say(kidVoice(kid, "thanks"), kid.sprite);
    else if (roll < KID_THANKS + SANTA_GIFT) this.say("gift", this.santa);
    floatText(this, kid.sprite.x, kid.sprite.y - 90, `+${POINTS.gift * times}`, "#2a9d3a", 30);
    // the present flies from Santa's sack into the kid's arms (place() moves it), and the kid jumps for joy
    kid.gift = sized(this.add.image(this.santa.x, this.santa.y - 60, "gift"), 0.8);
    kid.giftFrom = { x: this.santa.x, y: this.santa.y - 60 };
    kid.giftT = 0;
    kid.hint?.destroy();
  }

  // How much a gift is worth right now, from the streak: 1, 2 or 3 times.
  times() {
    return 1 + STREAK.filter((n) => this.run.streak >= n).length;
  }

  // A kid went by without a present: the streak is over, and no every-kid bonus this run.
  missKid(kid) {
    kid.done = true;
    this.kidsMissed++;
    this.breakStreak();
  }

  breakStreak() {
    if (this.run.streak >= STREAK[0]) floatText(this, W / 2, 380, "STREAK OVER", "#ffffff", 30);
    this.run.streak = 0;
  }

  // A clean jump over a rock or a creek.
  jumpBonus(t, points, words) {
    t.done = true;
    this.run.score += points;
    floatText(this, Phaser.Math.Clamp(this.x, 150, W - 150), SANTA_Y - 110, `+${points} ${words}`, "#ffe066", 30);
  }

  drinkCocoa(mug) {
    mug.done = true;
    mug.sprite.setVisible(false);
    if (this.run.lives < MAX_LIVES) {
      this.run.lives++;
      floatText(this, mug.sprite.x, mug.sprite.y - 40, "+1 LIFE! ☕", "#ffe066", 32);
    } else {
      this.run.score += POINTS.gift;
      floatText(this, mug.sprite.x, mug.sprite.y - 40, `+${POINTS.gift}`, "#ffe066", 30);
    }
    audio.play("cocoa");
    this.say("cocoa", this.santa);
  }

  skid() {
    this.slideT = SLIDE_S;
    this.slideV = (this.vx || (Math.random() < 0.5 ? -1 : 1) * STEER * 0.6) * 0.9;
    floatText(this, this.santa.x, SANTA_Y - 140, "WHOA!", "#9ad1f0", 34);
    audio.play("skid");
    if (Math.random() < 0.5) this.say("skid", this.santa);
  }

  crash(t) {
    if (this.safeT > 0) return;
    t.done = true;
    this.phase = "crash";
    this.run.lives--;
    this.breakStreak();
    this.airS = 0;
    this.slideT = 0;
    this.nudge = 0;
    audio.play(t.kind === "creek" ? "splash" : "crash");
    this.time.delayedCall(250, () => this.say(t.kind === "creek" ? "splash" : "crash", this.santa));
    // a creek is a splash: Santa sinks to his chest (place() does it), and nothing shakes
    this.sinkT = t.kind === "creek" ? 0 : -1;
    this.sinkAt = t.y + CREEK_H / 2 + 24; // he glides on into the middle of the water
    if (t.kind === "creek") this.splash();
    else this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(250, 255, 60, 60);
    const gag = text(this, W / 2, 470, GAGS[t.kind] ?? "OUCH!", 72, { color: "#ff6b6b", strokeThickness: 10 }).setDepth(6000);
    this.tweens.add({ targets: gag, scale: 1.25, duration: 160, yoyo: true });
    this.loseLifeShow();
    // the thing Santa hit gets a wobble (a snowman loses his head)
    if (t.sprite && t.kind !== "creek") this.tweens.add({ targets: t.sprite, angle: t.kind === "snowman" ? 80 : 8, duration: 90, yoyo: t.kind !== "snowman", repeat: t.kind === "snowman" ? 0 : 3 });
    const over = this.run.lives <= 0;
    this.time.delayedCall(over ? 1600 : 1300, () => {
      gag.destroy();
      if (over) return this.wipeout();
      this.phase = "ski";
      this.sinkT = -1;
      this.safeT = SAFE_S;
      this.ease = 0.25;
    });
  }

  // Santa goes in the water: a ring of ripples round him and drops flying up.
  splash() {
    this.ring = this.add.container(this.x, SANTA_Y).setDepth(SANTA_Y + 1);
    const g = this.add.graphics();
    g.fillStyle(0x1b2440).fillEllipse(0, 0, 96, 30);
    g.fillStyle(0x5aa9ff).fillEllipse(0, 0, 90, 25);
    g.lineStyle(3, 0xe6f4ff).strokeEllipse(0, 0, 70, 16);
    this.ring.add(g);
    this.tweens.add({ targets: g, scaleX: 1.12, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    for (let i = 0; i < 9; i++) {
      const drop = this.add.circle(this.x, SANTA_Y - 10, Phaser.Math.Between(4, 8), 0x8cc8ff).setStrokeStyle(2, 0x1b2440).setDepth(4600);
      this.tweens.add({
        targets: drop, x: this.x + Phaser.Math.Between(-80, 80), y: SANTA_Y - Phaser.Math.Between(50, 120),
        duration: 300, ease: "Quad.easeOut", yoyo: true, onComplete: () => drop.destroy(),
      });
    }
  }

  // Losing a life is big and plain: the hat flies off the HUD and "2 LEFT" shows.
  loseLifeShow() {
    const icon = this.lifeIcons[this.run.lives];
    if (icon) {
      const ghost = sized(this.add.image(icon.x, icon.y, "santa"), 0.24).setDepth(6000);
      this.tweens.add({ targets: ghost, y: icon.y + 300, x: W / 2, scale: ghost.scale * 3, alpha: 0, angle: 200, duration: 900, ease: "Quad.easeIn", onComplete: () => ghost.destroy() });
    }
    const left = this.run.lives;
    const words = left <= 0 ? "NO SANTAS LEFT!" : left === 1 ? "LAST SANTA!" : `${left} SANTAS LEFT`;
    const msg = text(this, W / 2, 550, words, 34, { color: "#ffffff", strokeThickness: 7 }).setDepth(6000);
    this.tweens.add({ targets: msg, alpha: 0, delay: 900, duration: 400, onComplete: () => msg.destroy() });
  }

  wipeout() {
    this.phase = "over";
    audio.play("wipeout");
    this.say("wipeout", this.santa);
    text(this, W / 2, 470, "WIPEOUT!", 80, { color: "#ff6b6b", strokeThickness: 12 }).setDepth(6000);
    this.time.delayedCall(1600, () => this.finish());
  }

  madeIt() {
    this.phase = "made-it";
    this.speedAtEnd = this.speed;
    this.run.finished = (this.run.finished ?? 0) + 1;
    audio.play("cheer");
    this.say("madeit", this.santa);
    const t = text(this, W / 2, 470, "MADE IT!", 76, { color: "#7CFC9A", strokeThickness: 12 }).setDepth(6000);
    this.tweens.add({ targets: t, scale: 1.12, duration: 300, yoyo: true, repeat: -1 });
    // every kid on the run got a present (kids still on the slope below don't count against you)
    if (this.kidsMissed === 0 && this.run.gifts > this.giftsAtStart) {
      this.run.score += POINTS.everyKid;
      floatText(this, W / 2, 560, `+${POINTS.everyKid} EVERY KID!`, "#ffe066", 36);
    }
  }

  finish() {
    const score = Math.round(this.run.score);
    const reached = this.run.run + 1;
    const { rank, previousTop } = store.recordRun(score, reached, this.run.gifts);
    this.scene.start("Results", { score, reached, gifts: this.run.gifts, finished: this.run.finished ?? 0, streak: this.run.bestStreak, rank, previousTop, challenge: store.get("challenge") });
  }

  // ---- the slope ----

  // Makes the rows of things ahead of Santa, and lets go of the ones gone off the top.
  layOut() {
    const ahead = this.dist + FIELD_H - SANTA_Y + 160;
    while (this.nextRow < ahead && this.nextRow < this.villageAt - 500) {
      for (const t of makeRow(this.rules, this.nextRow)) this.addThing(t);
      const [a, b] = this.rules.gap;
      const gap = Phaser.Math.Between(a, b);
      if (Math.random() < this.rules.kids) this.addThing(makeKid(this.nextRow + gap / 2));
      this.nextRow += gap;
    }
    // the scenery along both edges, which changes with the area
    while (this.nextEdge < ahead) {
      for (const x of [Phaser.Math.Between(-10, 14), Phaser.Math.Between(W - 14, W + 10)]) {
        const key = pickEdge(this.area.edges);
        const s = this.add.image(x, 0, key).setOrigin(0.5, 0.95).setData("y", this.nextEdge);
        if (key === "tree") sized(s, Phaser.Math.FloatBetween(0.8, 1.05));
        else s.setScale((EDGE_H[key] / s.frame.height) * Phaser.Math.FloatBetween(0.85, 1.05));
        if (this.area.glow?.includes(key)) {
          // lanterns and lit-up trees shine through the dusk and the dark
          s.setData("glow", this.add.image(x, 0, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(LIGHT_D + 1)
            .setScale(key === "lantern" ? 0.8 : 0.9).setAlpha(key === "lantern" ? 0.7 : 0.35));
          s.setData("glowUp", s.displayHeight * (key === "lantern" ? 0.85 : 0.5));
        }
        this.trees.push(s);
      }
      this.nextEdge += Phaser.Math.Between(60, 90);
    }
    const gone = this.dist - SANTA_Y - 200;
    this.things = this.things.filter((t) => {
      if (t.y > gone) return true;
      t.sprite?.destroy();
      t.gift?.destroy();
      t.hint?.destroy();
      return false;
    });
    this.trees = this.trees.filter((s) => {
      if (s.getData("y") > gone) return true;
      s.getData("glow")?.destroy();
      s.destroy();
      return false;
    });
  }

  addThing(t) {
    if (t.kind === "creek") {
      t.sprite = this.add.graphics();
      drawCreek(t.sprite, t.w);
    } else {
      const key = t.kind === "kid" ? `kid-${t.look + 1}` : t.kind;
      const flat = t.kind === "ice";
      t.sprite = sized(this.add.image(t.x, 0, key).setOrigin(0.5, flat ? 0.5 : 0.92), t.kind === "kid" ? 0.85 : 1);
      if (t.kind === "reindeer") t.sprite.setFlipX(t.dir < 0);
    }
    if (t.kind === "kid" && !this.hintedKid) {
      this.hintedKid = true;
      t.hint = text(this, t.x, 0, "SKI CLOSE\nFOR A GIFT!", 20, { color: "#ffe066", strokeThickness: 5 }).setDepth(5500);
    }
    this.things.push(t);
  }

  // Puts everything where it belongs on screen this frame.
  place() {
    const top = this.dist - SANTA_Y;
    const dt = this.game.loop.delta / 1000;
    for (const t of this.things) {
      const sy = t.y - top;
      if (t.kind === "reindeer" && this.phase !== "over") {
        t.x += t.dir * 110 * dt;
        if (t.x < LEFT - 30 || t.x > RIGHT + 30) t.dir = -t.dir, t.sprite.setFlipX(t.dir < 0);
      }
      if (t.kind === "creek") t.sprite.setPosition(t.x, sy).setDepth(-6);
      else t.sprite.setPosition(t.x, sy).setDepth(t.kind === "ice" ? -6 : sy);
      if (t.kind === "kid") {
        if (t.gift) {
          t.giftT += dt;
          t.sprite.y -= Math.abs(Math.sin(t.giftT * 9)) * 16;
          const f = Math.min(1, t.giftT / 0.35);
          const ease = 1 - (1 - f) * (1 - f);
          t.gift.setPosition(
            Phaser.Math.Linear(t.giftFrom.x, t.sprite.x, ease),
            Phaser.Math.Linear(t.giftFrom.y, t.sprite.y - 44, ease),
          ).setAngle(f < 1 ? f * 360 : 0).setDepth(f < 1 ? 4000 : sy + 1);
        }
        t.hint?.setPosition(t.x, sy - 104);
        // a kid coming up the slope calls out now and then (Gene: not every kid, it gets noisy)
        if (!t.called && sy < FIELD_H - 120 && sy > SANTA_Y + 120 && this.phase === "ski") {
          t.called = true;
          if (Math.random() < KID_CALL && this.time.now - this.lastCall > 6000 && !audio.talking()) {
            this.lastCall = this.time.now;
            this.say(kidVoice(t, "call"), t.sprite);
          }
        }
      }
    }
    if (this.bubble) {
      const who = this.bubble.who;
      if (!who.active) {
        this.bubble.c.destroy();
        this.bubble = null;
      } else {
        const x = Phaser.Math.Clamp(who.x - 16 - this.bubble.w, 8, W - this.bubble.w - 8);
        this.bubble.c.setPosition(x, Math.max(130, who.y - who.displayHeight - 4));
      }
    }
    for (const s of this.trees) {
      s.setY(s.getData("y") - top).setDepth(s.getData("y") - top);
      s.getData("glow")?.setPosition(s.x, s.y - s.getData("glowUp"));
    }
    this.snow.tilePositionY = this.dist;
    this.village.y = this.villageAt - top;
    this.villageGlow.y = this.village.y;

    // Santa: leaning into turns, up in the air, crouching while JUMP is held, blinking when safe
    const air = this.airS > 0 ? Math.sin((Math.PI * this.airT) / this.airS) * this.airH : 0;
    let key = "santa";
    const sinking = this.sinkT >= 0 && (this.phase === "crash" || this.phase === "over");
    if (sinking) key = "santa";
    else if (this.phase === "crash" || this.phase === "over") key = "santa-crash";
    else if (air > 0) key = "santa-jump";
    else if (this.vx !== 0) key = "santa-turn";
    if (this.santa.texture.key !== key) sized(this.santa.setTexture(key), 0.8);
    this.santa.setFlipX(key === "santa-turn" && this.vx < 0); // the turning picture leans to the right
    const crouch = this.held.jump && air === 0 && this.phase === "ski" ? 0.85 : 1;
    this.santa.setScale(this.santa.scaleX, Math.abs(this.santa.scaleX) * crouch);
    // a crashed Santa lies on top of whatever he hit
    this.santa.setDepth(key === "santa-crash" ? 4500 : SANTA_Y);
    this.santa.setPosition(this.x, SANTA_Y - air).setAngle(this.slideT > 0 ? Math.sin(this.time.now / 40) * 12 : 0);
    // sinking in a creek: the bottom of him goes under, bobbing a little
    if (sinking) {
      this.sinkT += dt;
      this.dist += (this.sinkAt - this.dist) * Math.min(1, dt * 8);
      const under = 0.55 * Math.min(1, this.sinkT / 0.35);
      const fh = this.santa.frame.height;
      const h = fh * this.santa.scaleY; // how tall he is on screen
      this.santa.setCrop(0, 0, this.santa.frame.width, fh * (1 - under));
      this.santa.y += under * h * 0.8 + Math.sin(this.sinkT * 6) * 3;
      // the ring of water where he went in, at the bottom of what's left showing
      this.ring?.setPosition(this.x, this.santa.y - h * 0.97 + h * (1 - under));
    } else if (this.santa.isCropped) {
      this.santa.setCrop();
      this.ring?.destroy();
      this.ring = null;
    }
    this.santa.setAlpha(this.safeT > 0 && Math.floor(this.safeT * 8) % 2 === 0 ? 0.35 : 1);
    this.shadow.setPosition(this.x, SANTA_Y - 2).setScale(1 - air / 200);

    // ski tracks behind him, broken where he jumped
    if (air === 0 && this.phase === "ski") this.tracks.push({ x: this.x, y: this.dist });
    else if (this.tracks.at(-1) !== null) this.tracks.push(null);
    while (this.tracks.length > 120) this.tracks.shift();
    this.trackG.clear().lineStyle(3, 0xc9d8ee);
    for (const side of [-9, 9]) {
      let pen = false;
      this.trackG.beginPath();
      for (const p of this.tracks) {
        if (!p) {
          pen = false;
          continue;
        }
        const sy = p.y - top;
        if (pen) this.trackG.lineTo(p.x + side, sy);
        else this.trackG.moveTo(p.x + side, sy);
        pen = true;
      }
      this.trackG.strokePath();
    }
  }

  // The finish: a banner across the slope and the little village below it.
  makeVillage() {
    const c = this.add.container(0, 0).setDepth(-3);
    const g = this.add.graphics();
    g.fillStyle(0x1b2440).fillRect(36, -90, 10, 96).fillRect(W - 46, -90, 10, 96);
    g.fillStyle(0x1b2440).fillRoundedRect(40, -96, W - 80, 52, 10);
    g.fillStyle(0xd62828).fillRoundedRect(44, -92, W - 88, 44, 8);
    c.add(g);
    // cartoon cottages (img/house-*.png), back row first so the front ones overlap them
    for (const [x, y, colour] of HOUSES) c.add(this.add.image(x, y, "house-" + colour).setOrigin(0.5, 0.9).setScale(0.55));
    // after dark the windows glow (these ride along with the village, over the dark)
    this.villageGlow = this.add.container(0, 0).setDepth(LIGHT_D + 1);
    if (this.area.glow) {
      for (const [x, y] of HOUSES) this.villageGlow.add(this.add.image(x, y - 40, "glow").setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.6));
    }
    c.add(text(this, W / 2, -70, "🎄 THE VILLAGE 🎄", 28, { color: "#ffffff", strokeThickness: 5 }));
    return c;
  }

  // ---- buttons, score, lives ----

  makePads() {
    this.add.rectangle(0, FIELD_H, W, H - FIELD_H, 0x1b2440).setOrigin(0).setDepth(7000);
    this.padG = this.add.graphics().setDepth(7001);
    const mid = PAD_Y + PAD_H / 2;
    text(this, PADS.left.x + PADS.left.w / 2, mid, "◀", 64).setDepth(7002);
    text(this, PADS.jump.x + PADS.jump.w / 2, mid - 8, "JUMP", 40).setDepth(7002);
    text(this, PADS.jump.x + PADS.jump.w / 2, mid + 34, "hold = big", 15, { strokeThickness: 3 }).setDepth(7002);
    text(this, PADS.right.x + PADS.right.w / 2, mid, "▶", 64).setDepth(7002);
    this.drawPads();
  }

  drawPads() {
    const g = this.padG;
    g.clear();
    for (const [name, r] of Object.entries(PADS)) {
      const down = this.held[name];
      const colour = name === "jump" ? 0x2a9d3a : 0x2a6f9d;
      g.fillStyle(0x0b1020).fillRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 26);
      g.fillStyle(down ? 0xffffff : colour, down ? 0.55 : 1).fillRoundedRect(r.x, r.y + (down ? 4 : 0), r.w, r.h - (down ? 4 : 0), 22);
      if (!down) g.fillStyle(0xffffff, 0.18).fillRoundedRect(r.x + 8, r.y + 6, r.w - 16, 22, 10);
    }
  }

  makeHud() {
    const d = 5000;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x1b2440, 0.55).fillRect(0, 0, W, 76);
    this.scoreText = text(this, 16, 28, "0", 30, { originX: 0 }).setDepth(d);
    // the gift streak, only while there is one: 🔥 3/5, then 🔥 x2 7/10, then 🔥 x3
    this.streakText = text(this, 16, 60, "", 18, { originX: 0, color: "#ffe066", strokeThickness: 4 }).setDepth(d);
    // lives: a little Santa for each
    this.lifeIcons = Array.from({ length: MAX_LIVES }, (_, i) => sized(this.add.image(W - 26 - i * 34, 32, "santa"), 0.24).setDepth(d));
    // the pause button
    g.fillStyle(0xffffff, 0.9).fillCircle(W / 2, 32, 24);
    g.fillStyle(0x1b2440).fillRect(W / 2 - 9, 21, 6, 22).fillRect(W / 2 + 3, 21, 6, 22);
    // how far down the mountain: a little Santa along a track to the village
    this.trackX = [W / 2 + 50, W - 40];
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(this.trackX[0], 62, this.trackX[1] - this.trackX[0], 6, 3);
    text(this, this.trackX[1] + 8, 65, "🏠", 14, { originX: 0, strokeThickness: 0 }).setDepth(d);
    text(this, this.trackX[0] - 8, 65, this.rules.name, 13, { originX: 1, strokeThickness: 3 }).setDepth(d);
    this.marker = sized(this.add.image(this.trackX[0], 60, "santa"), 0.14).setDepth(d + 1);
  }

  updateHud() {
    this.scoreText.setText(Math.round(this.run.score).toLocaleString());
    const n = this.run.streak;
    const next = STREAK.find((s) => n < s);
    const times = this.times() > 1 ? `x${this.times()}  ` : "";
    this.streakText.setText(n < 2 ? "" : `🔥 ${times}${next ? `${n}/${next}` : ""}`.trim());
    this.lifeIcons.forEach((icon, i) => icon.setVisible(i < this.run.lives));
    const f = Math.min(1, this.dist / this.villageAt);
    this.marker.x = this.trackX[0] + f * (this.trackX[1] - this.trackX[0]);
  }
}

// The kind of line a kid says: the boys and the girls each have their own voice.
function kidVoice(kid, what) {
  return `${BOYS.includes(kid.look + 1) ? "boy" : "kid"}-${what}`;
}

// How far a creek reaches up and down from its middle line, dx across from its middle: the ends are
// rounded, so it's thinner there. The water drawn and the splash check both use this.
function creekHalf(dx, w) {
  const e = Math.max(0, 1 - (dx / (w / 2)) ** 2);
  return (CREEK_H / 2 - 8) * Math.pow(e, 0.35);
}

// A stretch of open water across the slope: jump it or go round.
function drawCreek(g, w) {
  g.clear();
  // the edge: wavy along the top and bottom, rounded at the ends
  const pts = (grow) => {
    const top = [];
    const bottom = [];
    for (let i = 0; i <= 24; i++) {
      const x = -w / 2 + (w * i) / 24;
      const half = creekHalf(Math.abs(x), w) + grow;
      const wave = Math.sin(i * 1.3 + w) * 5 * (half > 20 ? 1 : 0);
      top.push({ x, y: CREEK_H / 2 - half + wave });
      bottom.push({ x, y: CREEK_H / 2 + half + wave * 0.7 });
    }
    return [...top, ...bottom.reverse()];
  };
  g.fillStyle(0xffffff).fillPoints(pts(10), true); // a snowy bank
  g.fillStyle(0x1b2440).fillPoints(pts(4), true);   // the cartoon outline
  g.fillStyle(0x2f7de1).fillPoints(pts(0), true);   // deep water
  g.fillStyle(0x5aa9ff).fillPoints(pts(-14).map((p) => ({ x: p.x, y: p.y - 4 })), true); // lighter in the middle
  // ripples: little white curves
  g.lineStyle(3, 0xe6f4ff, 0.9);
  for (let i = 0; i < Math.round(w / 60); i++) {
    const x = -w / 2 + 40 + ((i * 71 + w) % Math.max(1, w - 80));
    const y = CREEK_H / 2 - 22 + ((i * 37) % 44);
    if (creekHalf(Math.abs(x), w) < 30) continue;
    g.beginPath();
    g.arc(x, y, 12, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
  }
}
