

## Match `/play` aesthetic to the Landing page

The Play page already uses some shared chrome (`scriptorium-bg`, `scriptorium-frame`, `iron-rivets`, `pillar-divider`, `stone-toggle`). I'll layer on the Landing page's atmospheric polish so they feel like the same world.

### Visual goals
- Same warm/cool dungeon palette: deep slate background with a subtle radial vignette + slate texture.
- Ambient embers floating up around the dungeon viewport (same `lp-ember` particles).
- Breathing torch-glow halos behind key panels (`lp-breathe`).
- Cinzel/Pirata One serif for headers (Book of Secrets title, Victory overlay), matching landing typography.
- Buttons reskinned to `lp-stone-btn` + `lp-eng-glow` style (engraved gold on dark stone, sweep on hover).
- Smooth `lp-fade-up` entrance for major panels (terminal, dungeon, inventory) on first mount.
- Wizard popup + Room subtitle get a soft breathing glow + Cinzel italic flourish.
- Difficulty toggles keep their stone look but pick up the warm ember hover glow already used on landing CTAs.

### Files to edit

1. **`src/pages/Index.tsx`**
   - Wrap `<main>` in the same fixed slate-texture + radial vignette background used on Landing (extracted as a shared utility class).
   - Add a layer of `lp-ember` particles (4–6) behind the dungeon `<section>`.
   - Add `lp-breathe` halos behind terminal and dungeon panels.
   - Add `lp-hero-in` (fade-up) to the terminal section, dungeon section, and inventory bar for entrance polish.
   - Replace the "📖 BOOK OF SECRETS" `stone-tablet-btn` with a small `lp-stone-btn` + `lp-eng-glow` styled button to match the landing CTA.

2. **`src/components/VictoryOverlay.tsx`**
   - Swap `font-pixel` headings for `lp-silver-cast` title ("YOU ESCAPED") and `lp-eng-glow` for "DESCEND AGAIN" button (use `lp-stone-btn lp-stone-btn-sweep` instead of the default `Button`).
   - Add `lp-breathe` ember glow + a few `lp-ember` particles inside the overlay card.

3. **`src/components/WizardPopup.tsx`**
   - Border + bg already close — add `lp-breathe` halo behind the bubble and switch the message font to Cinzel italic for cohesion. Add `lp-hero-in` entrance.

4. **`src/components/RoomFlavorSubtitle.tsx`**
   - Switch text to Cinzel italic (matches landing's flavor text style) and add the same subtle breathing glow.

5. **`src/components/DifficultyMenu.tsx`** (read first to confirm)
   - Apply the landing background (slate texture + vignette + embers), `lp-silver-cast` for the title, `lp-stone-btn lp-stone-btn-sweep` + `lp-eng-glow` for the confirm button, and `lp-fade-up` on the panel.

6. **`src/index.css`**
   - Add a small reusable utility `.dungeon-page-bg` that bundles the Landing's fixed slate-texture + radial vignette + grain overlay so multiple pages can apply it without duplication.
   - No new keyframes needed — reuse `lp-fade-up`, `lp-breathe`, `ember-rise`, `lp-glow-sweep`, `lp-silver-shimmer`.

### Out of scope
- No layout/grid changes to the play screen (40/60 split stays).
- No changes to gameplay logic, terminal behavior, or game world rendering.
- Inventory tile chrome (`chest-slot`) stays as-is — already on-theme.

