# The prompts behind the cartoon art, so any picture can be made again. Each line runs tools/swarm.py.
#   python3 tools/art-prompts.py santa [straight turn jump crash]   Santa's poses, one picture each
#   python3 tools/art-prompts.py kids         a sheet of kids playing in the snow, waiting for gifts
#   python3 tools/art-prompts.py things [tree rock ...]   things on the slope, one each
#   python3 tools/art-prompts.py edges [birch fence ...]   the scenery along the sides, one set per area
#   python3 tools/art-prompts.py backdrop   the picture behind the title and menu screens (portrait)
#   python3 tools/art-prompts.py houses [red blue ...]   the village cottages at the bottom of a run
#   add --n 4 for more tries of each (default 3)
# Tries land in art/source/gen/; tools/cutout.py turns the picks into img/ sprites.
import subprocess
import sys

N = sys.argv[sys.argv.index("--n") + 1] if "--n" in sys.argv else "3"

# Santa (Gene picked look "B" on 2026-10-29: white fur down the middle of his jacket). Each pose is its
# own picture so every one gets two skis and two poles. The camera looks down the hill from in front,
# so Santa skis toward the viewer.
SANTA = ("a single jolly chubby cartoon Santa Claus on skis, red suit with a strip of white fur trim down "
         "the middle of his jacket and white fur on the cuffs and hem, black belt with a gold buckle, big "
         "fluffy white beard and moustache, rosy cheeks, red hat with a white pompom, black boots, a brown "
         "sack of presents over his shoulder, a wooden ski pole in each hand, a red ski on each foot, "
         "two skis and two poles, ")
POSES = {
    "straight": "front view, skiing straight toward the viewer, both skis pointing at the viewer, knees bent, grinning",
    "turn": "front three-quarter view, leaning to his left carving a turn, both skis angled sideways together, snow spraying from the skis, grinning",
    # these two put the pose first, or the model just draws him standing
    "jump": "FIRST: mid-air jump, flying high above the snow with a big gap and a shadow on the snow far below him, knees tucked up, both skis together, arms flung up in joy, laughing. ",
    "crash": "FIRST: a funny wipeout, tumbled over and sitting in a heap in a pile of snow, legs sticking up in the air, both skis crossed in an X, both poles lying in the snow, hat fallen over one eye, dizzy cartoon stars spinning round his head. ",
}

KIDS = ("character sheet of four different happy cartoon kids in the snow in puffy winter coats, mittens, "
        "scarves and woolly hats with pompoms, each kid a different look and different bright coat colour. "
        "Four kids side by side in a row with wide white space between them, not touching, not overlapping, "
        "the same size, all standing and facing the viewer, all excited and waving both arms in the air "
        "calling out: 1 a little girl with pigtails, 2 a boy with glasses, 3 a girl with curly hair, "
        "4 a small boy with freckles")

ONE = ", seen from slightly above, simple and clean, no shadow, no ground"
THINGS = {
    "tree": "a single snowy green pine tree, snow on its branches" + ONE,
    "rock": "a single grey boulder with a cap of snow on top" + ONE,
    "snowman": "a single goofy snowman with a carrot nose, a top hat and a red scarf, stick arms" + ONE,
    "reindeer": "a single friendly goofy cartoon reindeer with big antlers, side view, trotting to the right, big smile" + ONE,
    "ice": "a single flat patch of shiny pale blue ice on the ground, seen from above, no shadow",
    "cocoa": "a single big red mug of hot cocoa with whipped cream and a candy cane" + ONE,
    "gift": "a single wrapped Christmas present, red paper with a green ribbon and a bow" + ONE,
}
# Along the edges of the slope, changing with the area (Gene picked "D", four areas, on 2026-10-29).
EDGES = {
    "birch": "a single slim white birch tree with black bark marks, a few golden autumn leaves and snow on its branches" + ONE,
    "fence": "a short section of rustic wooden ranch fence, three posts and two rails, with snow on top" + ONE,
    "lantern": "a single old-fashioned black iron lamp post with a glowing warm yellow lantern on top and a red bow, snow on top" + ONE,
    "icespire": "a single tall jagged spire of pale blue ice crystals with a cap of snow, like a frozen waterfall" + ONE,
    "candycane": "a single giant red and white striped candy cane stuck upright in the snow, with a green bow" + ONE,
    "xmastree": "a single snowy green pine tree decorated with colourful Christmas lights and a gold star on top" + ONE,
}
# Behind the title and menu screens: the sign sits over the top third and the buttons over the
# bottom half, so the middle and bottom are calm snow.
BACKDROP = ("2D cartoon game background art, bold clean black outlines, flat bright colors, Saturday-morning "
            "cartoon style, portrait, a big snowy cartoon mountain on Christmas Eve at dusk, deep blue sky with "
            "twinkling stars and a big full moon, chunky rounded snowy peaks, a ski slope winding down past snowy "
            "pine trees to a little cartoon village of cosy cottages with glowing yellow windows at the bottom, "
            "smoke curling from chimneys, wide open smooth snow in the middle and the lower half, no people, "
            "no text, no letters")

HOUSE = ("a single cosy cartoon Christmas cottage, front view, chunky wobbly hand-drawn shape, a thick "
         "fluffy blanket of snow on the roof with icicles hanging off the edge, a crooked brick chimney, "
         "warm glowing yellow windows, a round-topped door with a green wreath, ")
HOUSES = {
    "red": "red walls, red door" + ONE,
    "blue": "light blue walls, yellow door" + ONE,
    "green": "green walls, red door, a little Christmas tree beside it" + ONE,
    "brown": "a log cabin of brown logs, red door" + ONE,
}


def swarm(name, prompt, w, h, raw=False):
    cmd = ["python3", "tools/swarm.py", name, prompt, "--n", N, "--w", str(w), "--h", str(h)]
    subprocess.run(cmd + (["--raw"] if raw else []), check=True)


def main():
    what = sys.argv[1]
    pick = [a for a in sys.argv[2:] if not a.startswith("--") and a != N]
    if what == "santa":
        for pose, words in POSES.items():
            if not pick or pose in pick:
                prompt = words[7:] + SANTA if words.startswith("FIRST: ") else SANTA + words
                swarm("santa-" + pose, prompt, 1024, 1024)
    elif what == "kids":
        swarm("kids-sheet", KIDS, 2560, 768)
    elif what == "things":
        for kind, prompt in THINGS.items():
            if not pick or kind in pick:
                swarm(kind, prompt, 1024, 1024)
    elif what == "edges":
        for kind, prompt in EDGES.items():
            if not pick or kind in pick:
                swarm("edge-" + kind, prompt, 1024, 1024)
    elif what == "backdrop":
        swarm("backdrop", BACKDROP, 768, 1344, raw=True)
    elif what == "houses":
        for colour, words in HOUSES.items():
            if not pick or colour in pick:
                swarm("house-" + colour, HOUSE + words, 1024, 1024)


main()
