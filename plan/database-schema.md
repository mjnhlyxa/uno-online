# uno-online — Database Schema Design

> **C4 Level**: 3 — Component Specification (Database)
> **Status**: Draft | Created: 2026-05-29

## 1. Database Overview

### 1.1 Technology
- **Database**: MongoDB 6.x (replica set not required for M0)
- **ODM/Driver**: Motor (async Python driver) with Pydantic models
- **Host**: MongoDB Atlas M0 — `10.60.184.61:27017`
- **Database Name**: `uno_online`
- **Region**: Single region, closest to Vercel US East

### 1.2 Collections Summary
| Collection | Purpose | Est. Doc Size | Growth Rate |
|------------|---------|---------------|-------------|
| rooms | Active lobby rooms | ~1KB | ~20/day |
| games | Active + completed games | ~8KB | ~50/day |

### 1.3 Indexes Strategy
- **rooms**: `status=1, isPrivate=1` for public lobby listing
- **games**: `roomId=1` for looking up game by room, `status=1, createdAt=-1` for recent games
- **TTL Index**: rooms with `status=lobby` and no players for >7 days → auto-delete

## 2. Card Data Model

### 2.1 Card Representation (Embedded/Referenced)
```python
from enum import Enum
from typing import Literal

class Color(str, Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"
    BLUE = "blue"

class CardType(str, Enum):
    NUMBER = "number"
    SKIP = "skip"
    REVERSE = "reverse"
    DRAW_TWO = "draw_two"
    WILD = "wild"
    WILD_DRAW_FOUR = "wild_draw_four"

Card = {
    "color": Color | None,  # None for Wild/Wild+4
    "type": CardType,
    "value": int | None,   # 0-9 for number cards, None for action/wild
}
```

Example cards:
```python
{"color": "red", "type": "number", "value": 5}
{"color": "blue", "type": "skip", "value": null}
{"color": null, "type": "wild", "value": null}
{"color": null, "type": "wild_draw_four", "value": null}
```

### 2.2 Deck Composition (108 cards)
- Number cards: 4 colors × (1×0 + 2×[1-9]) = 4×19 = 76 cards
- Action cards: 4 colors × 3 types × 2 copies = 24 cards
- Wild cards: 4×Wild + 4×Wild+4 = 8 cards
- Total: 108 cards

## 3. Schema Definitions

### 3.1 Room Schema
```python
# Stored in MongoDB: rooms collection
{
    "_id": ObjectId,
    "name": str,                    # "Phòng của Minh" — max 50 chars
    "isPrivate": bool,              # False = visible in public lobby
    "maxPlayers": int,              # 2-10, default 4
    "currentPlayers": [
        {
            "id": str,              # UUID v4 from client localStorage
            "name": str,            # "Player 847" or user-chosen name
            "isHost": bool,         # True for room creator
            "connected": bool,      # WS connection alive
            "joinedAt": datetime,
        }
    ],
    "gameId": ObjectId | null,     # Set when game starts
    "status": str,                  # "lobby" | "full" | "playing"
    "createdAt": datetime,
    "updatedAt": datetime,
}
```

**Indexes**:
```javascript
db.rooms.createIndex({ "status": 1, "isPrivate": 1 })  // Public lobby query
db.rooms.createIndex({ "createdAt": -1 })              // Sort by newest
db.rooms.createIndex({ "currentPlayers.id": 1 })      // Find player rooms
```

### 3.2 Game Schema
```python
# Stored in MongoDB: games collection
{
    "_id": ObjectId,
    "roomId": ObjectId,            # Reference to rooms collection
    "players": [
        {
            "id": str,             # UUID v4
            "name": str,
            "hand": [Card],        # Array of Card objects (max 107, min 0)
            "connected": bool,
        }
    ],
    "deck": [Card],               # Remaining draw pile (initially 108-7n-1)
    "discardPile": [Card],        # Top card is active (at least 1 card)
    "currentTurnIndex": int,       # Index into players array (0-9)
    "direction": int,             # 1 = clockwise, -1 = counter-clockwise
    "activeColor": str,           # Current active color (for Wild resolution)
    "status": str,                # "waiting" | "playing" | "finished"
    "winner": {
        "playerIndex": int,
        "reason": str,            # "empty_hand" | "timeout" | "forfeit"
    } | null,
    "pendingDrawCount": int,      # Accumulates +2 / +4 cards to draw
    "createdAt": datetime,
    "updatedAt": datetime,
}
```

**Indexes**:
```javascript
db.games.createIndex({ "roomId": 1 })                  // Find game by room
db.games.createIndex({ "status": 1, "createdAt": -1 }) // Recent games
db.games.createIndex({ "players.id": 1 })              // Find player games
```

## 4. State Transition Diagrams

