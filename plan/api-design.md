# uno-online — API Design

> **C4 Level**: 3 — Component Specification (API)
> **Status**: Draft | Created: 2026-05-29

## 1. API Overview

### 1.1 Base URLs
```
REST API:     https://uno-api.vercel.app/api
WebSocket:    wss://uno-api.vercel.app/ws
```

### 1.2 Authentication
No authentication required. Player identity is:
- **Client generates**: UUID v4 stored in `localStorage`
- **Sent with every request**: `X-Player-ID` header or WS first message
- **Server validates**: Player ID exists in the room/game

### 1.3 Request/Response Format
All REST endpoints accept and return JSON:
```
Content-Type: application/json
Accept: application/json
```

### 1.4 Error Response Format
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}  // Optional additional context
}
```

### 1.5 Error Codes
| HTTP | Error Code | Meaning |
|------|------------|---------|
| 400 | INVALID_REQUEST | Malformed JSON or missing fields |
| 400 | INVALID_MOVE | Card cannot be played |
| 403 | NOT_YOUR_TURN | Player trying to move out of turn |
| 403 | GAME_NOT_ACTIVE | Game already finished |
| 403 | NOT_ROOM_HOST | Only host can perform action |
| 404 | ROOM_NOT_FOUND | Room ID does not exist |
| 404 | GAME_NOT_FOUND | Game ID does not exist |
| 409 | ROOM_FULL | Cannot join — at max players |
| 409 | PLAYER_ALREADY_IN_ROOM | Player already in this room |
| 410 | PLAYER_NOT_IN_ROOM | Player never joined this room |
| 429 | RATE_LIMITED | Too many requests |

---

## 2. REST Endpoints

### 2.1 Health Check

#### `GET /api/health`
Returns server health status.
```json
// Response 200
{ "status": "ok", "mongodb": "connected", "timestamp": "2026-05-29T10:00:00Z" }
```

---

### 2.2 Room Endpoints

#### `POST /api/rooms` — Create Room

**Request:**
```json
{
  "name": "Phòng của Minh",
  "maxPlayers": 4,
  "isPrivate": false,
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "playerName": "Player 847"
}
```

**Response (201):**
```json
{
  "success": true,
  "room": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Phòng của Minh",
    "maxPlayers": 4,
    "isPrivate": false,
    "currentPlayers": [
      { "id": "550e8400-...", "name": "Player 847", "isHost": true, "connected": true, "joinedAt": "2026-05-29T10:00:00Z" }
    ],
    "status": "lobby",
    "shareUrl": "https://uno-online.vercel.app/room/65f1a2b3c4d5e6f7",
    "createdAt": "2026-05-29T10:00:00Z"
  }
}
```

**Errors:**
- `400 INVALID_REQUEST`: Missing required fields
- `429 RATE_LIMITED`: Too many room creations

---

#### `GET /api/rooms` — List Public Rooms

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `lobby` | Filter by room status |
| `limit` | int | 20 | Max rooms to return (1-50) |
| `offset` | int | 0 | Pagination offset |

**Response (200):**
```json
{
  "success": true,
  "rooms": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Phòng của Minh",
      "maxPlayers": 4,
      "currentPlayers": [
        { "id": "550e8400-...", "name": "Player 847", "isHost": true }
      ],
      "playerCount": 1,
      "status": "lobby"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /api/rooms/{roomId}` — Get Room Details

**Response (200):**
```json
{
  "success": true,
  "room": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Phòng của Minh",
    "isPrivate": false,
    "maxPlayers": 4,
    "currentPlayers": [...],
    "gameId": null,
    "status": "lobby",
    "createdAt": "2026-05-29T10:00:00Z"
  }
}
```

**Errors:**
- `404 ROOM_NOT_FOUND`: Room does not exist

---

#### `POST /api/rooms/{roomId}/join` — Join Room

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "playerName": "Player 123"
}
```

**Response (200):**
```json
{
  "success": true,
  "room": { /* full room object */ },
  "playerIndex": 2
}
```

**Errors:**
- `404 ROOM_NOT_FOUND`: Room does not exist
- `409 ROOM_FULL`: Room at max players
- `409 PLAYER_ALREADY_IN_ROOM`: Player already in room
- `410 ROOM_PLAYING`: Cannot join a game already in progress

---

