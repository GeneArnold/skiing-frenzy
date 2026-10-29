// Fun Shed kit v1.4
// After a game: the score, how far down the mountain Santa got, where it landed on the board, and a dare's
// outcome. Scores stay on this phone. Big buttons: PLAY AGAIN, TRASH TALK,
// HIGH SCORES, MENU.
import * as audio from "../audio.js";
import * as store from "../storage.js";
import { shareRun, snapshot } from "../share.js";
import { listenForGestures } from "../gestures.js";
import { sized } from "../textures.js";
import { W, backdrop, button, inside, setupCamera, text, woodSign } from "../ui.js";

const AGAIN = { x: W / 2 - 170, y: 590, w: 340, h: 84 };
const SHARE = { x: W / 2 - 170, y: 696, w: 340, h: 70 };
const BOARD = { x: W / 2 - 170, y: 790, w: 160, h: 60 };
const MENU = { x: W / 2 + 10, y: 790, w: 160, h: 60 };

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super("Results");
  }

  create({ score, reached, gifts, finished, rank, previousTop, challenge }) {
    setupCamera(this);
    backdrop(this);
    this.run = { score, gifts };
    const me = store.get("player");

    woodSign(this, W / 2, 200, 470, 300);
    text(this, W / 2, 90, "WIPEOUT!", 50, { color: "#ffe066" });
    const how = `${me.initials} · wiped out on RUN ${reached}`;
    text(this, W / 2, 136, how, 22, { color: "#fff3c4", strokeThickness: 4 });
    const scoreText = text(this, W / 2, 212, "0", 90, { color: "#ffffff", strokeThickness: 10 });
    const countUp = Math.min(1200, 200 + score / 4);
    this.tweens.addCounter({
      from: 0, to: score, duration: countUp, ease: "Cubic.easeOut",
      onUpdate: (t) => scoreText.setText(Math.round(t.getValue()).toLocaleString()),
    });

    // The headline: a dare's outcome first, then a new high score, then the board.
    let headline;
    let colour = "#ffe066";
    let cheer = score > 0;
    if (challenge) {
      const won = score > challenge.score;
      headline = won ? `YOU BEAT ${challenge.initials}!` : `${challenge.initials} STILL RULES (${challenge.score.toLocaleString()})`;
      colour = won ? "#7CFC9A" : "#ff9e9e";
      cheer = won;
      store.set("challenge", null);
    } else if (score > previousTop && score > 0) {
      headline = "NEW HIGH SCORE!";
      colour = "#7CFC9A";
    } else if (rank) {
      headline = `#${rank} ON THIS PHONE`;
    } else {
      headline = `YOUR BEST ${previousTop.toLocaleString()}`;
      cheer = false;
    }
    const head = text(this, W / 2, 296, headline, 30, { color: colour, strokeThickness: 6 });
    if (colour === "#7CFC9A") this.tweens.add({ targets: head, scale: 1.1, duration: 450, yoyo: true, repeat: -1 });
    audio.play(cheer ? "cheer" : "groan");

    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.35).fillRoundedRect(70, 380, W - 140, 160, 20);
    sized(this.add.image(120, 422, "gift"), 1);
    text(this, 150, 422, "Presents given", 26, { originX: 0, strokeThickness: 5 });
    text(this, W - 100, 422, String(gifts), 32, { originX: 1, color: "#ffe066", strokeThickness: 5 });
    sized(this.add.image(120, 494, "santa"), 0.3);
    text(this, 150, 494, "Runs finished", 26, { originX: 0, strokeThickness: 5 });
    text(this, W - 100, 494, String(finished), 32, { originX: 1, color: "#ffe066", strokeThickness: 5 });

    const buttons = [
      [AGAIN, 0x2a9d3a, "▶ PLAY AGAIN", 38],
      [SHARE, 0xe63946, "📣 TRASH TALK", 30],
      [BOARD, 0x2a6f9d, "HIGH SCORES", 20],
      [MENU, 0x7d5a3c, "MENU", 24],
    ];
    this.buttonsShown = buttons.map(([r, c, words, size]) => button(this, r, c, words, size));
    this.shareText = this.buttonsShown[1].label;

    // The share picture is this screen, taken once the score has finished counting up.
    this.time.delayedCall(countUp + 150, () => snapshot(this.game).then((png) => (this.picture = png)));

    listenForGestures(this, {
      lockMs: 900,
      onTap: (x, y) => {
        if (inside(x, y, AGAIN)) this.again();
        else if (inside(x, y, SHARE)) this.share();
        else if (inside(x, y, BOARD)) this.scene.start("Board");
        else if (inside(x, y, MENU)) this.scene.start("Title");
      },
      onSwipe: (dir) => dir === "up" && this.again(),
    });
  }

  again() {
    audio.play("ho");
    this.scene.start("Day", { run: 0, score: 0, gifts: 0 });
  }

  async share() {
    audio.play("pop");
    const outcome = await shareRun({ ...this.run, picture: this.picture || null });
    if (outcome !== "cancelled") this.shareText.setText("📣 SENT! AGAIN?");
  }
}
