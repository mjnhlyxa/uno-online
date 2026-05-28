# uno-online — Technical Plan

> **Status**: Draft | Created: 2026-05-29 | Last Updated: 2026-05-29
> **C4 Level**: 1 — Context Overview

## 1. Game Overview

### 1.1 Game Concept
UNO Online is a real-time multiplayer card game where 2–10 players compete using the classic UNO ruleset over the web. Players create or join rooms via shareable links, play matches in real-time with synchronized state, and can spectate ongoing games. No account required — anonymous play via browser cookie/localStorage.

### 1.2 Game Type
- **Genre**: Card game — real-time multiplayer
- **Platform**: Web browser (desktop primary, mobile responsive)
- **Session Length**: Quick 10–20 minute matches
- **Multiplayer Model**: Real-time rooms (2–10 players), spectator mode supported
- **Account Required**: No — anonymous play supported

### 1.3 Target Audience
- Casual gamers who want quick, fun matches with friends
- UNO fans who want to play remotely without installing an app
- Party game enthusiasts sharing a link to start a game instantly
- Players on mobile devices seeking on-the-go entertainment

## 2. System Context (C4 L1)

### 2.1 User Interactions

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │   Desktop     │  │    Mobile     │  │   Spectators            │  │
│  │   Browser     │  │    Browser    │  │   (read-only viewers)   │  │
│  └───────┬───────┘  └───────┬───────┘  └────────────┬────────────┘  │
└──────────┼──────────────────┼──────────────────────┼────────────────┘
           │                  │                      │
           ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      UNO ONLINE SYSTEM                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  apps/web — Next.js 14 (Frontend SPA)                       │   │
