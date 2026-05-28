from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from bson import ObjectId
from typing import Dict, List
import json

from ..db.mongodb import get_rooms_collection, get_games_collection

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_id: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][player_id] = websocket

    def disconnect(self, room_id: str, player_id: str):
        if room_id in self.active_connections:
            if player_id in self.active_connections[room_id]:
                del self.active_connections[room_id][player_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_player: str = None):
        if room_id not in self.active_connections:
            return

        disconnected = []
        for player_id, ws in self.active_connections[room_id].items():
            if exclude_player and player_id == exclude_player:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(player_id)

        for player_id in disconnected:
            self.disconnect(room_id, player_id)

manager = ConnectionManager()

@router.websocket("/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    # Wait for auth message
    try:
        data = await websocket.receive_json()
    except Exception:
        await websocket.close(code=4001, reason="Authentication required")
        return

    if data.get("type") != "auth":
        await websocket.close(code=4001, reason="Invalid message type")
        return

    player_id = data.get("playerId")
    if not player_id:
        await websocket.close(code=4002, reason="Player ID required")
        return

    # Verify room exists
    rooms = get_rooms_collection()
    try:
        room_oid = ObjectId(room_id)
    except Exception:
        await websocket.close(code=4004, reason="Invalid room ID")
        return

    room = await rooms.find_one({"_id": room_oid})
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    # Verify player is in room
    player_in_room = any(p["id"] == player_id for p in room.get("currentPlayers", []))
    if not player_in_room:
        await websocket.close(code=4010, reason="Player not in room")
        return

    # Connect
    await manager.connect(room_id, player_id, websocket)

    # Send auth_ok with current state
    games = get_games_collection()
    game_state = None

    if room.get("gameId"):
        game = await games.find_one({"_id": room["gameId"]})
        if game:
            # Build playable indices for the player
            player_hand = None
            for i, p in enumerate(game["players"]):
                if p["id"] == player_id:
                    player_hand = p.get("hand", [])
                    break

            top_card = game["discardPile"][0] if game.get("discardPile") else None
            active_color = game.get("activeColor", top_card["color"] if top_card else None)

            from ..game_logic.deck import can_play_card
            pending_draw = game.get("pendingDrawCount", 0)

            can_play = []
            if player_hand:
                for i, card in enumerate(player_hand):
                    if can_play_card(card, top_card, active_color, pending_draw):
                        can_play.append(i)

            game_state = {
                "id": str(game["_id"]),
                "roomId": str(game["roomId"]),
                "players": [
                    {
                        "id": p["id"],
                        "name": p["name"],
                        "handCount": len(p.get("hand", [])),
                        "connected": p.get("connected", True),
                    }
                    for p in game["players"]
                ],
                "deckCount": len(game.get("deck", [])),
                "discardPile": game.get("discardPile", []),
                "currentTurnIndex": game.get("currentTurnIndex", 0),
                "direction": game.get("direction", 1),
                "activeColor": game.get("activeColor"),
                "status": game.get("status", "waiting"),
                "pendingDrawCount": game.get("pendingDrawCount", 0),
                "canPlayCards": can_play,
                "winner": game.get("winner"),
            }

    # Send auth response
    await websocket.send_json({
        "type": "auth_ok",
        "roomId": room_id,
        "room": {
            "id": str(room["_id"]),
            "name": room["name"],
            "currentPlayers": room.get("currentPlayers", []),
            "status": room.get("status", "lobby"),
        },
        "gameState": game_state,
    })

    # Send game_update to all in room
    if game_state:
        await manager.broadcast_to_room(
            room_id,
            {"type": "game_update", "game": game_state},
            exclude_player=player_id
        )

    # Listen for messages
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping_response":
                await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})

            elif msg_type == "chat":
                # Broadcast chat message
                message = data.get("message", "")[:200]
                await manager.broadcast_to_room(room_id, {
                    "type": "chat",
                    "playerId": player_id,
                    "message": message,
                })

    except WebSocketDisconnect:
        manager.disconnect(room_id, player_id)
        # Update player connection status
        rooms = get_rooms_collection()
        try:
            await rooms.update_one(
                {"_id": room_oid, "currentPlayers.id": player_id},
                {"$set": {"currentPlayers.$.connected": False}}
            )
        except Exception:
            pass

        # Notify others
        await manager.broadcast_to_room(room_id, {
            "type": "player_disconnected",
            "playerId": player_id,
        })
    except Exception as e:
        manager.disconnect(room_id, player_id)