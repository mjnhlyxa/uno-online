# uno-online — Implementation Milestones

> **Status**: Draft | Created: 2026-05-29
> **C4 Level**: 3 — Component Specification (Milestones)

## Overview

Three-phase implementation plan targeting MVP launch in Phase 1, social features in Phase 2, and polish in Phase 3.

---

## Phase 1: MVP (Core Game) — Weeks 1-3

### Week 1: Foundation
**Goal**: Set up monorepo, basic app structure, MongoDB connection

**Deliverables**:
- [ ] Bun monorepo setup with `apps/web` (Next.js) + `apps/api` (FastAPI)
- [ ] Workspace configuration in `package.json`
- [ ] `apps/web`: Next.js 14 app with App Router, Tailwind, TypeScript
- [ ] `apps/api`: FastAPI app with Motor (async MongoDB driver)
- [ ] MongoDB connection singleton in `apps/api/src/db/mongodb.py`
- [ ] Health check endpoint `GET /api/health`
- [ ] Basic CI/CD: GitHub Actions → Vercel deploys on push to main

**Technical Tasks**:
```
day 1-2: Monorepo scaffold
day 3-4: Next.js app setup (app/, components/, lib/)
day 5-7: FastAPI setup, MongoDB connection, health check
```

**Milestone**: App starts, API responds, DB connected

---

### Week 2: Room System
**Goal**: Players can create rooms, join via link/code, see public lobby

**Deliverables**:
- [ ] `POST /api/rooms` — Create room endpoint
- [ ] `GET /api/rooms` — List public rooms endpoint
- [ ] `GET /api/rooms/{roomId}` — Get room details
- [ ] `POST /api/rooms/{roomId}/join` — Join room
- [ ] `POST /api/rooms/{roomId}/leave` — Leave room
- [ ] Lobby page: create room modal, room list, join by code
- [ ] Room page: show players, host controls, waiting state
- [ ] Anonymous player ID generation (UUID in localStorage)
- [ ] Room WebSocket events (player_joined, player_left)

**Technical Tasks**:
```
day 1-2: Room CRUD endpoints (FastAPI router)
day 3-4: MongoDB room schema + indexes
day 5-6: Lobby UI + room joining flow
day 7: WebSocket room events
```

**Milestone**: Player can create room, share link, another player joins

---

### Week 3: Core Game Logic
**Goal**: Full UNO game playable with proper rules, turn validation, win detection

**Deliverables**:
- [ ] `POST /api/games` — Create game (start in room)
- [ ] `GET /api/games/{gameId}` — Get game state
- [ ] `POST /api/games/{gameId}/play` — Play a card (with validation)
- [ ] `POST /api/games/{gameId}/draw` — Draw from deck
- [ ] `POST /api/games/{gameId}/uno` — Call UNO button
- [ ] Python UNO engine: deck shuffle, card dealing, turn order, direction
- [ ] Move validation: color match, number match, action card effects
- [ ] Server-authoritative rule enforcement (no invalid moves accepted)
- [ ] Game room WebSocket: game_update, turn_changed, game_over events
- [ ] Client UNO engine (pure JS, mirrors Python for instant feedback)
- [ ] Game UI: player hands, discard pile, draw deck, turn indicator
- [ ] Win detection: first player to empty hand

**Technical Tasks**:
```
day 1-2: Python game engine (deck, rules, validation)
day 3-4: Game API endpoints + MongoDB game schema
day 5-6: Game UI components (GameBoard, PlayerHand, DiscardPile)
day 7: End-to-end test + bug fixes
```

**Milestone**: Two players can complete a full game with correct rules

---

## Phase 2: Social Features — Weeks 4-5

### Week 4: Real-time Multiplayer + Spectator
**Goal**: Smooth real-time sync for 2-10 players, spectate ongoing games

**Deliverables**:
- [ ] WebSocket reconnection with exponential backoff
- [ ] Player disconnect detection (30s timeout)
- [ ] Bot player takes over disconnected player (AI logic)
- [ ] Spectator mode: join as read-only viewer
- [ ] Public rooms listing refreshes automatically (SWR polling)
- [ ] Share URL with room ID for instant join
- [ ] Room host can kick players

