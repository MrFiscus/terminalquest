# Terminal Quest

A React + TypeScript terminal dungeon RPG for learning beginner Linux commands. Rooms behave like directories, files behave like items, and doors behave like folders. The player types commands in the left terminal and sees the current dungeon room on the right.

AI features use Claude through Supabase Edge Functions when an Anthropic key is available. Claude never runs directly in the browser. If the key is missing, expired, quota-limited, or the Edge Function is slow/unavailable, the app automatically falls back to deterministic local content so the game remains playable.

## Features

### Cinematic Dungeon Onboarding

Terminal Quest opens with a cinematic dungeon landing page that frames the app as a playable Linux RPG, not a plain command tutorial.

<img src="readme-img/Screenshot%202026-04-19%20164809.png" alt="Terminal Quest landing page with Enter the Dungeon call to action" width="720" />

The landing page teaches the premise before the player ever signs in: Linux commands become spells, rooms become directories, and the keyboard becomes the controller.

<img src="readme-img/Screenshot%202026-04-19%20164818.png" alt="Landing page command cards and split terminal dungeon preview" width="720" />

The onboarding flow demonstrates the core interaction with a simple example: type a command, submit it, and watch the dungeon react.

<img src="readme-img/Screenshot%202026-04-19%20164825.png" alt="How we play section showing a cd command and dungeon transition" width="720" />

The first screen is built for beginners too, with a clear start action and no Linux experience required.

<img src="readme-img/Screenshot%202026-04-19%20164836.png" alt="Landing page testimonial and enter dungeon button" width="720" />

### Supabase Login And Saved Runs

Players can create an account or continue with Google through Supabase authentication. The screen keeps the terminal fantasy alive while still behaving like a real login flow.

<img src="readme-img/Screenshot%202026-04-19%20164726.png" alt="Login screen with email password and Google authentication" width="720" />

If a previous quest exists, the app offers to resume it and shows the saved room, difficulty, explored rooms, and commands used.

<img src="readme-img/Screenshot%202026-04-19%20164743.png" alt="Saved quest resume screen with chamber stats and continue button" width="720" />

### Terminal Dungeon Gameplay

The main game is a split-screen terminal and tile-based dungeon. The player types real Linux-style commands on the left and sees the current dungeon room on the right.

<img src="readme-img/Screenshot%202026-04-19%20164539.png" alt="Terminal command output next to generated dungeon room with wizard guidance" width="720" />

Commands such as `ls`, `cd`, `pwd`, `cat`, `file`, `find`, `mkdir`, `rm`, and `mv` drive real movement, discovery, items, locked doors, and room transitions.

### Procedural Dungeon Rooms

Rooms are generated with connected wall structures, lighting, banners, skulls, vents, doors, archways, keys, scrolls, and decorative dungeon props while preserving playable paths.

<img src="readme-img/Screenshot%202026-04-19%20164557.png" alt="Generated dungeon room with locked door item labels and dungeon lighting" width="720" />

The map uses room-by-room visibility instead of a full-map reveal, so each chamber feels like a new directory to inspect.

### Directory-Based Movement

Moving through a door updates the shell path and the dungeon view together. Rooms behave like directories, doors behave like folders, and the player physically walks to exits before changing rooms.

<img src="readme-img/Screenshot%202026-04-19%20164715.png" alt="Player entering a generated room after running cd in the terminal" width="720" />

### AI Dungeon Master And Hint Book

The Dungeon Master reacts through the wizard popup instead of cluttering the terminal. It can explain mistakes, nudge stuck players, praise useful commands, and guide beginners toward the next action.

<img src="readme-img/Screenshot%202026-04-19%20164825.png" alt="AI mentor hint explaining how to proceed through the dungeon" width="720" />

The hint book and inventory sit under the map, keeping guidance, collected items, and the current room visible without hiding the game board.

<img src="readme-img/Screenshot%202026-04-19%20164539.png" alt="Hint book inventory bar and wizard popup during gameplay" width="720" />

### Profile, Stats, And Learning Progression

The profile page turns each run into a learning record. The account tab shows login identity and the current shell archetype generated from play history.

<img src="readme-img/Screenshot%202026-04-19%20164608.png" alt="Adventure profile account tab with player identity and shell archetype" width="720" />

The stats tab tracks progression such as completed levels, favorite command, keys found, streaks, and total commands.

<img src="readme-img/Screenshot%202026-04-19%20164619.png" alt="Adventure profile stats tab with command and quest metrics" width="720" />

The mastery tab explains each command as a spell, showing what the command teaches and what the player should practice next.

<img src="readme-img/Screenshot%202026-04-19%20164629.png" alt="Adventure profile mastery tab showing Linux commands as spells" width="720" />

Achievements reward milestones such as finishing levels, practicing `find`, and opening locked doors.

<img src="readme-img/Screenshot%202026-04-19%20164637.png" alt="Adventure profile achievements tab with unlockable milestones" width="720" />

The progress tab visualizes commands used, time per run, efficiency, and command mastery shape.

<img src="readme-img/Screenshot%202026-04-19%20164645.png" alt="Adventure profile progress charts for commands and completion time" width="720" />

The difficulty tab lets the player calibrate Linux familiarity, which feeds the adaptive level generation system.

<img src="readme-img/Screenshot%202026-04-19%20164654.png" alt="Adventure profile difficulty calibration slider" width="720" />

### AI-Enhanced Systems With Local Fallbacks

