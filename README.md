# Terminal Quest

A React + TypeScript terminal dungeon RPG for learning beginner Linux commands. Rooms behave like directories, files behave like items, and doors behave like folders. The player types commands in the left terminal and sees the current dungeon room on the right.

AI features use Claude through Supabase Edge Functions. Claude never runs directly in the browser.

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
- Claude Dungeon Master tutor for natural-language help and unknown commands
- Claude-based AI level generation with deterministic fallback
- Claude-based AI room generation for `mkdir` with deterministic fallback

## Requirements

- Node.js 18 or newer
- npm
- Supabase project
- Anthropic API key for Claude

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

## Claude And Supabase

Claude keys belong in Supabase secrets, not in `.env`.

Set hosted secrets:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key --project-ref vtizdyjqkwcrygqblpcm
npx supabase secrets set ANTHROPIC_MODEL=claude-3-5-haiku-latest --project-ref vtizdyjqkwcrygqblpcm
```

Deploy Edge Functions:

```bash
npx supabase functions deploy dungeon-master --project-ref vtizdyjqkwcrygqblpcm --no-verify-jwt --use-api
npx supabase functions deploy generate-level --project-ref vtizdyjqkwcrygqblpcm --use-api
npx supabase functions deploy generate-room --project-ref vtizdyjqkwcrygqblpcm --use-api
```

`dungeon-master` uses `--no-verify-jwt` so public browser calls using Supabase publishable keys work cleanly.

For local Supabase function testing, copy:

```bash
cp supabase/.env.example supabase/.env.local
```

Then fill in:

```env
ANTHROPIC_API_KEY="your-anthropic-api-key"
ANTHROPIC_MODEL="claude-3-5-haiku-latest"
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

If every answer looks identical or generic, check:

- `.env` points to the same Supabase project that has the functions
- `VITE_SUPABASE_PUBLISHABLE_KEY` belongs to that project
- `ANTHROPIC_API_KEY` is set as a Supabase secret
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

## Vercel

Add these Vercel environment variables:

```env
VITE_SUPABASE_PROJECT_ID=vtizdyjqkwcrygqblpcm
VITE_SUPABASE_URL=https://vtizdyjqkwcrygqblpcm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Keep `ANTHROPIC_API_KEY` in Supabase secrets unless AI is moved to Vercel serverless functions later.

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