**Technical Tasks**:
```
day 1-2: WebSocket reconnect logic + disconnect detection
day 3-4: Bot player AI (simple: play valid card, prefer action cards)
day 5-6: Spectator mode + kick player
day 7: Stress test with multiple bots
```

**Milestone**: Game continues smoothly when player disconnects; spectating works

---

### Week 5: Social Polish
**Goal**: Chat, emoji reactions, rematch flow

**Deliverables**:
- [ ] In-room chat (text messages via WebSocket)
- [ ] Emoji reactions (quick reactions panel)
- [ ] "UNO!" call enforcement (penalty if forgotten)
- [ ] Rematch button (same players, new game)
- [ ] Match history: list of recent games with results
- [ ] Player name editing (before game starts)
- [ ] Host transfer when host leaves

**Technical Tasks**:
```
day 1-2: Chat + emoji reactions
day 3-4: UNO call enforcement + penalty logic
day 5-6: Rematch + match history
day 7: UI polish + testing
```

**Milestone**: Players can chat, rematch, and view history

---

## Phase 3: Polish & Launch — Weeks 6-7

### Week 6: UX Polish
**Goal**: Animations, sound effects, mobile optimization, accessibility

**Deliverables**:
- [ ] Card play animations (fly to discard, flip)
- [ ] Turn transition animations
- [ ] Win/lose celebration effects
- [ ] Sound effects (card play, UNO call, win)
- [ ] Mobile touch optimizations (larger tap targets)
- [ ] Color-blind mode (patterns/labels on cards)
- [ ] Loading states + skeleton screens
- [ ] Error toasts for user feedback

**Technical Tasks**:
```
day 1-2: Card animations + turn transitions
day 3-4: Sound effects (Howler.js or Web Audio API)
day 5-6: Mobile optimization + accessibility
day 7: Bug fixes + testing
```

**Milestone**: Game feels polished and works well on mobile

---

### Week 7: Launch Preparation
**Goal**: Documentation, SEO, monitoring, final deploy

**Deliverables**:
- [ ] README with setup instructions
- [ ] `games/uno-online/plan/` documents finalized
- [ ] Vercel production deployment verified
- [ ] MongoDB TTL indexes confirmed
- [ ] Error monitoring (Sentry or similar)
- [ ] Basic analytics (page views, games played)
- [ ] SEO: meta tags, OG images for room sharing

**Technical Tasks**:
```
day 1-2: Documentation + README
day 3-4: SEO meta tags + OG image generation
day 5-6: Monitoring setup + final bug fixes
day 7: Launch!
```

**Milestone**: Game live at production URL, stable, documented

---

## Milestone Timeline Summary

| Phase | Week | Focus | Key Deliverable |
|-------|------|-------|------------------|
| 1 | 1 | Foundation | Monorepo + DB connected |
| 1 | 2 | Rooms | Create/join rooms working |
| 1 | 3 | Core Game | Full game playable |
| 2 | 4 | Real-time | Disconnect handling + spectate |
| 2 | 5 | Social | Chat + rematch |
| 3 | 6 | Polish | Animations + mobile |
| 3 | 7 | Launch | Production + docs |

---

## Effort Estimates

| Task | Estimated Hours | Notes |
|------|-----------------|-------|
| Monorepo + CI/CD | 8h | Straightforward |
| Room system (API + UI) | 16h | CRUD + WebSocket |
| Game logic (Python) | 20h | Complex rules |
| Game UI | 24h | Many components |
| Real-time sync | 12h | WebSocket handling |
| Bot AI | 8h | Simple priority-based |
| Mobile + animations | 16h | CSS work |
| Testing + bug fixes | 16h | Throughout |
| **Total** | **~120h** | 3 weeks at 40h/week |

---

## Dependencies

- Week 1 → Week 2: Depends on monorepo setup being complete
- Week 2 → Week 3: Depends on room system working
- Week 3 → Week 4: Depends on game logic being correct
- Week 5+ can be parallel (UI polish vs social features)

---

## Out of Scope for v1

- Account/login system
- Tournament mode
- Custom deck themes
- Native mobile app
- Offline mode
- Payment/gacha