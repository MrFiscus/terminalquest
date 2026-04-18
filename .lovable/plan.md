
## Why the lines appear

The Landing page sets its background to a tiled 512×512 JPG (`slate-texture.jpg`):

```tsx
backgroundImage: `url(${slateTexture})`,
backgroundRepeat: "repeat",
backgroundSize: "512px 512px"
```

At a 1336px viewport the texture repeats roughly every 512px both horizontally and vertically, and because the JPG isn't seamless (and JPG compression amplifies edge artifacts), you get visible vertical/horizontal seams forming a grid across the hero. The radial overlays on top don't hide them because they're additive, not blurring.

## Fix plan (background)

Replace the raw tiled JPG with a layered, seam-hiding background:

1. **Cover, don't tile** the slate as the base layer: `background-size: cover` and `background-attachment: fixed` on the outer wrapper. One image stretched once = no repeating seam.
2. **Layer a procedural noise/grain** on top using CSS `radial-gradient` dot patterns + a soft `linear-gradient` vignette so the texture still feels stony without depending on the JPG's repeat.
3. **Add a global dark vignette overlay** (`radial-gradient(ellipse at center, transparent 40%, #000 100%)`) fixed to the viewport so even at long scroll the edges stay dark and uniform.
4. **Soft blur mask** (`backdrop-filter: blur(0.5px)` on a thin overlay) to dissolve any residual JPG block artifacts.

Net effect: uniform dark slate with grain, no repeating grid lines.

## Animations to add

Subtle, on-theme motion — nothing flashy:

1. **Hero entrance**: title `TERMINAL QUEST` fades + scales in (`fade-in` + `scale-in`, 600ms). Subtitle and CTA stagger in 200ms after.
2. **Ember particles**: 6–8 absolutely-positioned amber dots in the hero that drift upward with a CSS `@keyframes ember-rise` (translateY -120px + opacity 0) on a 6–10s loop with random delays. Pure CSS, no library.
3. **Torch glow pulse**: the existing radial amber glow at the top of the hero gets a slow `breathe` animation (opacity 0.6→1, 4s ease-in-out infinite) so the scene feels alive without flicker.
4. **Section reveal on scroll**: use IntersectionObserver in a tiny `useReveal` hook to add an `is-visible` class that triggers `fade-in` + slight `translateY(20px)→0` on each `<StoneSection>` as it enters the viewport.
5. **Hover micro-interactions**:
   - Stone CTA button gets a slow amber glow sweep (`background-position` animation on a gradient overlay) on hover.
   - Floppy buttons tilt 2° on hover (`transform: rotate(-2deg) translateY(-2px)`).
6. **Pixel dungeon idle**: torch tile already flickers; add a very slow `breathe` to the chest emoji and a faint pulsing glow ring under the player sprite.

## Files to edit

- `src/pages/Landing.tsx` — swap background style, add `useReveal` hook, ember particles, entrance/scroll animations, hover polish.
- `src/index.css` — add `@keyframes ember-rise`, `.reveal` / `.reveal.is-visible` classes, button glow-sweep keyframes (kept landing-scoped via class prefix `lp-`).

No new dependencies. All animations are CSS + one small IntersectionObserver hook.
