# Vercel Deployment

This app is a Vite + React single page app. Vercel should use:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
Production Branch: main
```

`vercel.json` includes the SPA rewrite needed for routes like `/auth`, `/play`, and `/difficulty` to work on refresh.

## Supabase Auth URLs

After Vercel creates the production URL, add it in:

```txt
Supabase Dashboard -> Authentication -> URL Configuration
```

Set Site URL:

```txt
https://your-vercel-domain.vercel.app
```

Add Redirect URLs:

```txt
http://localhost:3000/play
http://localhost:8080/play
https://your-vercel-domain.vercel.app/play
https://*.vercel.app/play
```

## Google OAuth

In Google Cloud Console, keep Supabase as the OAuth callback:

```txt
https://vtizdyjqkwcrygqblpcm.supabase.co/auth/v1/callback
```

Add the deployed Vercel domain under Authorized JavaScript origins:

```txt
https://your-vercel-domain.vercel.app
```

## Supabase Edge Functions

Vercel deploys the frontend only. AI features depend on Supabase Edge Functions and the Anthropic secret.

```bash
npx supabase link --project-ref vtizdyjqkwcrygqblpcm
npx supabase secrets set ANTHROPIC_API_KEY=your_key_here
npx supabase functions deploy dungeon-master
npx supabase functions deploy generate-level
npx supabase functions deploy generate-room
npx supabase functions deploy generate-quiz
```

## Verify

```bash
npm run build
```

After deployment, test:

```txt
/
/auth
/play
/difficulty
```
