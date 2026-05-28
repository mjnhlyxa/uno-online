# uno-online — Security Considerations

> **C4 Level**: 3 — Security Components
> **Status**: Draft | Created: 2026-05-29

## 1. Anonymous Player Identity

### 1.1 Player ID Generation
- UUID v4 generated client-side on first visit, stored in `localStorage`
- No personal information collected or stored
- No authentication required for gameplay

**Risk**: Players can generate new IDs to impersonate others
**Mitigation**: Not critical for anonymous casual game; game results not tied to real identity

### 1.2 Player Name Validation
- Names are user-chosen, max 20 characters
- Profanity filter (future enhancement)
- Names displayed as-is without verification

## 2. Input Validation

### 2.1 Pydantic Validation (FastAPI)
```python
from pydantic import BaseModel, Field

class PlayCardRequest(BaseModel):
    playerId: str = Field(..., min_length=36, max_length=36)
    cardIndex: int = Field(..., ge=0, le=106)  # Max 107 cards in hand
    chosenColor: Optional[Color] = Field(None)

    @validator('playerId')
    def validate_uuid(cls, v):
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError('Invalid player ID format')
```

### 2.2 Card Index Bounds
- Maximum hand size is 107 (worst case: draw every turn)
- Cards must exist in player's hand before play
- Server always validates hand ownership before processing move

### 2.3 Room ID Validation
- MongoDB ObjectId validation on all room/game IDs
- 24-character hex strings only

## 3. Rate Limiting

### 3.1 Per-IP Limits (slowapi)
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/rooms")
@limiter.limit("10/minute")
async def create_room(request: Request):
    ...
```

### 3.2 Rate Limit Summary
| Endpoint | Limit |
|----------|-------|
| `POST /api/rooms` | 10/min |
| `POST /api/games` | 20/min |
| `POST /api/games/{id}/play` | 30/min |
| WebSocket connections | 5/min per IP |

### 3.3 Rate Limit Response
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```
HTTP 429 with `Retry-After` header.

## 4. CORS Configuration

### 4.1 Allowed Origins
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uno-online.vercel.app",
        "http://localhost:3000",  # Dev
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Player-ID"],
)
```

### 4.2 WebSocket CORS
WebSocket doesn't support CORS headers — connection fails if origin not allowed. For production:
- Vercel handles WebSocket upgrade at edge
- No additional CORS needed for WS (same origin after DNS resolves)

## 5. WebSocket Security

### 5.1 Player Verification on WS Connect
```python
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    # Wait for auth message
    data = await websocket.receive_json()

    if data.get("type") != "auth":
        await websocket.close(code=4001, reason="Authentication required")
        return

    player_id = data.get("playerId")
    if not is_valid_uuid(player_id):
        await websocket.close(code=4002, reason="Invalid player ID")
        return

    # Verify player is in room
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    if player_id not in [p["id"] for p in room.get("currentPlayers", [])]:
        await websocket.close(code=4010, reason="Player not in room")
        return

    # Register connection
    await register_connection(room_id, player_id, websocket)
```

### 5.2 Message Validation
```python
async def handle_play_card(websocket: WebSocket, data: dict):
    # Validate message structure
    if "cardIndex" not in data:
        await websocket.send_json({
            "type": "error",
            "error": "INVALID_REQUEST",
            "message": "Missing cardIndex"
        })
        return

    # Validate types
    if not isinstance(data["cardIndex"], int):
        await websocket.send_json({
            "type": "error",
            "error": "INVALID_REQUEST",
            "message": "cardIndex must be integer"
        })
        return
```

## 6. MongoDB Security

### 6.1 Connection String Security
- MongoDB URI stored in environment variable, not in code
- Read-only access for game queries, write access for game operations
- No admin privileges needed

### 6.2 Query Injection Prevention
- All queries use parameterized filters, not string concatenation
- ObjectId validation on all ID parameters
- Mongoose/Motor handles escaping automatically

## 7. Data Privacy

### 7.1 Data Minimization
- Only collect: anonymous player ID, player-chosen name, game state
- No IP logging unless explicitly needed for rate limiting
- No cookies beyond localStorage (no server-side cookies)

### 7.2 Data Retention
- Finished games deleted after 90 days (TTL index)
- Empty rooms deleted after 7 days
- No long-term player profiles or history

## 8. Vercel Security

### 8.1 Environment Variables
- All secrets in Vercel environment variables
- Never commit `.env` files to Git
- `MONGODB_URI` only exposed to server-side code

### 8.2 Serverless Function Limits
- 10s timeout for API functions (game moves)
- 60s timeout for WebSocket connections (Vercel limit)
- 4MB response size limit

## 9. Content Security Policy

### 9.1 CSP Headers (Next.js)
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://uno-api.vercel.app wss://uno-api.vercel.app;"
  },
];
```

## 10. Security Checklist

- [ ] All API endpoints validate input with Pydantic
- [ ] Rate limiting configured on all public endpoints
- [ ] CORS configured for known origins only
- [ ] WebSocket auth on first message
- [ ] No secrets in code or Git
- [ ] MongoDB URI in environment variable
- [ ] CSP headers configured
- [ ] No server-side state beyond MongoDB