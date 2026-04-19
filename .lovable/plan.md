

## Goal
Reskin the **Book of Secrets** outer chrome (binding, frame, page edges) to match the reference: a chunky, cartoon-fantasy tome with **mossy green stone-leather binding, riveted silver metal corner brackets, ragged cream parchment pages with pebble/stone texture, and wooden bookmark tabs** at the bottom. Keep all functionality (flip animation, spell entries, filters, navigation) untouched.

## What changes visually

### 1. Binding — mossy green stone-leather
- Replace the dark brown/black leather frame with a **layered mossy green** material: base `#5a7a35`, dappled darker patches `#3d5a22`, brighter mossy highlights `#8aa850`.
- Add subtle **stone-cracked texture** via `repeating-linear-gradient` + radial blotches so it reads as weathered, almost lichen-covered.
- Soft inner glow + dark outer rim for that hand-painted, slightly rounded "cartoon volume" feel.

### 2. Silver corner brackets (the standout feature)
- Add **4 metallic silver L-shaped brackets** at each outer corner of the book (~46×46 px).
- Pure CSS: layered linear-gradients (`#e8edf2 → #9aa4ad → #5d6770`) for brushed-steel look, plus 2 small dark "rivet" dots per bracket.
- `drop-shadow` to lift them off the green binding.

### 3. Parchment — cream with stone pebbles
- Replace the warm yellow/gold `PARCH_BG` with a **cooler cream/tan** palette: base `#e8d4a8`, shadowed cracks `#b89668`, soft cream highlights `#f4e4bf`.
- Overlay scattered **pebble blobs** using multiple `radial-gradient` ellipses of varying size/opacity to mimic the stone-fleck texture in the reference.
- Keep faint horizontal ruling, but lighter brown so it sits on the new cream tone.

### 4. Ragged page edges
- Add a thin SVG-free **torn-edge mask** along the outer page borders using `clip-path: polygon(...)` with small zigzag points, so pages look hand-torn instead of perfectly straight.

### 5. Wooden bookmark tabs (bottom)
- Two small **wooden plank tabs** poking out from the bottom of the book (~28×18 px each, positioned ~30% and ~70% from left).
- Wood-grain via vertical `linear-gradient` with `repeating-linear-gradient` stripes (`#9b7340 → #6b4a22`).
- Could double as **quick-jump anchors** (e.g., jump to Apprentice / Archmage sections) — optional, can stay decorative.

### 6. Updated palette constants
Refactor the `C = {...}` object in `BookOfSecrets.tsx`: rename `leather*` → `bind*` (green tones), add `silver*` and `wood*` groups, retune `parch*` to cream. Rank badges + text colors stay the same so legibility is preserved.

### 7. Rank badges & dividers — minor tonal sync
- Adjust the thick horizontal separator between entries from brown to a **darker green-bronze** so it harmonizes with the new binding.
- Number badges keep gold rim but on a slightly cooler dark-green core.

## What does NOT change
- Page-flip animation, timing, and 3D logic
- `SpellEntry` content layout, filter buttons, prev/next navigation, keyboard handlers
- All command data and difficulty filtering
- The `onClose` backdrop behavior

## Files to edit
- `src/components/BookOfSecrets.tsx` — palette object, `PARCH_BG`, binding wrapper styles, add 4 corner brackets + 2 bottom wood tabs, ragged edge clip-path on `Page`. All-in-one file, no new dependencies.

## Optional follow-ups (ask after approval)
- Animate corner-bracket rivets with a faint glint
- Make wood tabs clickable to jump to a difficulty section
- Add a subtle parchment "bow" so pages curve slightly outward like the reference

