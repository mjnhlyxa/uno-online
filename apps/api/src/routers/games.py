from fastapi import APIRouter, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime
from typing import Optional

from ..db.mongodb import get_rooms_collection, get_games_collection
from ..game_logic.deck import create_deck, shuffle_deck, deal_cards, can_play_card

router = APIRouter()

def game_to_dict(game) -> dict:
    """Convert MongoDB game document to API response format."""
    return {
        "id": str(game["_id"]),
        "roomId": str(game["roomId"]),
        "players": game.get("players", []),
        "deckCount": len(game.get("deck", [])),
        "discardPile": game.get("discardPile", []),
        "currentTurnIndex": game.get("currentTurnIndex", 0),
        "direction": game.get("direction", 1),
        "activeColor": game.get("activeColor"),
        "status": game.get("status", "waiting"),
        "pendingDrawCount": game.get("pendingDrawCount", 0),
        "winner": game.get("winner"),
    }

@router.post("")
async def create_game(
    room_id: str = Query(...),
    host_player_id: str = Query(...)
):
    """Create and start a new game in a room."""
    rooms = get_rooms_collection()
    games = get_games_collection()

    try:
        room_oid = ObjectId(room_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid room ID")

    room = await rooms.find_one({"_id": room_oid})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Verify host
    if not any(p["id"] == host_player_id and p.get("isHost") for p in room.get("currentPlayers", [])):
        raise HTTPException(status_code=403, detail="Only the host can start the game")

    # Check player count
    num_players = len(room.get("currentPlayers", []))
    if num_players < 2:
        raise HTTPException(status_code=409, detail="Need at least 2 players to start")

    # Create deck and deal
    deck = create_deck()
    deck = shuffle_deck(deck)
    hands, deck, first_discard = deal_cards(deck, num_players)

    # Determine first player and active color
    first_player_idx = 0
    active_color = first_discard[0].color if first_discard else "red"

    game_doc = {
        "roomId": room_oid,
        "players": [
            {**p, "hand": hands[i], "connected": True}
            for i, p in enumerate(room["currentPlayers"])
        ],
        "deck": deck,
        "discardPile": first_discard,
        "currentTurnIndex": first_player_idx,
        "direction": 1,
        "activeColor": active_color,
        "status": "playing",
        "pendingDrawCount": 0,
        "winner": None,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }

    result = await games.insert_one(game_doc)
    game_doc["_id"] = result.inserted_id

    # Update room
    await rooms.update_one(
        {"_id": room_oid},
        {"$set": {"gameId": result.inserted_id, "status": "playing", "updatedAt": datetime.utcnow().isoformat()}}
    )

    return {"success": True, "game": game_to_dict(game_doc)}

@router.get("/{game_id}")
async def get_game(game_id: str):
    """Get current game state."""
    games = get_games_collection()

    try:
        oid = ObjectId(game_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid game ID")

    game = await games.find_one({"_id": oid})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    return {"success": True, "game": game_to_dict(game)}

@router.post("/{game_id}/play")
async def play_card(
    game_id: str,
    player_id: str = Query(...),
    card_index: int = Query(...),
    chosen_color: Optional[str] = Query(None)
):
    """Play a card from player's hand."""
    games = get_games_collection()

    try:
        oid = ObjectId(game_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid game ID")

    game = await games.find_one({"_id": oid})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game["status"] != "playing":
        raise HTTPException(status_code=403, detail="Game is not active")

    # Find player
    player_idx = None
    for i, p in enumerate(game["players"]):
        if p["id"] == player_id:
            player_idx = i
            break

    if player_idx is None:
        raise HTTPException(status_code=404, detail="Player not in this game")

    # Check if it's player's turn
    if player_idx != game["currentTurnIndex"]:
        raise HTTPException(status_code=403, detail="Not your turn")

    # Get player hand
    player_hand = game["players"][player_idx]["hand"]
    if card_index < 0 or card_index >= len(player_hand):
        raise HTTPException(status_code=400, detail="Invalid card index")

    card = player_hand[card_index]
    top_card = game["discardPile"][0] if game["discardPile"] else None
    if not top_card:
        raise HTTPException(status_code=500, detail="No card in discard pile")

    active_color = game.get("activeColor", top_card.color)
    pending_draw = game.get("pendingDrawCount", 0)

    # Check if card can be played
    if not can_play_card(card, top_card, active_color, pending_draw):
        raise HTTPException(status_code=400, detail="Card cannot be played")

    # Handle color selection for wild cards
    new_active_color = active_color
    if card.type in ("wild", "wild_draw_four"):
        if not chosen_color:
            raise HTTPException(status_code=400, detail="Must choose a color for Wild card")
        if chosen_color not in ("red", "yellow", "green", "blue"):
            raise HTTPException(status_code=400, detail="Invalid color")
        new_active_color = chosen_color

    # Check +4 rule (can only play +4 if no matching color)
    if card.type == "wild_draw_four" and pending_draw == 0:
        has_match = any(c for c in player_hand if c.color == active_color and c.type != "wild_draw_four")
        if has_match:
            raise HTTPException(status_code=400, detail="Must play a matching color first")

    # Remove card from hand and add to discard
    new_hand = player_hand.copy()
    played_card = new_hand.pop(card_index)

    new_discard = [played_card] + game["discardPile"]

    # Calculate next turn
    next_turn = game["currentTurnIndex"]
    direction = game["direction"]
    new_pending_draw = 0

    if card.type == "skip":
        next_turn = (next_turn + direction) % len(game["players"])
        next_turn = (next_turn + direction) % len(game["players"])
    elif card.type == "reverse":
        if len(game["players"]) == 2:
            next_turn = (next_turn + direction) % len(game["players"])
        else:
            direction = -direction
            next_turn = (next_turn + direction) % len(game["players"])
    elif card.type == "draw_two":
        new_pending_draw = pending_draw + 2
        next_turn = (next_turn + direction) % len(game["players"])
    elif card.type == "wild_draw_four":
        new_pending_draw = pending_draw + 4
        next_turn = (next_turn + direction) % len(game["players"])
    else:
        next_turn = (next_turn + direction) % len(game["players"])

    # Check for win
    winner = None
    new_status = game["status"]
    if len(new_hand) == 0:
        winner = {"playerIndex": player_idx, "name": game["players"][player_idx]["name"], "reason": "empty_hand"}
        new_status = "finished"

    # Update game
    update = {
        "$set": {
            f"players.{player_idx}.hand": new_hand,
            "discardPile": new_discard,
            "currentTurnIndex": next_turn,
            "direction": direction,
            "activeColor": new_active_color,
            "pendingDrawCount": new_pending_draw,
            "status": new_status,
            "winner": winner,
            "updatedAt": datetime.utcnow().isoformat(),
        }
    }

    await games.update_one({"_id": oid}, update)
    game = await games.find_one({"_id": oid})

    return {"success": True, "game": game_to_dict(game)}

@router.post("/{game_id}/draw")
async def draw_card(
    game_id: str,
    player_id: str = Query(...)
):
    """Draw a card from the deck."""
    games = get_games_collection()

    try:
        oid = ObjectId(game_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid game ID")

    game = await games.find_one({"_id": oid})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game["status"] != "playing":
        raise HTTPException(status_code=403, detail="Game is not active")

    # Find player
    player_idx = None
    for i, p in enumerate(game["players"]):
        if p["id"] == player_id:
            player_idx = i
            break

    if player_idx is None:
        raise HTTPException(status_code=404, detail="Player not in this game")

    # Check if it's player's turn
    if player_idx != game["currentTurnIndex"]:
        raise HTTPException(status_code=403, detail="Not your turn")

    # Draw from deck
    deck = game.get("deck", [])
    if not deck:
        # Reshuffle discard pile into deck
        discard = game["discardPile"]
        if len(discard) > 1:
            new_deck = discard[1:]
            new_discard = [discard[0]]
            # Shuffle
            import secrets
            indices = list(range(len(new_deck)))
            for i in range(len(indices) - 1, 0, -1):
                j = int.from_bytes(secrets.token_bytes(4), byteorder='little') % (i + 1)
                indices[i], indices[j] = indices[j], indices[i]
            new_deck = [new_deck[i] for i in indices]
        else:
            new_deck = []
            new_discard = discard

        await games.update_one({"_id": oid}, {"$set": {"deck": new_deck, "discardPile": new_discard, "updatedAt": datetime.utcnow().isoformat()}})
        game = await games.find_one({"_id": oid})
        deck = new_deck

    if not deck:
        raise HTTPException(status_code=400, detail="No cards left to draw")

    # Draw card
    drawn_card = deck[0]
    new_deck = deck[1:]

    player_hand = game["players"][player_idx]["hand"].copy()
    player_hand.append(drawn_card)

    next_turn = (game["currentTurnIndex"] + game["direction"]) % len(game["players"])

    update = {
        "$set": {
            f"players.{player_idx}.hand": player_hand,
            "deck": new_deck,
            "currentTurnIndex": next_turn,
            "pendingDrawCount": 0,
            "updatedAt": datetime.utcnow().isoformat(),
        }
    }

    await games.update_one({"_id": oid}, update)
    game = await games.find_one({"_id": oid})

    return {"success": True, "game": game_to_dict(game), "drawnCard": drawn_card}

@router.post("/{game_id}/uno")
async def call_uno(game_id: str, player_id: str = Query(...)):
    """Call UNO when player has 1 card left."""
    games = get_games_collection()

    try:
        oid = ObjectId(game_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid game ID")

    game = await games.find_one({"_id": oid})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Find player
    player_idx = None
    for i, p in enumerate(game["players"]):
        if p["id"] == player_id:
            player_idx = i
            break

    if player_idx is None:
        raise HTTPException(status_code=404, detail="Player not in this game")

    hand_size = len(game["players"][player_idx]["hand"])

    return {"success": True, "called": True, "handSize": hand_size}

@router.post("/{game_id}/forfeit")
async def forfeit(game_id: str, player_id: str = Query(...)):
    """Player forfeits the game."""
    games = get_games_collection()

    try:
        oid = ObjectId(game_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid game ID")

    game = await games.find_one({"_id": oid})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Find player
    player_idx = None
    for i, p in enumerate(game["players"]):
        if p["id"] == player_id:
            player_idx = i
            break

    if player_idx is None:
        raise HTTPException(status_code=404, detail="Player not in this game")

    # Find a winner (next player with cards)
    winner_idx = None
    for i in range(1, len(game["players"])):
        check_idx = (player_idx + i) % len(game["players"])
        if len(game["players"][check_idx]["hand"]) > 0:
            winner_idx = check_idx
            break

    if winner_idx is None:
        winner_idx = (player_idx + 1) % len(game["players"])

    winner = {
        "playerIndex": winner_idx,
        "name": game["players"][winner_idx]["name"],
        "reason": "forfeit"
    }

    update = {
        "$set": {
            "status": "finished",
            "winner": winner,
            "updatedAt": datetime.utcnow().isoformat(),
        }
    }

    await games.update_one({"_id": oid}, update)
    game = await games.find_one({"_id": oid})

    return {"success": True, "game": game_to_dict(game)}