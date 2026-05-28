from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum

ColorLiteral = Literal["red", "yellow", "green", "blue"]
CardTypeLiteral = Literal["number", "skip", "reverse", "draw_two", "wild", "wild_draw_four"]

class Card(BaseModel):
    color: Optional[ColorLiteral] = None
    type: CardTypeLiteral
    value: Optional[int] = None  # 0-9 for number cards

class Player(BaseModel):
    id: str
    name: str
    hand: List[Card] = []
    connected: bool = True

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    maxPlayers: int = Field(default=4, ge=2, le=10)
    isPrivate: bool = False
    playerId: str
    playerName: str

class RoomJoin(BaseModel):
    playerId: str
    playerName: str

class Room(BaseModel):
    id: str
    name: str
    isPrivate: bool
    maxPlayers: int
    currentPlayers: List[Player] = []
    gameId: Optional[str] = None
    status: str = "lobby"
    createdAt: str

class GameCreate(BaseModel):
    roomId: str
    hostPlayerId: str

class GameState(BaseModel):
    id: str
    roomId: str
    players: List[Player]
    deck: List[Card] = []
    discardPile: List[Card] = []
    currentTurnIndex: int = 0
    direction: int = 1  # 1 = clockwise, -1 = counter-clockwise
    activeColor: Optional[ColorLiteral] = None
    status: str = "waiting"
    pendingDrawCount: int = 0
    winner: Optional[dict] = None

class PlayCardRequest(BaseModel):
    playerId: str
    cardIndex: int = Field(..., ge=0)
    chosenColor: Optional[ColorLiteral] = None

class DrawCardRequest(BaseModel):
    playerId: str

class CallUnoRequest(BaseModel):
    playerId: str

class ForfeitRequest(BaseModel):
    playerId: str