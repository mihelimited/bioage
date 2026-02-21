# Aura - BioAge & Wellness Tracker

## Overview

Aura is a biological age tracking and wellness application that calculates a user's "bio-age" using a domain-based algorithm across 5 wellness domains (fitness, autonomic, circadian, sleep, mobility). It uses z-score deviations, quality-gated weights, and shrinkage regularization for scientifically-grounded results. The app presents data through a soft, premium wellness-styled mobile-first UI with an AI-powered chat assistant for personalized health insights.

The app follows a monorepo structure with these main directories:
- `expo-app/` — React Native/Expo frontend (file-based routing via Expo Router)
- `server/` — Express API server (TypeScript)
- `shared/` — Shared schema and type definitions (Drizzle ORM + Zod)
- `client/` — Legacy React web SPA (deprecated, replaced by expo-app)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (Expo/React Native)
- **Framework**: React Native with Expo SDK 54, TypeScript
- **Routing**: Expo Router (file-based routing) with `Slot` in root layout (not `Stack` — Stack has rendering issues on web), bottom tabs via `Tabs` navigator: Home (`/(tabs)/`), Chat (`/(tabs)/chat`), Settings (`/(tabs)/settings`), plus Onboarding (`/onboarding`)
- **State Management**: TanStack React Query for server state; local component state via React hooks
- **Styling**: React Native StyleSheet with custom theme system (`expo-app/src/lib/theme.ts`). Design follows "soft premium wellness" aesthetic with warm neutrals, pastel accents, oversized rounded corners, editorial serif headings (Lora) paired with clean sans-serif body text (DM Sans)
- **Animations**: React Native Animated API for page transitions
- **UI Components**: Custom React Native components using Lucide React Native icons
- **Path Aliases**: `@/` maps to `expo-app/src/`
- **User Identity**: AsyncStorage-based user ID (`aura_user_id`) — no authentication system
- **Web Support**: Expo Web via react-native-web, served through Express proxy in development

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
- **Bio-Age Engine**: Custom algorithm in `server/bioage.ts` that computes biological age offset from chronological age based on health metrics across 5 domains (fitness, autonomic, circadian, sleep, mobility). Uses z-score deviations from population references, quality-gated weights based on data availability, and shrinkage regularization (lambda=0.70) to prevent overfitting. Each domain is clamped to [-12, +12] years max impact.
- **AI Integration**: OpenAI API (via Replit AI Integrations) for the wellness chat assistant. Uses environment variables `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
- **Development**: Express on port 5000 proxies non-API requests to Expo Metro bundler on port 8081 (via `server/expo-proxy.ts`). CORS middleware enables cross-origin requests.

### Development Architecture
- Express API server runs on port 5000 (Replit's exposed port)
- Expo Metro dev server runs on port 8081 (internal only)
- Express proxies all non-`/api` requests to Metro, stripping Origin headers for CORS compatibility
- The `npm run dev` command starts both servers together via the expo-proxy module
- Native devices connect via Expo Constants `hostUri` for the API base URL

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
- **Client Build**: Expo web export for static assets
- **Server Build**: esbuild bundles server code to `dist/index.cjs` (CommonJS format). Key dependencies are bundled (not externalized) to reduce cold start times.
- **Build Script**: Custom `script/build.ts` orchestrates both builds with an allowlist of dependencies to bundle

## External Dependencies

### Required Services
- **PostgreSQL Database**: Connection via `DATABASE_URL` environment variable. Used for all persistent data storage.
- **OpenAI API** (via Replit AI Integrations): Powers the wellness chat assistant. Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables.

### Key NPM Packages
- **Frontend (Expo)**: React Native, Expo, Expo Router, TanStack React Query, Lucide React Native, react-native-safe-area-context, react-native-screens, react-native-svg, react-native-gesture-handler, react-native-reanimated, moti, AsyncStorage
- **Backend**: Express 5, Drizzle ORM, pg (node-postgres), OpenAI SDK, http-proxy-middleware, nanoid
- **Shared**: Zod, drizzle-zod, date-fns

### Fonts (Bundled)
- DM Sans (sans-serif body text) and Lora (serif headlines), bundled as TTF files in `expo-app/assets/fonts/`