│  │  - Lobby page (SSG, public room list)                       │   │
│  │  - Game room page (CSR, WebSocket real-time)                │   │
│  │  - Player identity (UUID in localStorage)                    │   │
│  │  - Game engine (pure JS, no React dependency for logic)      │   │
│  │  - Card rendering and animations                             │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                     │
│                    HTTP REST + WebSocket                            │
│                                │                                     │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │  apps/api — FastAPI (Python 3.11+)                          │   │
│  │  - Room management (create, join, leave, list)              │   │
│  │  - Game state management (create, move, end)                │   │
│  │  - WebSocket server for real-time events                    │   │
│  │  - Turn validation and rule enforcement (server-authoritative)│   │
│  │  - Player identity verification                              │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                     │
│                    MongoDB Protocol (async driver)                 │
│                                │                                     │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │  MongoDB Atlas 10.60.184.61:27017                           │   │
│  │  - rooms collection (lobby state, TTL auto-cleanup)         │   │
│  │  - games collection (active + completed games)              │   │
│  │  - players subdocuments (hand, score, connected status)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Vercel (Deployment Platform)   │
│  - apps/web: Next.js on Vercel  │
│  - apps/api: FastAPI on Vercel  │
└─────────────────────────────────┘
```

### 2.2 External System Integrations
| External System | Purpose | Integration Method |
|-----------------|---------|-------------------|
| MongoDB Atlas | Persistent game & room data | Motor (async Python driver) |
| Vercel | Frontend hosting + API serverless | Auto-deploy on git push |
| WebSocket | Real-time player sync | FastAPI WebSocket + Python |

### 2.3 Data Flow Overview
1. User opens URL → Vercel serves Next.js app (global CDN edge)
2. App loads in browser → generates anonymous playerId (UUID v4 in localStorage)
3. User creates/joins room → REST call to FastAPI → MongoDB stores room
4. Host starts game → game created, deck shuffled (server-side crypto), 7 cards dealt per player
5. Game state updates → WebSocket pushes to all players in room
6. Player plays card → FastAPI validates move → updates MongoDB → broadcasts to all
7. Game ends → result saved to MongoDB history → shown to all players
8. Room auto-deleted after all players leave + 7 day TTL

### 2.4 Key Non-Functional Requirements
- **Performance**: First contentful paint < 1.5s, time to interactive < 3s
- **Scalability**: Support 50+ concurrent games (200+ players) on free tier
- **Availability**: 99.5% uptime (Vercel SLA + MongoDB Atlas SLA)
- **Data Persistence**: All game data persists across sessions in MongoDB
- **Mobile Support**: Full gameplay at 375px viewport, touch-friendly
- **Latency**: WebSocket round-trip < 200ms for same-region players

## 3. Technology Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|--------|-------|
| Monorepo Manager | Bun | 1.x | Workspace management, fast installs |
| Frontend Framework | Next.js | 14+ | App Router, React Server Components |
| Frontend Language | TypeScript | 5.x | Strict mode enabled |
| UI Styling | Tailwind CSS | 3.x | Mobile-first responsive design |
| Backend Framework | FastAPI | 0.109+ | Python 3.11+, async first |
| Backend Language | Python | 3.11+ | Type hints, Pydantic validation |
| Database | MongoDB | 6.x | Motor async driver, Mongoose-like ODM |
| DB Host | MongoDB Atlas | — | Host: 10.60.184.61:27017 |
| Real-time | WebSocket | — | FastAPI native WebSocket support |
| Hosting | Vercel | — | Serverless functions for API |
| Package Manager | Bun | 1.x | Faster than npm/yarn/pnpm |

## 4. UNO Game Rules Summary

### 4.1 The Deck (108 cards)
- **Number Cards (76)**: 4 colors (Red, Yellow, Green, Blue) × numbers 0–9 (1 zero per color, 2 of each 1–9)
- **Action Cards (24)**: 4 colors × 3 types × 2 copies each
  - Skip: Next player loses turn
  - Reverse: Direction of play switches
  - +2: Next player draws 2 and loses turn
- **Wild Cards (8)**: 4 Wild + 4 Wild +4
  - Wild: Player chooses next color
  - Wild +4: Player chooses color + next player draws 4

### 4.2 Core Gameplay
1. Deal 7 cards to each player, place 1 card face-up to start discard pile
2. Active player must play a card matching the top discard by color OR number/action
3. If no valid card, draw 1 card (can play it if valid, else turn passes)
4. Special cards trigger immediately (Skip, Reverse, +2, Wild effects)
5. When down to 1 card, player must click "UNO!" button
6. First player to empty their hand wins the round

### 4.3 Turn Order & Direction
- Default: clockwise
- Reverse card flips direction (still current player's turn after reversal)
- After Skip: the player after the skipped one takes turn

### 4.4 Penalty Rules
- Failure to call UNO when playing second-to-last card: +2 cards penalty (house rule, can be toggled)
- Playing invalid card: turn forfeited, card returned to hand

## 5. Security Considerations
- Anonymous player IDs (UUID v4) — no PII stored
- No authentication required for core gameplay
- Input validation on all API endpoints (Pydantic)
- Rate limiting on API routes (slowapi middleware)
- WebSocket connection verification via player token

## 6. Cost Projection (Free Tier)

| Service | Free Tier Limit | Projected Usage | Buffer |
|---------|-----------------|-----------------|--------|
| Vercel (serverless) | 100GB bandwidth/mo | ~10GB | ✅ OK |
| Vercel (functions) | 100K requests/day | ~5K/day | ✅ OK |
| MongoDB Atlas M0 | 512MB storage | ~50MB (1000 games) | ✅ OK |
| Bun | Unlimited | N/A | ✅ OK |

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| MongoDB storage limit hit | Low | High | Archive old games, TTL auto-cleanup |
| WebSocket connection limits | Medium | Medium | Max 10 players per room, graceful disconnect |
| Concurrent game writes | Medium | High | Server-side turn lock (atomic MongoDB ops) |
| Cold start latency (serverless) | Low | Low | Keep functions warm, optimize bundle |
| Player disconnections | High | Medium | Bot takes over after 30s timeout |
| Invalid client moves | Medium | High | Server always validates, ignore bad data |

## 8. Project Structure

```
uno-online/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── page.tsx    # Lobby
│   │   │   │   ├── room/[id]/  # Game room
│   │   │   │   └── api/        # API route proxies (if needed)
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Generic UI
│   │   │   │   └── game/       # Game-specific components
│   │   │   ├── lib/
│   │   │   │   ├── engine/     # Pure JS UNO engine (no React)
│   │   │   │   ├── api.ts      # API client
│   │   │   │   └── player.ts   # Player identity
│   │   │   └── types/          # Shared TypeScript types
│   │   ├── package.json
│   │   └── ...
│   └── api/                    # FastAPI backend
│       ├── src/
│       │   ├── main.py         # FastAPI app entry
│       │   ├── routers/        # API route modules
│       │   │   ├── rooms.py
│       │   │   ├── games.py
│       │   │   └── websocket.py
│       │   ├── models/        # Pydantic models
│       │   ├── db/            # MongoDB connection
│       │   └── game_logic/    # UNO rules engine (Python)
│       ├── requirements.txt
│       └── ...
├── package.json               # Bun workspace root
├── bun.lockb
└── README.md
```