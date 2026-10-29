# Skiing Frenzy

It's Christmas Eve and Santa has to ski down the mountain, handing gifts to the kids playing on the
slopes along the way. Steer around trees, slide on ice, hop rocks and creeks, and grab hot cocoa for
an extra Santa. Each run ends at a little village at the bottom, and the next run is a bit faster.

A Fun Shed game: plain HTML and JavaScript with [Phaser 3.90](https://phaser.io) saved in
`vendor/`. There is no build step, it installs on phones as an app, and it plays offline.

## Run it on a computer

```
python3 tools/serve.py
```

Open http://127.0.0.1:8798 (or `http://<this computer's address>:8798` on a phone on the home
network). Arrow keys steer and space jumps. `?run=3` starts on run 3.

## How it plays

- Buttons along the bottom: `◀  JUMP  ▶`. Tap an arrow for a small step, hold it to glide.
  Tap JUMP for a hop; hold and let go for a big jump.
- Ski close to a kid and a gift pops into their arms.
- Hit a tree and you lose a Santa. Three Santas to start; cocoa gives one back.

## Files

- `js/rules.js`: every number (runs, speeds, points). `js/course.js`: lays out the slope with a
  guaranteed way through (`node tools/test-course.mjs` checks it).
- `js/scenes/PlayScene.js`: the run. `img/`: the cartoon art; `sayings/`: the voices.
- `tools/`: the art prompts, cut-out tools, voice maker and icon maker.

## License

MIT. Voices made with Chatterbox TTS; art made with Z-Image Turbo.