### 4.1 Room Lifecycle
```
                    ┌──────────────────────────────┐
                    │                              │
create ────────────►│          lobby               │◄──────────────┐
                    │  (players join/leave)       │               │
                    │                              │               │
                    │  maxPlayers reached?         │               │
                    │          │                  │               │
                    │          ▼                  │               │
                    │      full (auto)            │               │
                    │          │                  │               │
                    │  host clicks "Start"        │               │
                    │          │                  │               │
                    │          ▼                  │               │
                    │       playing ──────────────┼───────────────┤
                    │          │                  │               │
                    │   all players leave        │               │
                    │          │                  │               │
                    │          ▼                  │               │
                    │      deleted                │               │
                    │   (TTL or manual)           │               │
                    └──────────────────────────────┘
```

### 4.2 Game Lifecycle
```
waiting ────► playing ────► finished
  │              │              │
  │              │     someone empties hand
  │              │              │
  │         (all 2-10           ▼
  │          players      result saved
  │          connected)       to DB
  │              │
  │         player disconnects
  │              │
  │              ▼
  │         bot takes over
  │         (30s timeout)
  │              │
  │              ▼
  │         resume or forfeit
```

## 5. Query Patterns

### 5.1 Common Queries
| Query | Collection | Filter | Projection |
|-------|-----------|--------|------------|
| List public open rooms | rooms | `{isPrivate: false, status: {$ne: "playing"}}` | `{name, currentPlayers, maxPlayers}` |
| Get room by ID | rooms | `{_id: ObjectId}` | Full doc |
| Get game by room | games | `{roomId: ObjectId}` | Full doc |
| Get player's active game | games | `{"players.id": playerId, status: "playing"}` | `{_id, roomId}` |
| Recent finished games | games | `{status: "finished"}` sort by `createdAt:-1` limit 20 | `{players, winner, createdAt}` |

### 5.2 Atomic Operations (Moves)
```python
# Apply a move atomically — only if currentTurn matches
result = await db.games.find_one_and_update(
    {
        "_id": game_id,
        "currentTurnIndex": player_index,  # Must be their turn
        "status": "playing",               # Game must be active
    },
    {
        "$set": {
            "discardPile.0": new_card,     # Add to top of discard
            "players.$[i].hand.$": ...      # Remove from hand
        },
        "$push": {
            "moves": {
                "playerIndex": player_index,
                "cardPlayed": card,
                "drawnCard": drawn_card,
                "timestamp": datetime.utcnow(),
            }
        }
    },
    return_document=ReturnDocument.AFTER
)
```

### 5.3 MongoDB Change Streams (Optional Enhancement)
For real-time sync instead of polling:
```python
async def watch_game(game_id):
    async with db.games.watch([{"$match": {"_id": game_id}}]) as stream:
        async for change in stream:
            # Broadcast to WebSocket clients
            await broadcast_to_room(change["fullDocument"])
```

## 6. Data Retention & Cleanup

### 6.1 TTL Indexes
```javascript
// Rooms with no players for 7 days → auto-delete
db.rooms.createIndex(
    { "updatedAt": 1 },
    { expireAfterSeconds: 7 * 24 * 60 * 60 }
)

// Games finished for 90 days → auto-delete
db.games.createIndex(
    { "createdAt": 1 },
    {
        expireAfterSeconds: 90 * 24 * 60 * 60,
        partialFilterExpression: { "status": "finished" }
    }
)
```

### 6.2 Manual Cleanup Operations
```python
# Delete room and associated game when last player leaves
async def cleanup_room(room_id: ObjectId):
    await db.games.delete_many({"roomId": room_id})
    await db.rooms.delete_one({"_id": room_id})

# Archive old game to cold storage (future)
async def archive_game(game_id: ObjectId):
    game = await db.games.find_one({"_id": game_id})
    # Move to games_archive collection (future)
```

## 7. Data Migration Strategy

For future schema changes (adding new fields):
1. Add field with default value in application code
2. Run migration script to backfill historical documents
3. MongoDB handles schema flexibility — no DDL needed

Example adding `difficulty` to rooms:
```python
# Code handles missing field with default
difficulty = room.get("difficulty", "normal")

# Migration script (run once)
db.rooms.update_many(
    {"difficulty": {"$exists": False}},
    {"$set": {"difficulty": "normal"}}
)
```

## 8. Connection Management

### 8.1 Motor Connection Pool
```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(
    "mongodb://10.60.184.61:27017",
    maxPoolSize=50,
    minPoolSize=10,
    serverSelectionTimeoutMS=5000,
)

db = client["uno_online"]
```

### 8.2 Singleton Pattern (FastAPI lifespan)
```python
from contextlib import asynccontextmanager

_db_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db_client
    _db_client = AsyncIOMotorClient("mongodb://10.60.184.61:27017")
    yield
    _db_client.close()
```

## 9. Sharding Considerations (Future)

If scaling beyond single M0 instance:
- Shard by `roomId` for games (related data co-located)
- Shard by `players.id` for player-centric queries (not needed for MVP)