Claude can power Dungeon Master tutoring, command flavor text, adaptive level generation, generated `mkdir` rooms, Mau quizzes, profile summaries, and run reports. If the API key is missing, expired, quota-limited, or slow, deterministic local fallbacks keep the whole game playable.

Core gameplay also includes:

- Dungeon-style inventory at `~/inventory`
- Win condition by moving the target file into inventory
- Door placement on wall boundaries only
- Door labels above exits
- Player walking to doors/files before changing rooms or picking items up
- Sound effects and dungeon ambience for movement, doors, rooms, and actions

## Requirements

- Node.js 18 or newer
- npm
- Supabase project
- Anthropic API key for Claude, optional

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local frontend env file:

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_PROJECT_ID="vtizdyjqkwcrygqblpcm"
VITE_SUPABASE_URL="https://vtizdyjqkwcrygqblpcm.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
```

This is a Vite app, so use `VITE_*` variables. Do not use `NEXT_PUBLIC_*`.

Start Vite:

```bash
npm run dev
```

Open the URL Vite prints, usually:

```text
http://localhost:8080
```

If you edit `.env`, restart Vite with `Ctrl + C`, then:

```bash
npm run dev
```

## Optional Claude And Supabase

Claude keys belong in Supabase secrets, not in `.env`.

The app works without a Claude key. Without `ANTHROPIC_API_KEY`, these systems fall back automatically:

```text
Dungeon Master chat      -> local tutor replies
Command flavor text      -> command-specific fallback lines
Run report feedback      -> locally generated coaching note
Generated levels         -> deterministic adaptive dungeon generator
Generated mkdir rooms    -> deterministic room blueprint
Mau quizzes              -> deterministic quiz pools
Profile summary          -> local profile summary
```

If you want AI-enhanced text/generation, set hosted secrets:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key --project-ref vtizdyjqkwcrygqblpcm
npx supabase secrets set ANTHROPIC_MODEL=claude-3-haiku-20240307 --project-ref vtizdyjqkwcrygqblpcm
```

If you stop paying for the key or remove it later, no code change is required. The Supabase functions and browser services both return fallback content.

Deploy Edge Functions:

```bash
npx supabase functions deploy dungeon-master --project-ref vtizdyjqkwcrygqblpcm --no-verify-jwt --use-api
npx supabase functions deploy generate-level --project-ref vtizdyjqkwcrygqblpcm --use-api
npx supabase functions deploy generate-room --project-ref vtizdyjqkwcrygqblpcm --use-api
npx supabase functions deploy generate-quiz --project-ref vtizdyjqkwcrygqblpcm --use-api
```

`dungeon-master` uses `--no-verify-jwt` so public browser calls using Supabase publishable keys work cleanly.

For local Supabase function testing, copy:

```bash
cp supabase/.env.example supabase/.env.local
```

Then fill in only if testing AI locally:

```env
ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-haiku-20240307"
```

## Fallback Behavior

AI fallback is implemented in both places:

```text
Browser services: src/game/aiFallback.ts
Supabase functions: supabase/functions/*
```

Browser calls time out after a short wait and continue with local fallback content. This protects the player experience if:

```text
ANTHROPIC_API_KEY is missing
ANTHROPIC_API_KEY expires
Anthropic quota is exceeded
Supabase Edge Functions return an error
Network calls hang or fail
```

To intentionally test no-AI mode, remove or rename the `ANTHROPIC_API_KEY` Supabase secret, redeploy the functions, and play normally. The app should still generate levels, rooms, quizzes, reports, and guidance.

If you want to remove the hosted secret:

```bash
npx supabase secrets unset ANTHROPIC_API_KEY --project-ref vtizdyjqkwcrygqblpcm
```


## Testing AI

These command-like inputs intentionally use local hardcoded replies to save Claude credits:

```text
sudo
grep file
find
```

Use natural-language prompts to test Claude tutor mode:

```text
i am new to linux how does this work
```

```text
what does mv do
```

```text
how do i win
```

If every answer looks identical or generic, that usually means fallback mode is active. That is safe. For AI-enhanced mode, check:

- `.env` points to the same Supabase project that has the functions
- `VITE_SUPABASE_PUBLISHABLE_KEY` belongs to that project
- `ANTHROPIC_API_KEY` is set as a Supabase secret and still has credits/quota
- Edge Functions were redeployed after code changes
- Vite was restarted after `.env` changes

## Game Commands

```text
ls                       list files and doors in the current room
cd <door>                enter a directory/door
pwd                      print current room path
cat <file>               read a file
file <name>              inspect a file
find <name>              search the dungeon
mkdir <name>             create a generated directory/room
rm <name>                remove a file
mv <file> ~/inventory    move a file into inventory
help                     show command help
clear                    clear terminal history
```

Default win command:

```bash
mv victory.jpg ~/inventory
```

For Claude-generated levels, the terminal prints the exact `Win:` command.

## Scripts

```bash
npm run dev
npm test
npm run build
npm run preview
```

## Hosting

For Vercel/Netlify/Cloudflare Pages, use:

```text
Build command: npm run build
Output directory: dist
```

Keep `ANTHROPIC_API_KEY` in Supabase secrets only if AI-enhanced mode is desired. Do not put Anthropic keys in frontend hosting environment variables.

## Git Safety

Commit examples, not secrets:

```text
.env.example
supabase/.env.example
```

Do not commit:

```text
.env
.env.local
supabase/.env.local
supabase/.temp
node_modules
dist
```
