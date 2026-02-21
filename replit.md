# Aura - BioAge & Wellness Tracker

## Overview

Aura is a biological age tracking and wellness application that calculates a user's "bio-age" based on health metrics (heart rate, VO2 max, HRV, sleep, activity, body composition). It presents this data through a soft, premium wellness-styled mobile-first UI with an AI-powered chat assistant for personalized health insights.

The app follows a monorepo structure with three main directories:
- `client/` — React SPA (Vite + TypeScript)
- `server/` — Express API server (TypeScript)
- `shared/` — Shared schema and type definitions (Drizzle ORM + Zod)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) with 4 pages: Home (`/`), Onboarding (`/onboarding`), Chat (`/chat`), Settings (`/settings`)
- **State Management**: TanStack React Query for server state; local component state via React hooks
- **Styling**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin) with shadcn/ui component library (New York style). The design follows a "soft premium wellness" aesthetic with warm neutrals, pastel accents, oversized rounded corners, and editorial serif headings (Lora) paired with clean sans-serif body text (DM Sans)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **UI Components**: Full shadcn/ui component suite in `client/src/components/ui/`; custom `BottomNav` component for mobile navigation
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **User Identity**: Simple localStorage-based user ID (`aura_user_id`) — no authentication system

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**:
  - `POST/GET/PATCH /api/users` — User CRUD and onboarding
  - `GET/POST /api/users/:id/metrics` — Health metric management with batch upsert
  - `GET /api/users/:id/bioage` — Bio-age calculation
  - `POST/GET/DELETE /api/users/:id/conversations` — AI chat conversations
  - `POST /api/users/:id/conversations/:cid/messages` — Chat messages with SSE streaming
- **Bio-Age Engine**: Custom algorithm in `server/bioage.ts` that computes biological age offset from chronological age based on health metrics across categories (cardiovascular, sleep, recovery, activity, body composition). Each metric has optimal ranges and maximum impact values.
- **AI Integration**: OpenAI API (via Replit AI Integrations) for the wellness chat assistant. Uses environment variables `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
- **Development**: Vite dev server runs as middleware in development mode with HMR; static files served in production from `dist/public/`

### Replit Integrations
The `server/replit_integrations/` and `client/replit_integrations/` directories contain pre-built modules for:
- **Chat**: Conversation and message CRUD with OpenAI streaming
- **Audio**: Voice recording, streaming playback (AudioWorklet), and speech-to-text
- **Image**: Image generation via `gpt-image-1`
- **Batch**: Rate-limited batch processing utilities for LLM calls

These are utility modules that can be registered as Express routes or used as React hooks.

### Data Storage
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with PostgreSQL dialect (`drizzle-orm/node-postgres`)
- **Schema** (defined in `shared/schema.ts`):
  - `users` — User profile (age, sex, height, weight, bio-age target, notification preferences, onboarding status)
  - `health_metrics` — Time-series health data (metric key, value, unit, category, override flag)
  - `bio_age_snapshots` — Historical bio-age calculations with category breakdowns (JSONB)
  - `conversations` — Chat conversation metadata per user
  - `messages` — Chat messages with role (user/assistant) and content
- **Schema Management**: `drizzle-kit push` for schema synchronization (no migration files committed)
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`

### Build System
- **Client Build**: Vite produces static assets to `dist/public/`
- **Server Build**: esbuild bundles server code to `dist/index.cjs` (CommonJS format). Key dependencies are bundled (not externalized) to reduce cold start times.
- **Build Script**: Custom `script/build.ts` orchestrates both builds with an allowlist of dependencies to bundle

## External Dependencies

### Required Services
- **PostgreSQL Database**: Connection via `DATABASE_URL` environment variable. Used for all persistent data storage.
- **OpenAI API** (via Replit AI Integrations): Powers the wellness chat assistant. Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables.

### Key NPM Packages
- **Frontend**: React, Vite, TanStack React Query, Wouter, Framer Motion, Radix UI primitives, shadcn/ui, Recharts, Embla Carousel, react-day-picker, react-hook-form
- **Backend**: Express 5, Drizzle ORM, pg (node-postgres), OpenAI SDK, connect-pg-simple, nanoid
- **Shared**: Zod, drizzle-zod, date-fns

### Fonts (External)
- Google Fonts: DM Sans (sans-serif body text) and Lora (serif headlines), loaded via `<link>` tags in `index.html`