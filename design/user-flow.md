# uno-online — User Flow

> **Status**: Draft | Created: 2026-05-29

## 1. User Flow Diagram

```
[LANDING PAGE — Lobby]
    │
    ├── [Create Room] ──────────────────────────────────────────────────┐
    │    │                                                             │
    │    │ Modal: enter room name, max players, private toggle          │
    │    ▼                                                             │
    │    └──→ [ROOM — Waiting Lobby] ◄─────────────────────────────────┤
    │         │                                                         │
    │         ├── [Share Link] (copy to clipboard)                       │
    │         │                                                         │
    │         ├── Player joins via link ───────────────────────────────┘
    │         │                                                         │
    │         ├── Host clicks "Start Game"                              │
    │         │    (requires 2+ players)                                │
    │         ▼                                                         │
    │    [GAME ROOM — Playing]                                          │
    │         │                                                         │
    │         ├── Player plays card (or draws)                         │
    │         ├── UNO call when hand = 1                               │
    │         │                                                         │
    │         └── Someone empties hand ─────────────────────────────┐   │
    │                                                              │    │
    │         [GAME OVER]                                           │    │
    │              │                                                │    │
    │              ├── [Rematch] → [ROOM — Waiting] (same players) ──┘   │
    │              ├── [Play Again] → [LOBBY]                          │
    │              └── [Leave] → [LOBBY]                               │
    │                                                              │    │
    ├── [Join Room] ─────────────────────────────────────────────────┘
    │    │                                                             │
    │    ├── Via shareable link → [ROOM — Waiting/Playing]             │
    │    │    (if game already started, spectator mode)                 │
    │    │                                                             │
    │    └── Via room code → [ROOM LIST] → select room → [ROOM]         │
    │                                                             │
    └── [Browse Public Rooms] → [ROOM LIST] → join → [ROOM]
```

## 2. Screen Descriptions

### Screen 1: Landing Page (Lobby)
**URL**: `/` (or `/lobby`)
**Purpose**: Entry point — create or join a room

**What the user sees**:
- Game logo/title: "UNO Online"
- Tagline: "Play UNO with friends online — no account needed"
- Two primary buttons: "Create Room" and "Join Room"
- List of public rooms available to join (if any)
- Player name shown in corner (e.g., "Player 847")

**Actions available**:
- Click "Create Room" → opens Create Room modal
- Click "Join Room" → opens Join Room modal
- Click public room → joins that room
- Player can edit their name (click on name to edit inline)

**Transitions**:
- Create Room → ROOM (waiting lobby)
- Join Room → ROOM (waiting or playing)
- Public room → ROOM (waiting or playing)

---

### Screen 2: Room — Waiting Lobby
**URL**: `/room/[roomId]`
**Purpose**: Wait for players before starting game

**What the user sees**:
- Room name and code (for sharing)
- List of players in the room (avatar, name, "Host" badge if applicable)
- Share button (copies link)
- "Waiting for players..." if < 2 players
- "Ready to start!" if 2+ players
- Start Game button (host only, 2+ players required)
- Leave Room button

**Actions available**:
- Share link (copies to clipboard, shows "Copied!" toast)
- Start Game (host, 2+ players)
- Leave Room → returns to Lobby

**Transitions**:
- Start Game → GAME ROOM (playing)
- Leave Room → LOBBY

---

### Screen 3: Game Room — Playing
**URL**: `/room/[roomId]`
**Purpose**: Actual gameplay

**What the user sees**:
- **Center**: Discard pile with top card face up
- **Center**: Draw deck (click to draw)
- **Bottom**: Your hand of cards (horizontal scroll)
- **Top/Left/Right**: Other players' panels showing hand count
- **Indicator**: "Your turn" or "[Name]'s turn"
- **Direction arrow**: clockwise or counter-clockwise
- **Active color indicator**: current color to match
- **UNO button**: appears when you have 1 card left

**Actions available**:
- Click a playable card → plays it (highlights playable cards)
- Click draw deck → draws a card
- Click UNO button when at 1 card
- Color picker modal (appears after playing Wild/Wild+4)
- Chat (future) / Emoji reactions (future)

**Transitions**:
- Play valid card → turn passes to next player
- Draw card → turn passes (unless drawn card can be played)
- Empty hand → GAME OVER

---

### Screen 4: Game Over
**URL**: `/room/[roomId]` (same page, overlay)
**Purpose**: Show winner and offer rematch

**What the user sees**:
- Winner announcement: "[Player Name] Wins!"
- Confetti animation for winner
- "Reason: Empty hand" or "Other player forfeit"
- Cards remaining for each player (if showing scores)
- Three buttons: "Rematch", "Play Again", "Leave"

**Actions available**:
- Rematch → same players, new game round
- Play Again → new room created, players go to lobby
- Leave → return to lobby

**Transitions**:
- Rematch → GAME ROOM (new round, same players)
- Play Again → LOBBY
- Leave → LOBBY

---

## 3. Guest / Anonymous User Flow

```
First Visit
    │
    ├── Open URL → get player ID (UUID) + random name "Player 847"
    │
    ├── See LOBBY with "Create Room" / "Join Room"
    │
    ├── Create Room → Room created, user is host
    │
    ├── Share link with friend
    │
    ├── Friend opens link → joins room (gets their own ID)
    │
    ├── Host clicks Start
    │
    └── → GAME ROOM Playing
```

---

## 4. Reconnection Flow

```
Connection Lost (WebSocket disconnect)
    │
    ├── UI shows "Reconnecting..." banner
    │
    ├── Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    │
    ├── On reconnect: re-authenticate with same playerId
    │
    ├── Server responds with auth_ok + current game state
    │
    ├── UI resumes from exact state
    │
    └── If 30s timeout: player marked as "disconnected"
         │
         └── Bot takes over for disconnected player
```

---

## 5. Spectator Flow (Future)

```
Player opens room link
    │
    ├── Room is in "playing" state
    │
    ├── Player not in player list
    │
    └── → SPECTATOR MODE (read-only)
         │
         ├── Sees all players' hands (but not card contents)
         ├── Sees discard pile
         ├── Sees turn indicator
         │
         └── Cannot play cards (watch only)
```