// Loads any finished cartoon pictures, draws the stand-ins for the rest, then opens the game.
import * as sayings from "../sayings.js";
import * as store from "../storage.js";
import { readChallenge } from "../share.js";
import { makeTextures } from "../textures.js";
import { H, W, setupCamera, text } from "../ui.js";

// The cartoon pictures in img/ (made with tools/swarm.py and tools/cutout.py), by texture key.
// Add a name here once its picture is in img/ (and in FILES in sw.js); until then the drawing in
// js/textures.js stands in for it.
export const SPRITES = [
  "santa", "santa-turn", "santa-jump", "santa-crash",
  "tree", "rock", "snowman", "reindeer", "ice", "cocoa", "gift",
  "kid-1", "kid-2", "kid-3", "kid-4", "kid-5", "kid-6", "kid-7",
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    setupCamera(this);
    const status = text(this, W / 2, H / 2, "Waxing the skis...", 28);
    for (const key of SPRITES) this.load.image(key, `img/${key}.png`);
    this.load.json("sayings", "sayings/sayings.json");
    this.load.on("progress", (v) => status.setText(`Waxing the skis... ${Math.round(v * 100)}%`));
    this.load.on("loaderror", (file) => console.warn("Could not load", file.src));
  }

  create() {
    sayings.setData(this.cache.json.get("sayings") || {});
    makeTextures(this);
    readChallenge();
    this.scene.start(store.get("player") ? "Title" : "Name");
  }
}
