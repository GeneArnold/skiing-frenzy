// Stand-in art drawn in code, until the cartoon pictures are made: Santa, the kids, everything on the
// slope, the pick-ups. A picture in img/ with the same name replaces any of these (BootScene loads
// them first), shown at the stand-in's height.

const SIZE = {}; // each stand-in's size: a picture of any size is shown at this height

function make(scene, key, w, h, draw) {
  SIZE[key] = { w, h };
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Scales a picture so it shows at its stand-in's height, times `scale`.
export function sized(img, scale = 1) {
  const want = SIZE[img.texture.key];
  if (!want) return img.setScale(scale);
  return img.setScale((scale * want.h) / img.frame.height);
}

const INK = 0x1b2440;
const RED = 0xd62828;
const FUR = 0xffffff;
const SKIN = 0xffcfa8;

export function makeTextures(scene) {
  // Santa skiing toward you: skis, boots, round red body, belt, beard, hat. lean: -1 left, 1 right.
  const santa = (g, w, h, { lean = 0, arms = false, sack = true } = {}) => {
    const cx = w / 2 + lean * 6;
    // skis, pointing at you
    g.fillStyle(INK).fillRoundedRect(cx - 26 + lean * 8, h - 40, 16, 40, 6).fillRoundedRect(cx + 10 + lean * 8, h - 40, 16, 40, 6);
    g.fillStyle(RED).fillRoundedRect(cx - 23 + lean * 8, h - 37, 10, 34, 4).fillRoundedRect(cx + 13 + lean * 8, h - 37, 10, 34, 4);
    // sack peeking over a shoulder
    if (sack) g.fillStyle(INK).fillCircle(cx + 24, h - 92, 22).fillStyle(0xa0703c).fillCircle(cx + 24, h - 92, 19);
    // body
    g.fillStyle(INK).fillEllipse(cx, h - 62, 66, 64);
    g.fillStyle(RED).fillEllipse(cx, h - 62, 60, 58);
    g.fillStyle(INK).fillRect(cx - 30, h - 62, 60, 9);
    g.fillStyle(0xf2c230).fillRect(cx - 7, h - 63, 14, 11);
    // poles and mittens
    g.lineStyle(3, INK);
    if (arms) {
      g.lineBetween(cx - 30, h - 80, cx - 44, h - 118).lineBetween(cx + 30, h - 80, cx + 44, h - 118);
      g.fillStyle(INK).fillCircle(cx - 44, h - 118, 7).fillCircle(cx + 44, h - 118, 7);
    } else {
      g.lineBetween(cx - 32, h - 56, cx - 40, h - 8).lineBetween(cx + 32, h - 56, cx + 40, h - 8);
      g.fillStyle(INK).fillCircle(cx - 32, h - 58, 7).fillCircle(cx + 32, h - 58, 7);
    }
    // head and beard
    g.fillStyle(INK).fillCircle(cx, h - 104, 20);
    g.fillStyle(SKIN).fillCircle(cx, h - 104, 17);
    g.fillStyle(INK).fillEllipse(cx, h - 90, 38, 30);
    g.fillStyle(FUR).fillEllipse(cx, h - 90, 34, 26);
    g.fillStyle(INK).fillCircle(cx - 6, h - 108, 2.5).fillCircle(cx + 6, h - 108, 2.5);
    g.fillStyle(0xf28b82).fillCircle(cx, h - 101, 4);
    // hat
    g.fillStyle(INK).fillTriangle(cx - 20, h - 116, cx + 20, h - 116, cx - 12 * lean + 14, h - 146);
    g.fillStyle(RED).fillTriangle(cx - 16, h - 118, cx + 16, h - 118, cx - 12 * lean + 14, h - 142);
    g.fillStyle(FUR).fillRoundedRect(cx - 21, h - 122, 42, 9, 4).fillCircle(cx - 12 * lean + 14, h - 144, 6);
  };
  make(scene, "santa", 100, 150, (g, w, h) => santa(g, w, h));
  make(scene, "santa-turn", 100, 150, (g, w, h) => santa(g, w, h, { lean: 1 })); // leaning to the right of the screen
  make(scene, "santa-jump", 100, 150, (g, w, h) => santa(g, w, h, { arms: true }));
  make(scene, "santa-crash", 120, 150, (g, w, h) => {
    // a heap in the snow: crossed skis, legs up, hat off
    g.lineStyle(10, INK).lineBetween(14, h - 20, w - 14, h - 52).lineBetween(14, h - 52, w - 14, h - 20);
    g.lineStyle(6, RED).lineBetween(16, h - 21, w - 16, h - 51).lineBetween(16, h - 51, w - 16, h - 21);
    g.fillStyle(INK).fillEllipse(w / 2, h - 50, 74, 50);
    g.fillStyle(RED).fillEllipse(w / 2, h - 50, 68, 44);
    g.fillStyle(INK).fillCircle(w / 2 - 14, h - 76, 18);
    g.fillStyle(SKIN).fillCircle(w / 2 - 14, h - 76, 15);
    g.fillStyle(FUR).fillEllipse(w / 2 - 14, h - 64, 30, 18);
    g.lineStyle(2, INK).strokeCircle(w / 2 - 19, h - 80, 3).strokeCircle(w / 2 - 9, h - 80, 3); // dizzy eyes
    g.fillStyle(RED).fillTriangle(w / 2 + 20, h - 100, w / 2 + 44, h - 92, w / 2 + 30, h - 120);
    g.fillStyle(FUR).fillCircle(w / 2 + 30, h - 120, 5);
  });

  // Kids in winter coats, seven looks; arms up waiting for a gift.
  const COATS = [0x2a9d8f, 0x7b2cbf, 0xf4a261, 0x3a86ff];
  const HATS = [0xe63946, 0xffd166, 0x06d6a0, 0xff70a6];
  for (let i = 0; i < 7; i++) {
    make(scene, `kid-${i + 1}`, 60, 90, (g, w, h) => {
      const cx = w / 2;
      g.fillStyle(INK).fillRoundedRect(cx - 14, h - 22, 11, 22, 4).fillRoundedRect(cx + 3, h - 22, 11, 22, 4);
      g.fillStyle(INK).fillRoundedRect(cx - 19, h - 56, 38, 40, 12);
      g.fillStyle(COATS[i % 4]).fillRoundedRect(cx - 16, h - 53, 32, 34, 10);
      g.lineStyle(6, INK).lineBetween(cx - 16, h - 48, cx - 26, h - 74).lineBetween(cx + 16, h - 48, cx + 26, h - 74);
      g.lineStyle(4, COATS[i % 4]).lineBetween(cx - 16, h - 48, cx - 26, h - 74).lineBetween(cx + 16, h - 48, cx + 26, h - 74);
      g.fillStyle(INK).fillCircle(cx, h - 64, 14);
      g.fillStyle(SKIN).fillCircle(cx, h - 64, 12);
      g.fillStyle(INK).fillCircle(cx - 4, h - 66, 2).fillCircle(cx + 4, h - 66, 2);
      g.lineStyle(2, INK).beginPath().arc(cx, h - 62, 5, 0.2, Math.PI - 0.2).strokePath();
      g.fillStyle(HATS[i % 4]).fillEllipse(cx, h - 74, 28, 14).fillCircle(cx, h - 82, 5);
    });
  }

  make(scene, "tree", 90, 130, (g, w, h) => {
    g.fillStyle(INK).fillRect(w / 2 - 8, h - 24, 16, 24);
    g.fillStyle(0x6b3e1e).fillRect(w / 2 - 5, h - 22, 10, 22);
    for (const [y, half, top] of [[h - 22, 44, h - 72], [h - 52, 36, h - 98], [h - 80, 26, h - 126]]) {
      g.fillStyle(INK).fillTriangle(w / 2 - half, y, w / 2 + half, y, w / 2, top);
      g.fillStyle(0x2d6a4f).fillTriangle(w / 2 - half + 5, y - 3, w / 2 + half - 5, y - 3, w / 2, top + 6);
      g.fillStyle(FUR).fillTriangle(w / 2 - half * 0.45, top + (y - top) * 0.45, w / 2 + half * 0.45, top + (y - top) * 0.45, w / 2, top + 8);
    }
  });
  make(scene, "rock", 70, 58, (g, w, h) => {
    g.fillStyle(INK).fillEllipse(w / 2, h / 2 + 4, w - 2, h - 8);
    g.fillStyle(0x8d99ae).fillEllipse(w / 2, h / 2 + 4, w - 8, h - 14);
    g.fillStyle(FUR).fillEllipse(w / 2, h / 2 - 6, w - 24, 14);
  });
  make(scene, "snowman", 70, 110, (g, w, h) => {
    for (const [y, r] of [[h - 26, 26], [h - 64, 19], [h - 92, 14]]) g.fillStyle(INK).fillCircle(w / 2, y, r + 3).fillStyle(FUR).fillCircle(w / 2, y, r);
    g.fillStyle(INK).fillRect(w / 2 - 14, h - 108, 28, 4).fillRect(w / 2 - 9, h - 124, 18, 18);
    g.fillStyle(INK).fillCircle(w / 2 - 5, h - 95, 2).fillCircle(w / 2 + 5, h - 95, 2);
    g.fillStyle(0xf77f00).fillTriangle(w / 2, h - 90, w / 2, h - 86, w / 2 + 14, h - 88);
    g.fillStyle(RED).fillRect(w / 2 - 16, h - 80, 32, 7);
  });
  make(scene, "ice", 110, 56, (g, w, h) => {
    g.fillStyle(0x9ad1f0).fillEllipse(w / 2, h / 2, w, h);
    g.fillStyle(0xd8f1ff).fillEllipse(w / 2 - 10, h / 2 - 6, w - 40, h - 30);
    g.lineStyle(2, FUR).lineBetween(w / 2 + 14, h / 2 - 10, w / 2 + 28, h / 2 + 2);
  });
  make(scene, "reindeer", 110, 100, (g, w, h) => {
    g.fillStyle(INK).fillRect(26, h - 36, 8, 36).fillRect(42, h - 36, 8, 36).fillRect(66, h - 36, 8, 36).fillRect(80, h - 36, 8, 36);
    g.fillStyle(INK).fillEllipse(56, h - 46, 74, 38);
    g.fillStyle(0x8b5a2b).fillEllipse(56, h - 46, 68, 32);
    g.fillStyle(INK).fillEllipse(92, h - 70, 30, 26);
    g.fillStyle(0x8b5a2b).fillEllipse(92, h - 70, 25, 21);
    g.fillStyle(0xe63946).fillCircle(104, h - 66, 5); // a red nose, for fun
    g.lineStyle(3, 0x5a3a1e).lineBetween(86, h - 80, 78, h - 98).lineBetween(80, h - 90, 72, h - 94).lineBetween(96, h - 80, 100, h - 98);
  });
  make(scene, "cocoa", 56, 56, (g, w, h) => {
    g.fillStyle(INK).fillRoundedRect(6, 14, 36, 40, 6);
    g.fillStyle(RED).fillRoundedRect(9, 17, 30, 34, 5);
    g.lineStyle(6, INK).strokeCircle(44, 32, 9);
    g.lineStyle(3, RED).strokeCircle(44, 32, 9);
    g.fillStyle(FUR).fillEllipse(24, 14, 34, 14).fillCircle(24, 8, 7);
  });
  // The snow, a tile that repeats down the slope: soft blue bumps and sparkles.
  if (!scene.textures.exists("snow")) {
    const g = scene.make.graphics({ add: false });
    for (let i = 0; i < 26; i++) {
      const x = (i * 211) % 540;
      const y = (i * 137) % 400;
      g.fillStyle(0xdde8f7, 0.8).fillEllipse(x, y, 60 + (i % 3) * 20, 14);
      g.fillStyle(0xffffff).fillEllipse(x - 4, y - 3, 44 + (i % 3) * 14, 7);
    }
    g.fillStyle(0xbfd4f0);
    for (let i = 0; i < 40; i++) g.fillCircle((i * 97) % 540, (i * 71) % 400, 1.5);
    g.generateTexture("snow", 540, 400);
    g.destroy();
  }

  // a soft warm glow, added over the dusk and the dark where there's a light
  make(scene, "glow", 120, 120, (g, w, h) => {
    for (let r = 60; r > 0; r -= 4) g.fillStyle(0xffc860, 0.05 + (1 - r / 60) * 0.12).fillCircle(w / 2, h / 2, r);
  });

  make(scene, "gift", 44, 44, (g, w, h) => {
    g.fillStyle(INK).fillRect(4, 12, 36, 30);
    g.fillStyle(RED).fillRect(7, 15, 30, 24);
    g.fillStyle(0x2a9d3a).fillRect(19, 15, 6, 24).fillRect(7, 24, 30, 6);
    g.fillStyle(0x2a9d3a).fillEllipse(15, 10, 14, 10).fillEllipse(29, 10, 14, 10);
  });
}
