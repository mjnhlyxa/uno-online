# uno-online — Real-time Communication Design

> **C4 Level**: 3 — Real-time Component Design
> **Status**: Draft | Created: 2026-05-29

## 1. Real-time Architecture Overview

### 1.1 Communication Options Considered

| Approach | Latency | Complexity | Scalability | Notes |
|----------|---------|------------|-------------|-------|
| Long Polling | 1-3s | Low | Medium | Simple, works on serverless |
| Short Polling (3s) | 3s | Low | High | Battery efficient, good enough |
| Server-Sent Events (SSE) | <100ms | Medium | Medium | Uni-directional, serverless-compatible |
| WebSocket | <100ms | High | Medium | Bi-directional, full-duplex |
| Socket.io | <100ms | Medium | Medium | Auto-reconnection built-in |

### 1.2 Chosen Approach: WebSocket + Fallback

**Primary**: Native WebSocket for real-time game events
**Fallback**: Polling every 5s if WebSocket fails or for non-critical updates (lobby list)

Why WebSocket over SSE:
- Bi-directional: client can send moves, server pushes updates
- Lower latency: no HTTP overhead per message
- Full-duplex: simultaneous send/receive
- Built-in reconnection handling in browsers

Why not Socket.io:
- Adds dependency weight (bundle size)
- WebSocket native API is sufficient for our use case
- FastAPI has native WebSocket support

---

## 2. WebSocket Protocol

### 2.1 Connection Flow

```
Browser                           FastAPI
    │                                │
    │  new WebSocket(`/ws/${roomId}`)│
    │───────────────────────────────>│
    │                                │
    │  auth message (playerId)       │
    │───────────────────────────────>│
    │                                │ validate playerId in room
    │                                │ register connection
    │  auth_ok + current state        │
    │<───────────────────────────────│
    │                                │
    │  game events (game_update,     │
    │            turn_changed, etc)   │
    │<───────────────────────────────│
    │                                │
    │  player actions (play_card,    │
    │               draw_card, etc)  │
    │───────────────────────────────>│
    │                                │ validate + apply
    │  game_update (new state)       │
    │<───────────────────────────────│
    │                                │
    │  ping/pong every 30s            │
    │<───────────────────────────────│
```

### 2.2 WebSocket URL Structure
```
wss://uno-api.vercel.app/ws/{roomId}
```

### 2.3 First Message (Auth)
```json
{
  "type": "auth",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2.4 Server Auth Response
```json
{
  "type": "auth_ok",
  "playerIndex": 0,
  "room": { "id": "...", "name": "...", "players": [...] },
  "gameState": { /* full game if active, null if waiting */ }
}
```

### 2.5 Error Response
```json
{
  "type": "auth_error",
  "error": "ROOM_NOT_FOUND" | "PLAYER_NOT_IN_ROOM" | "ALREADY_CONNECTED"
}
```

---

## 3. Event Types

### 3.1 Server → Client Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `game_update` | `{game: GameState, action: Action}` | Any game state change |
| `player_joined` | `{player: Player, playerCount: int}` | New player joins room |
| `player_left` | `{playerId: string, playerCount: int}` | Player leaves room |
| `player_disconnected` | `{playerId: string}` | WS connection lost |
| `player_reconnected` | `{playerId: string}` | WS reconnects |
| `turn_changed` | `{currentTurnIndex: int, activeColor: str}` | Turn advances |
| `game_over` | `{winner: {index, name}, reason: str}` | Game ends |
| `uno_called` | `{playerId: string}` | Player calls UNO |
| `error` | `{error: str, message: str}` | Invalid action |
| `ping` | `{timestamp: int}` | Keepalive |

### 3.2 Client → Server Messages

| Message | Payload | Description |
|---------|---------|-------------|
| `auth` | `{playerId: string}` | Authenticate connection |
| `play_card` | `{cardIndex: int, chosenColor?: str}` | Play card from hand |
| `draw_card` | `{}` | Draw from deck |
| `call_uno` | `{}` | Call UNO |
| `forfeit` | `{}` | Quit game |
| `chat` | `{message: str}` | Chat message (max 200 chars) |
| `ping_response` | `{timestamp: int}` | Respond to server ping |

---

## 4. Connection Lifecycle

### 4.1 Connection States
```
DISCONNECTED
    │
    │ connect()
    ▼
CONNECTING
    │
    │ onopen → send auth
    ▼
AUTHENTICATING
    │
    │ auth_ok received
    ▼
CONNECTED (lobby)
    │
    │ host starts game
    ▼
CONNECTED (playing)
    │
    │ game ends / all leave
    ▼
DISCONNECTED
```

### 4.2 Reconnection Handling
```typescript
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    showReconnectFailedUI();
    return;
  }

  const delay = RECONNECT_DELAYS[reconnectAttempts];
  reconnectAttempts++;

  setTimeout(() => {
    connect(roomId, playerId);
  }, delay);
}
```

---

## 5. Message Queue & Ordering

### 5.1 Message Ordering Guarantee
- WebSocket guarantees ordering within a single connection
- All game state updates include a `version` or `timestamp` field
- Client applies updates in order; out-of-order messages are dropped

### 5.2 Handling Stale Connections
```python
# Server: detect stale connection by ping timeout
async def ping_handler(websocket, interval=30):
    while True:
        try:
            await websocket.send_json({"type": "ping", "timestamp": time.time()})
            await asyncio.sleep(interval)
        except websockets.ConnectionClosed:
            break
```

---

## 6. Lobby List Updates

### 6.1 Polling vs WebSocket for Lobby
- Lobby page: polling every 5s via SWR (simpler, not critical)
- Game page: WebSocket only (real-time critical)

```typescript
// Lobby room list — SWR polling
const { data: rooms } = useSWR('/api/rooms', fetcher, {
  refreshInterval: 5000,
  revalidateOnFocus: true,
});
```

---

## 7. Message Size Budget

### 7.1 Payload Size Guidelines
| Message Type | Typical Size | Max Size |
|-------------|--------------|----------|
| `game_update` (full state) | ~2KB | ~5KB |
| `player_joined` | ~200B | ~500B |
| `ping/pong` | ~50B | ~100B |
| `chat` | ~100-300B | ~500B |

### 7.2 Compression
- WebSocket messages are not compressed by default
- For large payloads, consider `permessage-deflate` extension
- Most game state updates are well under Vercel's 4MB WebSocket frame limit

---

## 8. Scalability Considerations

### 8.1 Connection Limits
- Vercel (Hobby): 100 concurrent connections
- Vercel (Pro): 1,000 concurrent connections
- FastAPI + Uvicorn on serverless: cold start affects WS

### 8.2 Broadcast Strategy
```python
# Broadcast to all players in room
async def broadcast_to_room(room_id: str, message: dict):
    if room_id not in connection_manager.rooms:
        return

    disconnected = []
    for player_ws in connection_manager.rooms[room_id]:
        try:
            await player_ws.send_json(message)
        except websockets.ConnectionClosed:
            disconnected.append(player_ws)

    # Remove disconnected
    for ws in disconnected:
        connection_manager.rooms[room_id].remove(ws)
```

### 8.3 Horizontal Scaling (Future)
If we need more WS capacity:
- Use a dedicated WebSocket server (not serverless)
- Redis Pub/Sub for cross-instance message routing
- Use a managed service (Pusher, Ably, PubNub)