// Fun Shed kit v1.4
// The title: Santa on his skis under the snowy sign. Tap PLAY (or swipe up) to play, and HIGH
// SCORES (or swipe down) for the boards. Only the buttons start things, so a stray tap does nothing.
// Tap your initials to change them, or SOUND to mute.
// At the bottom: the version, and an update button when a newer release is out (js/update.js).
import * as audio from "../audio.js";
import * as store from "../storage.js";
import { install, installHint, onHintChange } from "../install.js";
import { listenForGestures } from "../gestures.js";
import { sized } from "../textures.js";
import { checkForUpdate, update, versionLabel } from "../update.js";
import { W, backdrop, button, inside, setupCamera, text, woodSign } from "../ui.js";

const PLAY = { x: W / 2 - 150, y: 410, w: 300, h: 90 };
const SCORES = { x: W / 2 - 110, y: 524, w: 220, h: 56 };
const INSTALL = { x: 40, y: 906, w: W - 80, h: 34 }; // the install hint, or the update button
const VERSION_AREA = { x: 60, y: 940, w: W - 120, h: 20 };
// ?run=3 starts on run 3, for trying out the later runs.
const START_RUN = Math.max(0, (parseInt(new URLSearchParams(location.search).get("run"), 10) || 1) - 1);

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    setupCamera(this);
    backdrop(this);

    woodSign(this, W / 2, 210, 470, 180);
    text(this, W / 2, 168, "SKIING", 66, { color: "#ffffff", strokeThickness: 10 });
    text(this, W / 2, 244, "FRENZY", 66, { color: "#ff5a5a", strokeThickness: 10 });
    text(this, W / 2, 334, "Santa's sleigh is broken. SKI!", 26, { color: "#ffffff", strokeThickness: 6 });

    // Santa swooshing back and forth down the snow, a kid waving for a present.
    const santa = sized(this.add.image(W / 2, 800, "santa-turn"), 1.25).setOrigin(0.5, 1);
    this.tweens.add({
      targets: santa, x: { from: W / 2 - 120, to: W / 2 + 120 }, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      onYoyo: () => santa.setFlipX(true), onRepeat: () => santa.setFlipX(false),
    });
    const kid = sized(this.add.image(W - 80, 870, "kid-1"), 1).setOrigin(0.5, 1);
    this.tweens.add({ targets: kid, y: 856, duration: 260, yoyo: true, repeat: -1 });

    // Who is playing (tap to change initials), and sound on or off (tap to change).
    const badge = this.add.graphics();
    badge.fillStyle(0x000000, 0.3).fillRoundedRect(W - 128, 18, 110, 62, 14);
    text(this, W - 73, 46, store.get("player").initials, 34, { color: "#ffe066" });
    text(this, W - 73, 96, "CHANGE", 13, { color: "#ffffff", strokeThickness: 3 });
    this.meArea = { x: W - 140, y: 0, w: 140, h: 120 };
    this.soundText = text(this, 22, 40, "", 18, { originX: 0, color: "#ffffff" });
    this.soundArea = { x: 0, y: 0, w: 150, h: 90 };
    this.showSound();

    const best = store.topScore();
    const challenge = store.get("challenge");
    if (challenge) {
      const banner = text(this, W / 2, 380, `${challenge.initials} DARES YOU: BEAT ${challenge.score.toLocaleString()}!`, 24, { color: "#7CFC9A" });
      this.tweens.add({ targets: banner, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
    } else if (best) {
      text(this, W / 2, 380, `YOUR BEST  ${best.toLocaleString()}`, 20, { color: "#ffffff", strokeThickness: 4 });
    }

    const go = button(this, PLAY, 0x2a9d3a, "▶ PLAY", 46);
    this.tweens.add({ targets: go.label, scale: 1.1, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    button(this, SCORES, 0x2a6f9d, "HIGH SCORES", 24);
    this.installBox = this.add.graphics();
    this.installText = text(this, W / 2, INSTALL.y + INSTALL.h / 2, "", 17, { color: "#ffffff", strokeThickness: 3 });
    this.versionText = text(this, W / 2, 951, versionLabel(), 12, { color: "#ffffff", strokeThickness: 2 });
    this.showInstall();
    onHintChange(() => this.scene.isActive() && this.showInstall());
    this.lookForUpdate(false);
    // Coming back to the game from another app checks again: a phone often keeps the game open for days.
    const back = () => !document.hidden && this.lookForUpdate(false);
    document.addEventListener("visibilitychange", back);
    this.events.once("shutdown", () => document.removeEventListener("visibilitychange", back));

    listenForGestures(this, {
      lockMs: 800, // a tap left over from the last screen can't press anything here
      onSwipe: (dir) => {
        if (dir === "up") this.play();
        else if (dir === "down") this.scene.start("Board");
      },
      onTap: (x, y) => {
        if (inside(x, y, this.meArea)) this.scene.start("Name");
        else if (this.hint?.update && inside(x, y, INSTALL)) this.runUpdate();
        else if (this.hint?.tap && inside(x, y, INSTALL)) install();
        else if (this.hint?.link && inside(x, y, INSTALL)) window.open(this.hint.link, "_blank");
        else if (inside(x, y, VERSION_AREA)) this.lookForUpdate(true);
        else if (inside(x, y, this.soundArea)) this.toggleSound();
        else if (inside(x, y, PLAY)) this.play();
        else if (inside(x, y, SCORES)) this.scene.start("Board");
      },
    });
  }

  play() {
    audio.unlock();
    audio.play("ho");
    this.scene.start("Day", { run: START_RUN, score: 0, gifts: 0 });
  }

  // Asks the site whether a newer release is out. `asked` is a tap on the version, which gets an answer.
  async lookForUpdate(asked) {
    if (asked) this.versionText.setText("checking for an update…");
    const newer = await checkForUpdate();
    if (!this.scene.isActive()) return;
    this.updateReady = newer === true;
    this.showInstall();
    if (!asked) return;
    const answer = newer === null ? "couldn't check (no signal?)" : newer ? "an update is ready" : "you have the latest version ✓";
    this.versionText.setText(answer);
    this.time.delayedCall(2500, () => this.versionText.setText(versionLabel()));
  }

  runUpdate() {
    this.installText.setText("⏳ UPDATING…");
    this.hint = null;
    update();
  }

  // "Install me", while the game is playing in a browser tab on a phone (js/install.js), or the
  // update button when a newer release is out.
  showInstall() {
    this.hint = this.updateReady ? { words: "⬆ NEW VERSION! TAP TO UPDATE", tap: true, update: true } : installHint();
    this.installBox.clear();
    this.installText.setText(this.hint?.words ?? "");
    if (!this.hint || this.hint.link) return; // the install link is plain small words, no box
    this.installBox.fillStyle(this.hint.update ? 0xe07a1f : this.hint.tap ? 0x2a9d8f : 0x000000, this.hint.tap ? 1 : 0.3);
    this.installBox.fillRoundedRect(INSTALL.x, INSTALL.y, INSTALL.w, INSTALL.h, 17);
  }

  toggleSound() {
    const on = !store.get("sound");
    store.set("sound", on);
    audio.setEnabled(on);
    this.showSound();
    audio.play("pop");
  }

  showSound() {
    this.soundText.setText(store.get("sound") ? "SOUND ON" : "SOUND OFF");
  }
}
