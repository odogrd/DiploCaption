# DiploCaption

## Overview

DiploCaption is a private, single-user web app for generating AI-powered social media captions from geopolitical map images. Upload a DiploMap image and instantly get tailored captions for 5 platforms (Instagram, Facebook, Substack, X, Bluesky) using Claude vision AI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/diplocaption), dark editorial theme
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic Claude claude-sonnet-4-20250514 with vision
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: HTTP-only session cookie, HMAC-signed, 7-day expiry

## Environment Variables (Secrets)

- `APP_USERNAME` — login username
- `APP_PASSWORD` — login password
- `SESSION_SECRET` — HMAC signing key for session cookies
- `ANTHROPIC_API_KEY` — Claude API key
- `DATABASE_URL` — PostgreSQL connection (auto-provisioned by Replit)

## Structure

```text
artifacts/
  api-server/         # Express 5 API server
    src/
      lib/auth.ts             # Session cookie auth (HMAC signed)
      lib/defaultSettings.ts  # Default platform settings
      routes/auth.ts          # /api/auth/* (login, logout, me)
      routes/settings.ts      # /api/settings (get/update platform settings)
      routes/captions.ts      # /api/captions/* (generate, refine, rewrite)
      routes/history.ts       # /api/history (CRUD for generation history)
  diplocaption/       # React + Vite frontend
    src/
      pages/login.tsx         # Login page
      pages/generator.tsx     # Main generator (upload + generate + results)
      pages/settings.tsx      # Platform settings page
      pages/history.tsx       # Generation history page
      components/layout.tsx   # Sidebar nav with auth guard
      components/caption-card.tsx  # Per-platform caption card
      components/platform-icon.tsx # Platform icons
lib/
  api-spec/openapi.yaml  # OpenAPI spec (source of truth)
  api-zod/               # Generated Zod schemas
  api-client-react/      # Generated React Query hooks
  db/
    src/schema/
      platformSettings.ts    # platform_settings table
      generationHistory.ts   # generation_history table
```

## Key Pages & Features

- `/login` — single-user login (username + password from env)
- `/` — upload map image, optional context notes, map type selector, per-session platform overrides panel, generate captions
- Results section — per-platform cards with inline editing, copy, char counter, Refine with AI, Rewrite completely
- `/settings` — edit global platform instructions, audience, language
- `/history` — past generation sessions with thumbnails, expand, delete

## Data Storage Schema

- `platform_settings` — per-platform instructions, audience, language
- `generation_history` — image thumbnail, map type, context notes, all 5 captions JSON

## Development

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/diplocaption run dev` — start frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API types
- `pnpm --filter @workspace/db run push` — push DB schema changes
