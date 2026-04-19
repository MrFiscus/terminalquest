# Terminal Quest

A React + TypeScript terminal dungeon RPG for learning beginner Linux commands. Rooms behave like directories, files behave like items, and doors behave like folders. The player types commands in the left terminal and sees the current dungeon room on the right.

AI features use Claude through Supabase Edge Functions when an Anthropic key is available. Claude never runs directly in the browser. If the key is missing, expired, quota-limited, or the Edge Function is slow/unavailable, the app automatically falls back to deterministic local content so the game remains playable.

## Output Gallery

<table>
  <tr>
    <td><img src="readme-img/Screenshot%202026-04-19%20164539.png" alt="Terminal Quest gameplay screenshot 1" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164557.png" alt="Terminal Quest gameplay screenshot 2" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164608.png" alt="Terminal Quest gameplay screenshot 3" width="320" /></td>
  </tr>
  <tr>
    <td><img src="readme-img/Screenshot%202026-04-19%20164619.png" alt="Terminal Quest gameplay screenshot 4" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164629.png" alt="Terminal Quest gameplay screenshot 5" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164637.png" alt="Terminal Quest gameplay screenshot 6" width="320" /></td>
  </tr>
  <tr>
    <td><img src="readme-img/Screenshot%202026-04-19%20164645.png" alt="Terminal Quest gameplay screenshot 7" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164654.png" alt="Terminal Quest gameplay screenshot 8" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164715.png" alt="Terminal Quest gameplay screenshot 9" width="320" /></td>
  </tr>
  <tr>
    <td><img src="readme-img/Screenshot%202026-04-19%20164726.png" alt="Terminal Quest gameplay screenshot 10" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164743.png" alt="Terminal Quest gameplay screenshot 11" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164809.png" alt="Terminal Quest gameplay screenshot 12" width="320" /></td>
  </tr>
  <tr>
    <td><img src="readme-img/Screenshot%202026-04-19%20164818.png" alt="Terminal Quest gameplay screenshot 13" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164825.png" alt="Terminal Quest gameplay screenshot 14" width="320" /></td>
    <td><img src="readme-img/Screenshot%202026-04-19%20164836.png" alt="Terminal Quest gameplay screenshot 15" width="320" /></td>
  </tr>
</table>

## Features

- Split-screen terminal + 2D dungeon renderer
- Room-by-room visibility, not a full-map view
- Linux-style commands: `ls`, `cd`, `pwd`, `cat`, `file`, `find`, `mkdir`, `rm`, `mv`, `help`, `clear`
- Dungeon-style inventory at `~/inventory`
- Win condition by moving the target file into inventory
- Tile-based deterministic room generation
- Door placement on wall boundaries only
- Door labels above exits
- Player walks to doors/files before changing rooms or picking items up
- Provided `door.png` and GIF assets used for doors and character animation
- Optional Claude Dungeon Master tutor for natural-language help and unknown commands
- Optional Claude-based AI level generation with deterministic fallback
- Optional Claude-based AI room generation for `mkdir` with deterministic fallback
- Optional Claude-based Mau quizzes with deterministic fallback
- AI calls time out and fall back quickly so expired API credits do not block gameplay

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
