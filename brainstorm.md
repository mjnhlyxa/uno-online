# uno-online — Brainstorm

> Status: Draft | Created: 2026-05-29

## Overview

UNO Online is a real-time multiplayer card game where players compete over the web using the classic UNO ruleset. Players create or join rooms, play matches in real-time, and can spectate ongoing games. No account required — anonymous play via browser cookie.

## Game Concept

- **Genre**: Card game — real-time multiplayer
- **Platform**: Web browser (desktop primary, mobile responsive)
- **Session length**: Quick 10–20 minute matches
- **Multiplayer**: Real-time rooms (2–10 players), spectator mode
- **Account required**: No — anonymous play by default

## Target Audience

- Casual gamers who want quick, fun matches with friends
- UNO fans who want to play remotely without installing an app
- Party game enthusiasts sharing a link to start a game instantly

## Core Gameplay Loop

1. Player lands on homepage → creates a room or joins via link
2. Room host starts game when 2+ players are ready
3. Cards are shuffled and dealt (7 cards each)
4. Players take turns clockwise, playing cards matching color or number/action
5. Special cards (Skip, Reverse, +2, Wild, Wild +4) change the flow
6. First player to empty their hand wins
7. Winner can start a new round or room dissolves

## Features

### Must-Have (MVP)
- **Room system**: Create room → get shareable link → wait for players
- **Real-time card sync**: All players see the same game state via WebSocket
- **UNO deck**: 108 cards (colors: Red/Yellow/Green/Blue, numbers 0–9, action cards, wild cards)
- **Turn validation**: Only valid moves accepted; server authoritative
- **Playable cards highlight**: Client shows which cards can be legally played
- **AI opponent**: Single-player mode with bot when no other players
- **Win detection**: First player to empty hand triggers win screen
- **Rematch**: Winner can trigger new round with same players

### Nice-to-Have (Post-MVP)
- **Spectator mode**: Watch ongoing games as a viewer
- **In-room chat**: Send text messages to other players
- **Emoji reactions**: Quick reactions instead of chat
- **Player kicking**: Host can remove a player
- **Sound effects**: Card play, UNO call, win/lose
- **Leaderboard**: Track wins across sessions
- **Friend list**: Invite specific players

### Out of Scope
- **Account/login system**: Anonymous only for v1
- **Tournament mode**: Scheduled competitive play
- **Mobile native app**: Web only
- **Offline mode**: Always online required
- **Custom deck themes**: Default UNO visual only

## User Experience Goals

- **Time to first game**: Target < 20 seconds from landing page to seeing cards dealt
- **No signup**: Player gets a random name (e.g., "Player 847") stored in cookie
- **Clear game state**: Visible deck, discard pile, current player indicator, hand size of opponents
- **Mobile**: Touch-friendly — tap card to play, tap deck to draw
- **Accessibility**: Color-blind mode with patterns/labels on cards

## Social & Virality Features

- **Shareable room link**: `https://uno-online.vercel.app/room/[roomId]` opens directly into game
- **Room code fallback**: If link doesn't work, show 4-character room code to enter
- **Public lobby**: List of public rooms available to join
- **"UNO!" call**: Prominent button to call UNO when down to one card

## Data to Persist

- **Room state**: roomId, players[], currentTurn, deck, discardPile, direction, createdAt
- **Game history**: winner, players, duration, timestamp
- **Player identity**: anonymous UUID stored in localStorage

## Technical Feasibility Assessment

### Straightforward
- Turn-based logic with validated moves is well understood
- WebSocket rooms are a solved pattern (Socket.io / native WS)
- MongoDB for room persistence (TTL index for auto-cleanup after game ends)
- Next.js for frontend — straightforward SSR + client state

### Complex or Risky
- **Real-time sync**: All players must see consistent state; need to handle latency and reconnects gracefully
- **Disconnection handling**: Player leaves mid-game — bot takes over or game pauses?
- **Concurrent writes**: Multiple players playing same turn (race condition) — need server-side turn lock
- **Card shuffling**: Need cryptographically random shuffle on server

### Open Questions
- How to handle reconnection mid-game — resume from MongoDB state?
- What happens if host leaves? Promote next player to host
- Should there be a timeout for idle players (auto-forfeit)?

## Competitive Landscape

- **Primary competitors**: [uno.com](https://www.uno.com), [play.unogame.com](https://play.unogame.com), [cardgames.io/uno](https://cardgames.io/uno/)
- **Differentiation**: No install, instant share link, spectating, modern UI
- **Our edge**: Vercel deployment for global low-latency, clean mobile-first UX