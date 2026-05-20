# /public/models/ — 3D assets for the home scene

The 3D library nook / chibi house scene on the home page can load real `.glb`
models from this folder. **If a file isn't here, the scene falls back to a
primitive (boxes + spheres) version automatically** — so nothing breaks if
you haven't downloaded anything yet. As you drop files in, quality lifts.

All recommended assets below are **CC0** (Creative Commons Zero — public
domain dedication, no attribution required, free for personal and commercial
use).

## What the scene expects

Drop these specific filenames into this folder:

| Filename                  | Used for                                | Required? |
| ------------------------- | --------------------------------------- | --------- |
| `house.glb`               | The chibi house                         | optional  |
| `tree.glb`                | All three trees (re-used at varied scale) | optional  |
| `bush.glb`                | All four bushes                         | optional  |
| `flower-pink.glb`         | Pink flowers (3 of them)                | optional  |
| `flower-yellow.glb`       | Yellow flowers (2 of them)              | optional  |
| `flower-red.glb`          | Red flower (1)                          | optional  |

Each of these falls back to a primitive if absent. You can add them one at
a time.

## Where to get them

The aesthetic match is **Quaternius**, who releases stylised low-poly assets
under CC0 on itch.io.

### Pack 1 — Stylized Nature MegaKit  (CC0, free)
<https://quaternius.itch.io/stylized-nature-megakit>

110+ Ghibli-inspired nature models. Has the trees, bushes, and flowers we
need.

After downloading + unzipping:

1. Find the `glTF/` (or `GLB/`) subfolder inside the pack.
2. Pick **one tree** you like. Copy it here as `tree.glb`.
3. Pick **one bush**. Copy it here as `bush.glb`.
4. Pick **three flowers** (different colours if you want variety). Copy
   them here as `flower-pink.glb`, `flower-yellow.glb`, `flower-red.glb`.

### Pack 2 — for the house

Pick one of:

- **LowPoly Farm Buildings**  <https://quaternius.itch.io/lowpoly-farm-buildings>
- **Simple Buildings Pack**   (search "Simple Buildings" on quaternius.com)
- **Medieval Village MegaKit** <https://quaternius.itch.io/medieval-village-megakit>  *(if you want a cottage feel)*

Pick a small house / cottage you like. Copy it here as `house.glb`.

### Scaling and positioning

Quaternius models often come out around 1–2 units tall. The scene currently
assumes:

- House: roughly 2.5 units tall, footprint 2.8 × 2.4
- Tree:  roughly 2.5 units tall (then scaled 0.7×–1.05× per instance)
- Bush:  roughly 0.5 units tall
- Flower: roughly 0.25 units tall

If a model loads at the wrong scale or off-position, open `src/components/Room.tsx`
and tweak the `scale` or `position` props on the relevant component, or wrap
the `<Model />` call in a `<group scale={...} position={...}>`.

## What if I want different naming?

Edit the `url="..."` values inside the matching component in `src/components/Room.tsx`.

## License

Quaternius assets used here are **CC0 1.0 Universal**:

> *"Free to use in personal, educational and commercial projects."*

No attribution required, but a polite credit is nice — there's a one-line
mention in the top-level README.md.
