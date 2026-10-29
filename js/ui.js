// Fun Shed kit v1.4 (Skiing Frenzy: the signs wear snow, and the backdrop is a snowy mountain)
// Small pieces of screen shared by the scenes: text styles, signs, buttons, floating points.
export const W = 540;
export const H = 960;
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// The game's own colours for the shared pieces. A game sets these once in main.js
// (THEME.outline = 0x1b1030, say) rather than changing this file.
export const THEME = { outline: 0x2b1d14 }; // the dark edge round words and buttons
const hex = (c) => "#" + c.toString(16).padStart(6, "0");

// The game is laid out on a 540 x 960 screen but drawn at twice that, so it stays sharp on phones.
// Every scene calls this first; positions everywhere are in the 540 x 960 layout.
export const ZOOM = 2;
export function setupCamera(scene) {
  scene.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
}

// Where a finger is, in the 540 x 960 layout.
export function fingerAt(scene, pointer) {
  const p = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  return { x: p.x, y: p.y, t: performance.now() };
}

// Scales a picture to a height, so a picture of any size drops in.
export function fit(img, height) {
  return img.setScale(height / img.frame.height);
}

export function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function text(scene, x, y, str, size = 28, opts = {}) {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: opts.bold === false ? "normal" : "bold",
      color: opts.color || "#ffffff",
      stroke: opts.stroke || hex(THEME.outline),
      strokeThickness: opts.strokeThickness ?? Math.round(size / 6),
      align: "center",
      resolution: ZOOM,
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

export function floatText(scene, x, y, words, colour = "#ffe066", size = 30) {
  const t = text(scene, x, y, words, size, { color: colour }).setDepth(9000);
  scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  return t;
}

// A big plain button with words on it. r: { x, y, w, h }.
export function button(scene, r, colour, words, size = 32) {
  const g = scene.add.graphics();
  g.fillStyle(THEME.outline).fillRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 24);
  g.fillStyle(colour).fillRoundedRect(r.x, r.y, r.w, r.h, 20);
  const label = text(scene, r.x + r.w / 2, r.y + r.h / 2, words, size);
  return { g, label };
}

// A wooden sign with snow on top, to put words on.
export function woodSign(scene, x, y, w, h) {
  const g = scene.add.graphics();
  g.fillStyle(0x5a3a1e);
  g.fillRoundedRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 14);
  g.fillStyle(0x9a6434);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
  g.lineStyle(2, 0x7d4f27);
  for (let ly = y - h / 2 + h / 4; ly < y + h / 2; ly += h / 4) g.lineBetween(x - w / 2 + 6, ly, x + w / 2 - 6, ly);
  g.fillStyle(0x3b2a1e);
  for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillCircle(x + nx * (w / 2 - 12), y + ny * (h / 2 - 12), 4);
  // a cap of snow along the top, and a few icicles
  const top = y - h / 2 - 6;
  g.fillStyle(0xffffff);
  g.fillRoundedRect(x - w / 2 - 10, top - 10, w + 20, 20, 10);
  for (let i = 0; i < 9; i++) g.fillCircle(x - w / 2 + (i + 0.5) * (w / 9), top - 6 - ((i * 7) % 3) * 3, 12);
  g.fillStyle(0xd8f1ff);
  for (let i = 1; i < 8; i += 2) {
    const ix = x - w / 2 + i * (w / 8);
    g.fillTriangle(ix - 6, y + h / 2 + 4, ix + 6, y + h / 2 + 4, ix, y + h / 2 + 22 + (i % 3) * 6);
  }
  return g;
}

// A speech bubble with no tail, its bottom-left corner at (left, bottom). → [graphics, words]
export function speech(scene, left, bottom, words, size = 20, wrap = 260) {
  const label = text(scene, 0, 0, words, size, { color: hex(THEME.outline), strokeThickness: 0, wrap });
  const w = label.width + 28;
  const h = label.height + 18;
  label.setPosition(left + w / 2, bottom - h / 2);
  const g = scene.add.graphics();
  g.fillStyle(0xffffff).lineStyle(3, THEME.outline);
  g.fillRoundedRect(left, bottom - h, w, h, 16);
  g.strokeRoundedRect(left, bottom - h, w, h, 16);
  return [g, label];
}

// The snowy mountain behind the menu screens (a stand-in until the real art is made), with snow
// falling.
export function backdrop(scene) {
  if (scene.textures.exists("bg-title")) {
    const img = scene.add.image(W / 2, H / 2, "bg-title");
    img.setScale(Math.max(W / img.width, H / img.height));
  } else {
    const g = scene.add.graphics();
    g.fillGradientStyle(0x1b3a6b, 0x1b3a6b, 0x8fb8e8, 0x8fb8e8, 1);
    g.fillRect(0, 0, W, H);
    // mountains: blue-grey with snowy tops
    for (const [x, y, s, c] of [[90, 560, 1.1, 0x5c7aa8], [430, 520, 1.3, 0x4a6896], [270, 610, 1.0, 0x6e8cba]]) {
      g.fillStyle(c).fillTriangle(x - 260 * s, 760, x + 260 * s, 760, x, y - 240 * s);
      g.fillStyle(0xffffff).fillTriangle(x - 70 * s, y - 240 * s + 90 * s, x + 70 * s, y - 240 * s + 90 * s, x, y - 240 * s);
    }
    g.fillStyle(0xf4f8ff).fillEllipse(W / 2, 880, 900, 420);
    // pine trees on the snow
    for (const [x, y, s] of [[40, 720, 1], [500, 700, 1.2], [110, 760, 0.8], [440, 770, 0.9]]) {
      g.fillStyle(0x1b4332).fillTriangle(x - 34 * s, y, x + 34 * s, y, x, y - 110 * s);
      g.fillStyle(0xffffff).fillTriangle(x - 12 * s, y - 70 * s, x + 12 * s, y - 70 * s, x, y - 110 * s);
    }
    // stars
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 30; i++) g.fillCircle((i * 157) % W, (i * 89) % 300, 1.5);
  }
  snowfall(scene);
}

// Gentle snow drifting down over a screen. count: how many flakes; wind: px a second sideways; fall:
// how fast (1 = gentle). A blizzard is lots of fast flakes in a strong wind.
export function snowfall(scene, depth = 8000, { count = 40, wind = 0, fall = 1 } = {}) {
  const flakes = Array.from({ length: count }, () =>
    scene.add.circle(Math.random() * W, Math.random() * H, 1.5 + Math.random() * 2.5, 0xffffff, 0.85).setDepth(depth));
  const drift = (_, ms) => {
    for (const f of flakes) {
      f.y += (f.radius * 14 * fall * ms) / 1000;
      f.x += Math.sin((f.y + f.radius * 100) / 60) * 0.4 + (wind * f.radius * ms) / 3000;
      if (f.y > H + 5) f.setPosition(Math.random() * W, -5);
      if (f.x > W + 5) f.setPosition(-5, Math.random() * H);
      if (f.x < -5) f.setPosition(W + 5, Math.random() * H);
    }
  };
  scene.events.on("update", drift);
  scene.events.once("shutdown", () => scene.events.off("update", drift));
}
