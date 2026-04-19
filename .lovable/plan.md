
## Replace `rm` star VFX with fire/poof effect

The `rm` command currently shows a purple ✦ star (`vfx-smoke` class) on the removed file's tile. I'll swap it for a flame burst that fades into smoke.

### Change in `src/components/GameWorld.tsx` (rm branch, ~line 328)

Replace the single ✦ span with a multi-layer flame:
- Animated 🔥 emoji (scales up then fades) for the burning artifact
- Soft orange/red radial glow behind it for the fire halo
- Lingering smoke wisp (💨 or gradient puff) that drifts upward as it dissipates

```tsx
if (k === "rm")
  return (
    <div key={i} className="vfx-fire relative flex items-center justify-center">
      <div className="vfx-fire-glow absolute inset-0" />
      <span className="vfx-fire-flame text-2xl">🔥</span>
      <span className="vfx-fire-smoke absolute text-xl">💨</span>
    </div>
  );
```

### New keyframes in `src/index.css`

- `vfx-fire-flame`: scale 0.4 → 1.3 → 0.6, opacity 0 → 1 → 0 (flicker via slight rotate)
- `vfx-fire-glow`: radial-gradient orange→transparent, pulsing opacity
- `vfx-fire-smoke`: translateY(0 → -16px), opacity 0 → 0.7 → 0, delayed start (~500ms)

Total duration matches the existing 1100ms `durationMs` set in `fileInteraction.ts` `rm` command — no logic changes needed there.

### Files touched
- `src/components/GameWorld.tsx` — swap the `rm` VFX JSX
- `src/index.css` — add 3 keyframe animations + utility classes
