

## Goal
Make the landing page feel more alive, immersive, and inviting — drawing visitors deeper without overwhelming the dungeon aesthetic.

## Proposed enhancements

### 1. Stronger hero hook
- **Animated tagline rotator** under the title: cycle through 3-4 punchy lines like *"Learn Linux. Slay dragons."*, *"Your terminal is your sword."*, *"AI Dungeon Master included."* — each fades in/out every 3.5s.
- **Visible CTA in hero** (currently the CTA is buried at the bottom): add a stone "▶ ENTER THE DUNGEON" button right under the tagline so first-paint shows a clear next action.
- **Scroll cue**: a small bouncing "▼ scroll to peek inside" indicator at the bottom of the hero.

### 2. Live, interactive terminal demo
The current `TerminalDemo` plays once and stops. Make it:
- **Loop continuously** so late scrollers still see motion.
- **Add typewriter sound-style cursor jitter** (subtle scale pulse on each new char).
- **Allow the visitor to type** into the demo terminal — accept `ls`, `cd`, `help` and respond with canned dungeon output. Turns the demo into a 10-second taste of the real game.

### 3. Stat ribbon (social proof / hook)
A thin engraved-stone bar between hero and dual-monitor section showing rotating counters:
`⚔ 47 COMMANDS · 🗝 12 DUNGEONS · 🤖 AI MENTOR · 🆓 FREE TO PLAY`
Numbers count up on scroll-into-view.

### 4. "Featured commands" carousel
New section before "How We Play": a horizontally-scrolling row of 6-8 stone tablets, each showing one Linux command (`ls`, `cat`, `grep`, `mkdir`, `chmod`, `find`) with a one-line dungeon flavor: *"grep — divine the secret runes hidden in any scroll"*. Tablets gently float and tilt on hover.

### 5. Testimonial / quote scroll
A parchment scroll component (reuse `scriptorium-bg`) with rotating fictional player quotes:
> *"I learned more sysadmin in 2 hours than my whole CS class." — apprentice_dev*

Adds personality and warmth without needing real testimonials.

### 6. Animated dungeon path preview
Replace the static dual-monitor layout's right side with a **mini-loop**: player walks left→right across the room every ~6s, opens a door, screen briefly flashes "ROOM CLEARED ✓", resets. Already have walking GIFs — just needs a state loop.

### 7. Footer "campfire"
Currently no real footer. Add a small final block:
- Pixel campfire ASCII art with the existing ember particle effect concentrated above it
- Links: GitHub · Discord · About · How it works
- Tiny copyright line in engraved-stone style

### 8. Polish details
- **Cursor trail of embers** when moving the mouse over the hero (CSS-only, throttled, max 6 particles).
- **Audio toggle** in the top nav: a 🔊/🔇 icon that plays a low ambient torch-crackle loop (muted by default, respects user choice via localStorage).
- **First-time visitor "?" hint bubble** pointing to the CTA after 4s of inactivity.

## Recommended priority (if not all)
**High impact / low risk:** 1 (hero CTA + tagline rotator), 2 (interactive terminal), 4 (commands carousel), 6 (dungeon walk loop)
**Nice to have:** 3 (stat ribbon), 5 (testimonial), 7 (campfire footer)
**Optional flair:** 8 (cursor trail, audio)

## Files to edit
- `src/pages/Landing.tsx` — all new sections, hero CTA, interactive terminal state, walk-loop state
- `src/index.css` — add float/tilt keyframes for tablets, count-up reveal animation, scroll-cue bounce, cursor-trail particle styles
- *(optional)* `public/audio/torch-loop.mp3` if we add the audio toggle

No new dependencies needed.

## Question for you
Which subset would you like? Reply with numbers (e.g. *"1, 2, 4, 6"*) or *"all"* and I'll build it in default mode.

