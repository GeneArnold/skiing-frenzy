// Fun Shed kit v1.4
// The high scores, arcade style: a top 10 with the run each Santa wiped out on. BACK (or any
// swipe) goes back to the title. Scores stay on this phone: to get on its board, you play on it.
import * as store from "../storage.js";
import { listenForGestures } from "../gestures.js";
import { H, W, backdrop, button, inside, setupCamera, text, woodSign } from "../ui.js";

const BACK = { x: W / 2 - 80, y: H - 76, w: 160, h: 56 };

const MEDALS = ["#ffd700", "#e8eef5", "#e0995e"];

export class BoardScene extends Phaser.Scene {
  constructor() {
    super("Board");
  }

  create() {
    setupCamera(this);
    backdrop(this);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.3).setOrigin(0);
    woodSign(this, W / 2, 90, 420, 120);
    text(this, W / 2, 72, "HIGH SCORES", 46, { color: "#ffe066" });
    text(this, W / 2, 120, "ON THIS PHONE", 16, { color: "#fff3c4", strokeThickness: 3 });
    this.content = this.add.container(0, 0);
    button(this, BACK, 0x7d5a3c, "BACK", 26);
    this.drawScores(store.board());

    listenForGestures(this, {
      onSwipe: () => this.scene.start("Title"),
      onTap: (x, y) => inside(x, y, BACK) && this.scene.start("Title"),
    });
  }

  drawScores(rows) {
    this.content.removeAll(true);
    const me = store.get("player");
    if (rows.length === 0) {
      this.content.add(text(this, W / 2, 440, "Nobody yet.\nGo on, ski!", 34));
      return;
    }
    this.content.add(text(this, 300, 186, "WIPED OUT ON", 14, { color: "#fff3c4", strokeThickness: 3 }));
    rows.slice(0, 10).forEach((r, i) => {
      const y = 230 + i * 64;
      const mine = r.initials === me.initials;
      const colour = MEDALS[i] || (mine ? "#7CFC9A" : "#ffffff");
      if (mine) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 0.16).fillRoundedRect(36, y - 27, W - 72, 54, 12);
        this.content.add(g);
      }
      this.content.add(text(this, 92, y, `${i + 1}`, 32, { color: colour, originX: 1 }));
      this.content.add(text(this, 124, y, r.initials, 36, { color: colour, originX: 0 }));
      if (r.run) this.content.add(text(this, 300, y, `RUN ${r.run}`, 22, { color: "#fff3c4" }));
      this.content.add(text(this, W - 50, y, r.score.toLocaleString(), 34, { color: colour, originX: 1 }));
    });
  }
}
