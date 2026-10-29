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
  BIG_HOLD, BIG_S, HOP_S, KINDS, LIVES, MAX_LIVES, METRE, NUDGE, POINTS, REACH, SAFE_S, SLIDE_S, STEER, runRules,
} from "../rules.js";
import { sized } from "../textures.js";
import { H, W, fingerAt, floatText, inside, setupCamera, speech, text } from "../ui.js";

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
const GAGS = { tree: "BONK!", rock: "OOF!", snowman: "SPLAT!", reindeer: "OH DEER!", creek: "SPLASH!" };

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

    this.run = { run: 0, score: 0, gifts: 0, lives: LIVES, ...run };
    this.rules = runRules(this.run.run);
    this.phase = "ski";      // ski | crash | made-it | over
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

    this.add.rectangle(0, 0, W, FIELD_H, 0xf4f8ff).setOrigin(0).setDepth(-10);
    this.snow = this.add.tileSprite(0, 0, W, FIELD_H, "snow").setOrigin(0).setDepth(-9);
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
    if (this.phase === "ski") this.run.score += (speed * dt * POINTS.metre) / METRE;

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
        continue;
      }
      if (t.kind === "cocoa") {
        if (Math.abs(dy) < 34 && dx < 40) this.drinkCocoa(t);
        continue;
      }
      if (t.kind === "creek") {
        if (!air && dy < 0 && dy > -CREEK_H && dx < t.w / 2) this.crash(t);
        continue;
      }
      const k = KINDS[t.kind];
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
    this.run.score += POINTS.gift;
    audio.play("jingle");
    if (Math.random() < 0.5) this.say(kidVoice(kid, "thanks"), kid.sprite);
    else this.say("gift", this.santa);
    floatText(this, kid.sprite.x, kid.sprite.y - 90, `+${POINTS.gift}`, "#2a9d3a", 30);
    // the present flies from Santa's sack into the kid's arms (place() moves it), and the kid jumps for joy
    kid.gift = sized(this.add.image(this.santa.x, this.santa.y - 60, "gift"), 0.8);
    kid.giftFrom = { x: this.santa.x, y: this.santa.y - 60 };
    kid.giftT = 0;
    kid.hint?.destroy();
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
    this.airS = 0;
    this.slideT = 0;
    this.nudge = 0;
    audio.play(t.kind === "creek" ? "splash" : "crash");
    this.time.delayedCall(250, () => this.say(t.kind === "creek" ? "splash" : "crash", this.santa));
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(250, 255, 60, 60);
    const gag = text(this, W / 2, 470, GAGS[t.kind] ?? "OUCH!", 72, { color: "#ff6b6b", strokeThickness: 10 }).setDepth(6000);
    this.tweens.add({ targets: gag, scale: 1.25, duration: 160, yoyo: true });
    this.loseLifeShow();
    // the thing Santa hit gets a wobble (a snowman loses his head)
    if (t.sprite) this.tweens.add({ targets: t.sprite, angle: t.kind === "snowman" ? 80 : 8, duration: 90, yoyo: t.kind !== "snowman", repeat: t.kind === "snowman" ? 0 : 3 });
    const over = this.run.lives <= 0;
    this.time.delayedCall(over ? 1600 : 1300, () => {
      gag.destroy();
      if (over) return this.wipeout();
      this.phase = "ski";
      this.safeT = SAFE_S;
      this.ease = 0.25;
    });
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
    this.run.score += POINTS.run;
    this.run.finished = (this.run.finished ?? 0) + 1;
    audio.play("cheer");
    this.say("madeit", this.santa);
    const t = text(this, W / 2, 470, "MADE IT!", 76, { color: "#7CFC9A", strokeThickness: 12 }).setDepth(6000);
    this.tweens.add({ targets: t, scale: 1.12, duration: 300, yoyo: true, repeat: -1 });
    floatText(this, W / 2, 560, `+${POINTS.run} VILLAGE BONUS`, "#ffe066", 32);
  }

  finish() {
    const score = Math.round(this.run.score);
    const reached = this.run.run + 1;
    const { rank, previousTop } = store.recordRun(score, reached, this.run.gifts);
    this.scene.start("Results", { score, reached, gifts: this.run.gifts, finished: this.run.finished ?? 0, rank, previousTop, challenge: store.get("challenge") });
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
    // the forest along both edges
    while (this.nextEdge < ahead) {
      for (const x of [Phaser.Math.Between(-10, 14), Phaser.Math.Between(W - 14, W + 10)]) {
        this.trees.push(sized(this.add.image(x, 0, "tree").setOrigin(0.5, 0.95), Phaser.Math.FloatBetween(0.8, 1.05)).setData("y", this.nextEdge));
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
    this.trees = this.trees.filter((s) => (s.getData("y") > gone ? true : (s.destroy(), false)));
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
        // a kid coming up the slope calls out (now and then, so they don't all shout at once)
        if (!t.called && sy < FIELD_H - 120 && sy > SANTA_Y + 120 && this.phase === "ski") {
          t.called = true;
          if (this.time.now - this.lastCall > 2500 && !audio.talking()) {
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
    for (const s of this.trees) s.setY(s.getData("y") - top).setDepth(s.getData("y") - top);
    this.snow.tilePositionY = this.dist;
    this.village.y = this.villageAt - top;

    // Santa: leaning into turns, up in the air, crouching while JUMP is held, blinking when safe
    const air = this.airS > 0 ? Math.sin((Math.PI * this.airT) / this.airS) * this.airH : 0;
    let key = "santa";
    if (this.phase === "crash" || this.phase === "over") key = "santa-crash";
    else if (air > 0) key = "santa-jump";
    else if (this.vx !== 0) key = "santa-turn";
    if (this.santa.texture.key !== key) sized(this.santa.setTexture(key), 0.8);
    this.santa.setFlipX(key === "santa-turn" && this.vx < 0); // the turning picture leans to the right
    const crouch = this.held.jump && air === 0 && this.phase === "ski" ? 0.85 : 1;
    this.santa.setScale(this.santa.scaleX, Math.abs(this.santa.scaleX) * crouch);
    // a crashed Santa lies on top of whatever he hit
    this.santa.setDepth(key === "santa-crash" ? 4500 : SANTA_Y);
    this.santa.setPosition(this.x, SANTA_Y - air).setAngle(this.slideT > 0 ? Math.sin(this.time.now / 40) * 12 : 0);
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
    const houses = [[90, 130, 0xb5651d], [230, 170, 0x2a6f9d], [380, 120, 0x7d5a3c], [480, 190, 0x2a9d3a], [150, 260, 0x7b2cbf]];
    for (const [x, y, colour] of houses) {
      g.fillStyle(0x1b2440).fillRect(x - 44, y - 40, 88, 64);
      g.fillStyle(colour).fillRect(x - 40, y - 36, 80, 56);
      g.fillStyle(0xffe066).fillRect(x - 28, y - 22, 18, 16).fillRect(x + 10, y - 22, 18, 16);
      g.fillStyle(0x1b2440).fillTriangle(x - 54, y - 36, x + 54, y - 36, x, y - 86);
      g.fillStyle(0xffffff).fillTriangle(x - 46, y - 40, x + 46, y - 40, x, y - 80);
    }
    c.add(g);
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
    sized(this.add.image(24, 60, "gift"), 0.5).setDepth(d);
    this.giftText = text(this, 40, 60, "0", 18, { originX: 0, color: "#7CFC9A", strokeThickness: 4 }).setDepth(d);
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
    this.giftText.setText(String(this.run.gifts));
    this.lifeIcons.forEach((icon, i) => icon.setVisible(i < this.run.lives));
    const f = Math.min(1, this.dist / this.villageAt);
    this.marker.x = this.trackX[0] + f * (this.trackX[1] - this.trackX[0]);
  }
}

// The kind of line a kid says: the boys and the girls each have their own voice.
function kidVoice(kid, what) {
  return `${BOYS.includes(kid.look + 1) ? "boy" : "kid"}-${what}`;
}

// A frozen-over creek with an open stretch of water: jump it or go round.
function drawCreek(g, w) {
  g.clear();
  g.fillStyle(0xffffff).fillRoundedRect(-w / 2 - 8, -6, w + 16, CREEK_H + 12, 22);
  g.fillStyle(0x1b2440).fillRoundedRect(-w / 2, 0, w, CREEK_H, 18);
  g.fillStyle(0x3a86ff).fillRoundedRect(-w / 2 + 4, 4, w - 8, CREEK_H - 8, 16);
  g.lineStyle(3, 0xbfe0ff, 0.9);
  for (let i = 0; i < 5; i++) {
    const y = 20 + i * 26;
    const x = -w / 2 + 20 + ((i * 47) % (w - 60));
    g.lineBetween(x, y, x + 34, y);
  }
}
