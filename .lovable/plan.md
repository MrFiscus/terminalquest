
## Terminal Quest — Build Plan

A split-screen Linux-terminal dungeon RPG. First screen is the playable game.

### Layout
- Full-viewport split: **left** Terminal panel, **right** GameWorld panel with an **inventory bar** pinned to its bottom.
- Dark 16-bit fantasy palette (deep slate, torch amber, moss green, parchment text). Pixel-style fonts (monospace for terminal, blocky display for HUD). All colors as HSL tokens in `index.css` + Tailwind config.

### Default dungeon (3 rooms, linear)
- `/home/user` — Entry Hall. Files: `readme.txt`, `torch`. Door: `hallway/`.
- `/home/user/hallway` — Stone Hallway. Files: `note.txt`. Doors: `..`, `treasury/`.
- `/home/user/hallway/treasury` — Treasury. Files: **`victory.jpg`**, `dust`. Door: `..`.
- `cat readme.txt` reveals the goal: move `victory.jpg` into `~/inventory`.

### Terminal (left panel)
- Scrollable history with prompt `user@dungeon:<cwd>$`.
- Supported commands: `ls`, `cd`, `pwd`, `cat`, `file`, `find`, `mkdir`, `rm`, `mv … ~/inventory`, `help`, `clear`.
- ↑/↓ cycle command history; Enter submits; auto-scroll to latest.
- Unknown commands route through a stubbed `dmRespond(input, ctx)` returning an in-character Dungeon Master line (ready to swap for AI later).
- `mv <file> ~/inventory` is the win trigger when `<file>` matches the target.

### GameWorld (right panel)
- Tile-based render of **only the current room** (deterministic grid, e.g. 11×7). Everything outside is black.
- Renders: floor/wall tiles, doors (one per child folder + a back-door for `..`), item glyphs for files, player marker.
- Movement animation: when `cd <dir>` runs, player walks tile-by-tile to that door, then room swaps. When `mv <file> ~/inventory` runs, player walks to the item, item fades into the inventory bar. If no walkable path, fall back to instant.
- CSS-only pixel styling, no new art assets.

### Inventory bar
- Dungeon-themed strip labeled `~/inventory`, fixed slots with stone/iron frame styling, items shown as glyph + name tooltip.
- Picking up `victory.jpg` triggers a victory overlay ("You have escaped the dungeon").

### Architecture
- `src/game/types.ts` — `Room`, `FileItem`, `Tile`, `Direction`, `GameState`, `CommandResult`.
- `src/game/dungeon.ts` — default 3-room map + tile layouts + helpers (`resolvePath`, `getRoom`, `pathfind`).
- `src/game/commands.ts` — pure command parser/executor returning state patches + output lines.
- `src/game/dmStub.ts` — stub DM responder for unknown commands.
- `src/hooks/useGameState.ts` — single source of truth: cwd, rooms, inventory, player tile, history, animation queue.
- `src/components/Terminal.tsx` — input, history, output rendering, arrow-key recall.
- `src/components/GameWorld.tsx` — current-room tile renderer + animated player.
- `src/components/InventoryBar.tsx` — themed slots.
- `src/components/VictoryOverlay.tsx` — win screen with "play again".
- `src/pages/Index.tsx` — split layout wiring it all together.

### Non-goals
No auth, no database, no landing page, no marketing copy, no new art generation.
