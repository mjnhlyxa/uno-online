from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime
import uuid

from ..db.mongodb import get_rooms_collection, get_games_collection
from ..models.schemas import RoomCreate, RoomJoin

router = APIRouter()

def room_to_dict(room) -> dict:
    """Convert MongoDB room document to API response format."""
    return {
        "id": str(room["_id"]),
        "name": room["name"],
        "isPrivate": room.get("isPrivate", False),
        "maxPlayers": room.get("maxPlayers", 4),
        "currentPlayers": room.get("currentPlayers", []),
        "gameId": str(room["gameId"]) if room.get("gameId") else None,
        "status": room.get("status", "lobby"),
        "createdAt": room.get("createdAt", datetime.utcnow().isoformat()),
    }

@router.post("")
async def create_room(data: RoomCreate):
    """Create a new room."""
    rooms = get_rooms_collection()

    room_doc = {
        "name": data.name,
        "isPrivate": data.isPrivate,
        "maxPlayers": data.maxPlayers,
        "currentPlayers": [{
            "id": data.playerId,
            "name": data.playerName,
            "isHost": True,
            "connected": True,
            "joinedAt": datetime.utcnow().isoformat(),
        }],
        "gameId": None,
        "status": "lobby",
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }

    result = await rooms.insert_one(room_doc)
    room_doc["_id"] = result.inserted_id

    room = room_to_dict(room_doc)
    room["shareUrl"] = f"https://uno-online.vercel.app/room/{room['id']}"

    return {"success": True, "room": room}

@router.get("")
async def list_rooms(status: str = "lobby", limit: int = 20, offset: int = 0):
    """List public rooms."""
    rooms = get_rooms_collection()

    query = {"isPrivate": False, "status": status}
    total = await rooms.count_documents(query)
    cursor = rooms.find(query).skip(offset).limit(limit).sort("createdAt", -1)

    room_list = []
    async for room in cursor:
        r = room_to_dict(room)
        r["playerCount"] = len(room.get("currentPlayers", []))
        room_list.append(r)

    return {
        "success": True,
        "rooms": room_list,
        "total": total,
        "limit": limit,
        "offset": offset,
    }

@router.get("/{room_id}")
async def get_room(room_id: str):
    """Get room details."""
    rooms = get_rooms_collection()

    try:
        oid = ObjectId(room_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Room not found")

    room = await rooms.find_one({"_id": oid})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return {"success": True, "room": room_to_dict(room)}

@router.post("/{room_id}/join")
async def join_room(room_id: str, data: RoomJoin):
    """Join a room."""
    rooms = get_rooms_collection()

    try:
        oid = ObjectId(room_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Room not found")

    room = await rooms.find_one({"_id": oid})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if player already in room
    for p in room.get("currentPlayers", []):
        if p["id"] == data.playerId:
            return {"success": True, "room": room_to_dict(room), "playerIndex": room["currentPlayers"].index(p)}

    # Check if room is full
    if len(room.get("currentPlayers", [])) >= room.get("maxPlayers", 4):
        raise HTTPException(status_code=409, detail="Room is full")

    # Check if game already started
    if room.get("status") == "playing":
        raise HTTPException(status_code=410, detail="Game already in progress")

    # Add player
    new_player = {
        "id": data.playerId,
        "name": data.playerName,
        "isHost": False,
        "connected": True,
        "joinedAt": datetime.utcnow().isoformat(),
    }

    await rooms.update_one(
        {"_id": oid},
        {"$push": {"currentPlayers": new_player}, "$set": {"updatedAt": datetime.utcnow().isoformat()}}
    )

    room = await rooms.find_one({"_id": oid})
    return {"success": True, "room": room_to_dict(room), "playerIndex": len(room["currentPlayers"]) - 1}

@router.post("/{room_id}/leave")
async def leave_room(room_id: str, data: RoomJoin):
    """Leave a room."""
    rooms = get_rooms_collection()
    games = get_games_collection()

    try:
        oid = ObjectId(room_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Room not found")

    room = await rooms.find_one({"_id": oid})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Remove player
    await rooms.update_one(
        {"_id": oid},
        {"$pull": {"currentPlayers": {"id": data.playerId}}, "$set": {"updatedAt": datetime.utcnow().isoformat()}}
    )

    # Check if room is now empty - delete it
    updated_room = await rooms.find_one({"_id": oid})
    if not updated_room or len(updated_room.get("currentPlayers", [])) == 0:
        await rooms.delete_one({"_id": oid})
        if updated_room and updated_room.get("gameId"):
            await games.delete_one({"_id": updated_room["gameId"]})
        return {"success": True, "message": "Room deleted"}

    # If host left, promote next player
    if room["currentPlayers"] and not any(p["id"] == data.playerId and p.get("isHost") for p in room["currentPlayers"]):
        # Host left, make first remaining player the host
        await rooms.update_one(
            {"_id": oid},
            {"$set": {"currentPlayers.0.isHost": True}}
        )

    return {"success": True, "message": "Left room successfully"}