#### `POST /api/rooms/{roomId}/leave` — Leave Room

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Left room successfully"
}
```

**Errors:**
- `404 ROOM_NOT_FOUND`
- `410 PLAYER_NOT_IN_ROOM`

---

#### `POST /api/rooms/{roomId}/kick` — Kick Player (Host Only)

**Request:**
```json
{
  "hostPlayerId": "550e8400-e29b-41d4-a716-446655440000",
  "targetPlayerId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200):**
```json
{
  "success": true,
  "room": { /* updated room */ }
}
```

**Errors:**
- `403 NOT_ROOM_HOST`
- `410 PLAYER_NOT_IN_ROOM`

---

### 2.3 Game Endpoints

#### `POST /api/games` — Create Game (Start Game in Room)

**Request:**
```json
{
  "roomId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "hostPlayerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "success": true,
  "game": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "roomId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "players": [
      { "id": "550e8400-...", "name": "Player 847", "hand": [/* 7 cards */], "connected": true },
      { "id": "550e8400-...", "name": "Player 123", "hand": [/* 7 cards */], "connected": true }
    ],
    "deck": [/* 94 cards */],
    "discardPile": [/* 1 card, face up */],
    "currentTurnIndex": 0,
    "direction": 1,
    "activeColor": "red",
    "status": "playing",
    "pendingDrawCount": 0
  }
}
```

**Errors:**
- `404 ROOM_NOT_FOUND`
- `403 NOT_ROOM_HOST`: Only host can start game
- `409 GAME_ALREADY_STARTED`: Game already exists in this room
- `409 NOT_ENOUGH_PLAYERS`: Need at least 2 players to start

---

#### `GET /api/games/{gameId}` — Get Game State

**Response (200):**
```json
{
  "success": true,
  "game": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "roomId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "players": [
      {
        "id": "550e8400-...",
        "name": "Player 847",
        "hand": [/* cards — visible only to card owner */],
        "connected": true
      }
    ],
    "deckCount": 94,
    "discardPile": [/* top card visible to all */],
    "currentTurnIndex": 0,
    "direction": 1,
    "activeColor": "red",
    "status": "playing",
    "pendingDrawCount": 0,
    "canPlayCards": [/* indices of playable cards in current player's hand */]
  }
}
```

**Notes:**
- `hand` is only populated for the player making the request (card ownership)
- `canPlayCards` returns indices of playable cards for the requesting player

---

#### `POST /api/games/{gameId}/play` — Play a Card

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "cardIndex": 3,
  "chosenColor": "blue"  // Required only for Wild/Wild+4
}
```

**Response (200):**
```json
{
  "success": true,
  "game": { /* full updated game state */ },
  "action": {
    "type": "PLAY_CARD",
    "cardPlayed": { "color": null, "type": "wild", "value": null },
    "newActiveColor": "blue",
    "nextTurnIndex": 1,
    "directionChanged": false,
    "actionEffect": null
  }
}
```

**Errors:**
- `400 INVALID_MOVE`: Card doesn't match discard top
- `403 NOT_YOUR_TURN`: Not player's turn
- `403 GAME_NOT_ACTIVE`: Game already finished

---

#### `POST /api/games/{gameId}/draw` — Draw a Card

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "success": true,
  "game": { /* full updated game state */ },
  "action": {
    "type": "DRAW_CARD",
    "drawnCard": { "color": "yellow", "type": "number", "value": 7 },
    "cardPlayed": false,
    "turnEnded": false
  }
}
```

**Notes:**
- If drawn card can be played, client shows "can play now" indicator
- `turnEnded: true` if drawn card could not be played (must pass turn)

---

#### `POST /api/games/{gameId}/uno` — Call UNO

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "success": true,
  "called": true,
  "handSize": 1
}
```

**Errors:**
- `400 NOT_ONE_CARD`: Player has more than 1 card
- `403 NOT_YOUR_TURN`: Not player's turn (optional rule)

---

#### `POST /api/games/{gameId}/forfeit` — Forfeit Game

**Request:**
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "success": true,
  "game": { /* final game state */ }
}
```

---

## 3. WebSocket Endpoints

### 3.1 Connection

**Endpoint**: `wss://uno-api.vercel.app/ws/{roomId}`

**First message (auth)**:
```json
{
  "type": "auth",
  "playerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Server response**:
```json
{
  "type": "auth_ok",
  "playerIndex": 1,
  "gameState": { /* full game if active */ }
}
```

**Error**:
```json
{
  "type": "auth_error",
  "error": "PLAYER_NOT_IN_ROOM"
}
```

### 3.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `game_update` | `{game: Game, action: Action}` | Full game state after any change |
| `player_joined` | `{player: Player, playerCount: int}` | New player entered room |
| `player_left` | `{playerId: string, playerCount: int}` | Player left room |
| `player_disconnected` | `{playerId: string}` | Player WebSocket dropped |
| `player_reconnected` | `{playerId: string}` | Player reconnected |
| `turn_changed` | `{currentTurnIndex: int, activeColor: str}` | Turn advanced |
| `game_over` | `{winner: {index, name}, reason: str}` | Game ended |
| `error` | `{error: string, message: string}` | Invalid action attempted |
| `ping` | `{timestamp: int}` | Keepalive |

### 3.3 Client → Server Messages

| Message | Payload | Description |
|---------|---------|-------------|
| `play_card` | `{cardIndex: int, chosenColor?: str}` | Play a card from hand |
| `draw_card` | `{}` | Draw from deck |
| `call_uno` | `{}` | Call UNO when at 1 card |
| `forfeit` | `{}` | Quit the game |
| `ping_response` | `{timestamp: int}` | Respond to keepalive |

### 3.4 WebSocket Protocol State Machine
```
DISCONNECTED
    │
    │ connect to /ws/{roomId} + send auth
    ▼
AUTHENTICATING
    │
    │ server validates playerId in room
    ▼
CONNECTED (in room lobby)
    │
    │ host starts game
    ▼
CONNECTED (in game)
    │
    │ game over or all players leave
    ▼
DISCONNECTED
```

---

## 4. API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/rooms` | 10 | per minute |
| `POST /api/games` | 20 | per minute |
| `POST /api/games/{id}/play` | 30 | per minute |
| WebSocket connection | 5 | per minute per IP |

Rate limit headers returned:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1716970860
```

---

## 5. API Versioning Strategy

- Current version: `v1` (base path `/api`)
- Version embedded in path for clarity
- Breaking changes will increment version (`/api/v2/...`)
- Old versions supported for 6 months after new version released

---

## 6. OpenAPI / Swagger

FastAPI auto-generates OpenAPI spec at:
```
GET /api/openapi.json  # Raw OpenAPI JSON
GET /api/docs          # Swagger UI (devenv only)
GET /api/redoc         # ReDoc (production)
```

Development: `http://localhost:8000/api/docs`
Production: Swagger disabled via `REDOC_ON_PROD=false` env var