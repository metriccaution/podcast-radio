# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Dev server with HMR at localhost
bun build        # Production build to dist/
bun start        # Serve production build

# Fetch/refresh podcast episode data (re-generates station content files)
bun src/fetch-data/fetch-podcasts.ts

# Run tests (exclude old-version which has its own deps)
bun test src/fetch-data src/ui src/components
```

There is no lint/format script configured.

## Architecture

This is a **Bun + React** podcast radio player with two distinct subsystems:

### Data fetching (build-time)

`src/fetch-data/` contains scripts that run at dev/build time to pull live RSS data:

1. `feed-parsing/stations.ts` — defines the podcast stations and their RSS feed URLs (the source of truth for what podcasts are tracked)
2. `fetch-podcasts.ts` — fetches each RSS feed, parses it, and **writes generated TypeScript files** to `src/ui/stations/`
3. `feed-parsing/load-rss.ts` — fetches RSS XML, validates with Zod, and maps to `EpisodeMetadata[]`
4. `feed-parsing/create-sources.ts` — renders the generated `.ts` file content

The generated `src/ui/stations/*-content.ts` files are **checked into the repo** and imported statically by the UI. They are not fetched at runtime.

### UI (runtime)

`src/ui/` is a React app served via `index.html` as a fully static site (no server components, no API routes).

#### State management

`App.tsx` uses a single `useReducer` over a `PlayerState` object defined in `src/ui/reducer.ts`. All state transitions go through named action types — do not introduce new `useState` calls for player-related state. The reducer is a pure function extracted to its own file so it can be tested independently of React.

#### Radio-clock timing

The station is treated as having been broadcasting continuously since Unix epoch (`new Date(0)`). `getCurrent()` in `src/ui/helpers/timing.ts` uses modulo arithmetic over the total episode list duration to find the current episode and offset for any wall-clock time. This makes playback position fully deterministic — tuning in at the same moment always lands on the same episode at the same offset.

#### Episode interleaving

`interleaveStation()` in `src/ui/helpers/stations.ts` round-robins feeds using LCM-based cycling (`produceCycle()`). Shorter feeds repeat to balance listening time per feed (not per episode). The cycle length is capped at `10 × max(feedLength)` to avoid explosion when feed lengths are coprime.

#### Hybrid display timing

- **Playing**: `onTimeUpdate` from the `<audio>` element drives `currentTime`; `onEnded` is the authoritative signal for track advancement (preferred over wall clock because the audio element knows the real end of file).
- **Paused**: a self-rescheduling `setTimeout` dispatches `TICK` once per second. The reducer handles the advance-or-tick decision — if `currentTime + 1 >= episode.durationSeconds`, the track advances; otherwise `currentTime` increments.

#### Actual audio duration

`HTMLMediaElement.duration` is read in `onLoadedMetadata` and stored as `actualDuration` in state. This is preferred over RSS feed `durationSeconds` for end-time and countdown display because RSS durations are frequently inaccurate. `actualDuration` is reset to `null` on every track change and re-populated when the new track's metadata loads.

### Components

Exported components must have their props interface exported alongside them. Inline prop types (e.g. `FC<{ foo: string }>`) should be extracted to a named exported interface. Name the interface after the component (`StationPickerProps`, `UpNextProps`, etc.).

`src/components/` contains all React components except `App.tsx`:

- `current-episode/` — displays feed name, episode title (linked if `infoLink` present), start/end wall-clock times, and a live countdown. End time and remaining are derived from `actualDuration ?? episode.durationSeconds`.
- `player/` — thin shell (`index.tsx`) that resolves the current episode's `mediaLink`, wrapping `audio.tsx` which drives a native `<audio>` element from props (no visible controls).
- `station-picker/` — button nav for switching between stations.
- `up-next/` — single line showing the next episode in the queue.

### Path alias

`@/` maps to `./src/` (configured in `tsconfig.json` and resolved by Bun's bundler). Use `@/fetch-data/...` or `@/components/...` for cross-subsystem imports.

### Key types

Defined in `src/fetch-data/feed-data.ts`:

- `RadioStation` — a named collection of feeds + all their episodes
- `FeedMetadata` — one RSS feed's title/link/description
- `EpisodeMetadata` — a single episode (title, duration, media URL, publish time, etc.)

To add a new station or feed, edit `src/fetch-data/feed-parsing/stations.ts`, then re-run `bun src/fetch-data/fetch-podcasts.ts` to regenerate the content files.

### TypeScript / Bun ambient types

`bun-env.d.ts` provides ambient module declarations for asset imports (`.svg`, `.css`, `.module.css`). If TypeScript reports "cannot find module" for a static asset import, add a declaration here rather than suppressing the error.

## Product intent

This is a radio, not a media player. The UI intentionally offers **play/pause only** — no seek, no skip, no episode browser. Playback always re-syncs to the current radio-clock position on resume, so a long pause picks up where the station "is now" rather than where the listener left off.

## old-version/

`old-version/` is the complete, working prior implementation (Vite + React 18 + MUI), kept as read-only reference. Do not modify it.

The old version used `*.yaml` station definitions and a runtime `stations.json`; the new version generates typed `.ts` files at fetch-time and imports them statically.
