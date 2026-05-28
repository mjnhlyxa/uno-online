# uno-online — Container Architecture

> **Status**: Draft | Created: 2026-05-29
> **C4 Level**: 2 — Container/Application Architecture

## 1. High-Level Container Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER CLIENTS                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────────┐  │
│  │  Desktop Browser │    │   Mobile Browser │    │   Spectator Browser   │  │
│  │  (Chrome/Firefox) │    │   (Safari/Chrome)│    │   (Read-only viewer)  │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────────┬─────────┘  │
└───────────┼────────────────────────┼───────────────────────────┼──────────────┘
            │                        │                           │
            │  HTTPS + WebSocket     │                           │
            ▼                        ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL EDGE                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     apps/web — Next.js 14                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Static Layer (CDN-cached)                                      │  │  │
│  │  │  - / (Lobby page — pre-rendered)                               │  │  │
│  │  │  - /room/[id] (SSG shell + client hydration)                   │  │  │
│  │  │  - Static assets (JS, CSS, images)                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Dynamic Layer (SSR/CSR)                                        │  │  │
│  │  │  - Lobby: fetches public room list from API every 5s            │  │  │
│  │  │  - Game room: WebSocket connection + game state display         │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────┬─────────────────────────────────────┘  │
│                                     │                                         │
│                    HTTP REST + WebSocket (wss://)                            │
│                                     │                                         │
│  ┌──────────────────────────────────▼─────────────────────────────────────┐  │
│  │                     apps/api — FastAPI                                  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │  │  REST API Layer                                                  │   │  │
│  │  │  - POST /rooms — Create room                                    │   │  │
│  │  │  - GET /rooms — List public rooms                                │   │  │
│  │  │  - GET /rooms/{id} — Get room details                            │   │  │
│  │  │  - POST /rooms/{id}/join — Join room                             │   │  │
│  │  │  - POST /rooms/{id}/leave — Leave room                           │   │  │
│  │  │  - POST /games — Create game                                     │   │  │
│  │  │  - GET /games/{id} — Get game state                              │   │  │
│  │  │  - POST /games/{id}/start — Start game                           │   │  │
│  │  └──────────────────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │  │  WebSocket Layer                                                 │   │  │
│  │  │  - WS /ws/rooms/{id} — Room real-time events                    │   │  │
│  │  │  - WS /ws/games/{id} — Game real-time events                     │   │  │
│  │  │  - Connection auth: player token in first message                │   │  │
│  │  │  - Heartbeat: ping every 30s to detect stale connections        │   │  │
│  │  └──────────────────────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │  │  Game Logic Layer (Server-authoritative)                         │   │  │
│  │  │  - UNO rules engine (Python pure functions)                      │   │  │
│  │  │  - Move validation (color/number match, action effects)          │   │  │
│  │  │  - Turn order management (direction, skip, reverse)              │   │  │
│  │  │  - Win detection (empty hand = win)                              │   │  │
│  │  │  - Deck shuffling (secrets.token_hex for crypto randomness)     │   │  │
│  │  └──────────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────┬─────────────────────────────────────┘  │
│                                     │                                         │
│                    MongoDB Wire Protocol (async)                            │
│                                     │                                         │
│  ┌──────────────────────────────────▼─────────────────────────────────────┐  │
│  │              MongoDB Atlas 10.60.184.61:27017                         │  │
│  │  ┌───────────────────────────┐   ┌────────────────────────────────┐    │  │
│  │  │  rooms collection         │   │  games collection              │    │  │
│  │  │  - roomId (ObjectId)      │   │  - gameId (ObjectId)           │    │  │
│  │  │  - name (string)          │   │  - roomId (ObjectId ref)       │    │  │
│  │  │  - players[]              │   │  - players[] (hand, score)    │    │  │
│  │  │  - isPrivate (bool)       │   │  - deck[] (card objects)     │    │  │
│  │  │  - maxPlayers (int)       │   │  - discardPile[]              │    │  │
│  │  │  - status (lobby/playing)│   │  - currentTurn (player idx)   │    │  │
│  │  │  - createdAt (datetime)  │   │  - direction (cw/ccw)         │    │  │
│  │  └───────────────────────────┘   │  - status (waiting/playing/end)│    │  │
│  │                                   │  - createdAt, updatedAt       │    │  │
│  │                                   └────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Application Boundaries

### 2.1 apps/web (Next.js) — What it owns
- **Serves UI**: React components for lobby, game room, player hands
- **Manages client state**: localStorage playerId, UI state (selected card, modals)
- **Handles WebSocket client**: connects to FastAPI WS, renders updates
- **Game engine (pure JS)**: `engine.ts` — rule validation, card matching logic (mirrors Python backend for instant client feedback)
- **Does NOT own**: persistent game state, turn validation, deck operations

### 2.2 apps/api (FastAPI) — What it owns
- **Game state authority**: MongoDB stores authoritative game state
- **Turn validation**: Every move validated server-side before applying
- **Deck operations**: Shuffling, dealing, card effects
- **Room lifecycle**: Create, join, leave, auto-cleanup
- **WebSocket server**: Manages WS connections per room/game
- **Does NOT own**: Browser rendering, client-side state, CSS

## 3. Communication Patterns

### 3.1 Browser ↔ apps/web (Next.js)
| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Page load | Serve HTML + JS bundle | Vercel Edge CDN |
| Client-side navigation | SPA page transitions | Next.js App Router |
| Static data fetch | Room list on lobby | SWR with 5s polling |
| Game state sync | Real-time game updates | WebSocket to FastAPI |

### 3.2 apps/web ↔ apps/api (FastAPI)
| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| REST calls | Room CRUD, game create/start | `fetch()` to FastAPI endpoints |
| WebSocket | Real-time game events | Native WebSocket client |
| Player auth | Verify player identity | Token in WS first message |

### 3.3 apps/api ↔ MongoDB
| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Async queries | Fetch game/room state | Motor (async MongoDB driver) |
| Atomic writes | Apply moves, update state | `findOneAndUpdate` with conditions |
| Real-time subscriptions | Watch for changes | MongoDB change streams (optional) |

## 4. Data Flow Diagrams

### 4.1 Create Room Flow
```
Browser              apps/web           apps/api           MongoDB
   │                    │                  │                  │
   │  click "Create"    │                  │                  │
   │───────────────────>│                  │                  │
   │                    │  POST /rooms     │                  │
   │                    │─────────────────>│                  │
   │                    │                  │  insertOne room  │
   │                    │                  │─────────────────>│
   │                    │                  │  <─ roomId       │
   │                    │                  │<─────────────────│
   │                    │  { id, shareUrl }│                  │
   │  { roomId, link }  │<─────────────────│                  │
   │<───────────────────│                  │                  │
```

### 4.2 Start Game Flow
```
Browser              apps/web           apps/api           MongoDB
   │                    │                  │                  │
   │  click "Start"     │                  │                  │
   │───────────────────>│                  │                  │
   │                    │  POST /games     │                  │
   │                    │─────────────────>│                  │
   │                    │                  │  shuffle deck    │
   │                    │                  │  deal 7 cards    │
   │                    │                  │  insertOne game  │
   │                    │                  │─────────────────>│
   │                    │                  │<─────────────────│
   │                    │  { gameId, deck }│                  │
   │  gameId + hand     │<─────────────────│                  │
   │<───────────────────│                  │                  │
   │                    │                  │                  │
   │  WS connect        │                  │                  │
   │───────────────────>│  WS upgrade      │                  │
   │                    │─────────────────>│                  │
   │                    │                  │  join room WS    │
   │                    │                  │─────────────────>│
```

### 4.3 Play Card Flow
```
Browser              apps/web           apps/api           MongoDB
   │                    │                  │                  │
   │  tap card to play  │                  │                  │
   │───────────────────>│                  │                  │
   │                    │  WS send move    │                  │
   │                    │─────────────────>│                  │
   │                    │                  │  validate move   │
   │                    │                  │  (color/number) │
   │                    │                  │  apply to game   │
   │                    │                  │  findOneAndUpdate│
   │                    │                  │─────────────────>│
   │                    │                  │<─────────────────│
   │                    │  WS broadcast    │                  │
   │  game state        │<─────────────────│                  │
   │<───────────────────│                  │                  │
```

## 5. Deployment Architecture

### 5.1 Vercel Projects
```
┌─────────────────────────────────────────────────────┐
│  Vercel Organization: mjnhlyxa                      │
│                                                     │
│  ┌────────────────────┐  ┌────────────────────┐   │
│  │  uno-online-web    │  │  uno-online-api    │   │
│  │  (Next.js)         │  │  (FastAPI)         │   │
│  │                    │  │                    │   │
│  │  Domain:           │  │  Domain:           │   │
│  │  uno-online.verce..│  │  uno-api.vercel... │   │
│  │                    │  │                    │   │
│  │  Framework:        │  │  Runtime:          │   │
│  │  Next.js 14        │  │  Python 3.11       │   │
│  └────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 5.2 Environment Variables
```
# apps/web (.env.local)
NEXT_PUBLIC_API_URL=https://uno-api.vercel.app
NEXT_PUBLIC_WS_URL=wss://uno-api.vercel.app

# apps/api (.env)
MONGODB_URI=mongodb://10.60.184.61:27017/uno_online
MONGODB_DB=uno_online
CORS_ORIGINS=https://uno-online.vercel.app,http://localhost:3000
```

### 5.3 CI/CD Pipeline
1. Developer pushes to `main` branch
2. GitHub Actions triggers:
   - Lint + type-check (apps/web and apps/api)
   - Unit tests (game logic)
   - Deploy to Vercel preview
3. On merge to main:
   - Auto-deploy to Vercel production
   - API redeploy triggers WS reconnect (clients auto-reconnect)

## 6. Container Responsibilities

| Container | Responsibilities | Failure Modes |
|-----------|-----------------|----------------|
| Browser (web) | Render UI, send moves, display state | Network drop → show reconnecting state |
| Next.js (web) | Serve pages, proxy API calls | Cold start → 2-3s delay |
| FastAPI (api) | Validate moves, manage state, broadcast | Crash → clients reconnect to new instance |
| MongoDB (db) | Persist state, provide queries | Latency spike → slower game updates |

## 7. Cross-Cutting Concerns

### 7.1 Error Handling Strategy
- **Client errors**: Show toast notification, log to console, do not crash
- **Server errors**: Return JSON error with code, client shows user-friendly message
- **WebSocket disconnects**: Exponential backoff reconnect (1s, 2s, 4s, max 30s)

### 7.2 Logging Strategy
- **apps/web**: `console.log` during development, no-op in production
- **apps/api**: Python `logging` module, structured JSON logs to stdout
- **Key events to log**: room created, game started, game ended, player disconnected

### 7.3 Health Checks
- `/health` endpoint on FastAPI returns `{"status": "ok"}`
- Vercel serverless function health check calls this
- MongoDB connection tested before returning healthy