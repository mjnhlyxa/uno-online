import secrets
from typing import List, Optional, Tuple
from pydantic import BaseModel

ColorLiteral = Literal["red", "yellow", "green", "blue"]
CardTypeLiteral = Literal["number", "skip", "reverse", "draw_two", "wild", "wild_draw_four"]

class Card(BaseModel):
    color: Optional[ColorLiteral] = None
    type: CardTypeLiteral
    value: Optional[int] = None

def create_deck() -> List[Card]:
    """Create a standard 108-card UNO deck."""
    colors: List[ColorLiteral] = ["red", "yellow", "green", "blue"]
    deck: List[Card] = []

    # Number cards: 1×0, 2×(1-9) per color = 19 per color = 76 total
    for color in colors:
        deck.append(Card(color=color, type="number", value=0))
        for value in range(1, 10):
            deck.append(Card(color=color, type="number", value=value))
            deck.append(Card(color=color, type="number", value=value))

    # Action cards: 2×(skip, reverse, +2) per color = 6 per color = 24 total
    for color in colors:
        for _ in range(2):
            deck.append(Card(color=color, type="skip", value=None))
            deck.append(Card(color=color, type="reverse", value=None))
            deck.append(Card(color=color, type="draw_two", value=None))

    # Wild cards: 4×wild + 4×wild+4 = 8 total
    for _ in range(4):
        deck.append(Card(color=None, type="wild", value=None))
    for _ in range(4):
        deck.append(Card(color=None, type="wild_draw_four", value=None))

    return deck

def shuffle_deck(deck: List[Card]) -> List[Card]:
    """Shuffle deck using crypto-random token."""
    # Fisher-Yates shuffle using secrets.token_hex for randomness
    indices = list(range(len(deck)))
    shuffled_indices = []
    for i in range(len(indices) - 1, 0, -1):
        j = int.from_bytes(secrets.token_bytes(4), byteorder='little') % (i + 1)
        indices[i], indices[j] = indices[j], indices[i]
    return [deck[i] for i in indices[:len(indices) - 1]] + [deck[indices[-1]]]

def deal_cards(deck: List[Card], num_players: int, cards_per_player: int = 7) -> Tuple[List[List[Card]], List[Card], List[Card]]:
    """Deal cards to players, return (player_hands, remaining_deck, first_discard)"""
    hands: List[List[Card]] = [[] for _ in range(num_players)]
    for i in range(cards_per_player):
        for h in range(num_players):
            if deck:
                hands[h].append(deck.pop())
    remaining_deck = deck

    # First discard: find first non-wild card
    first_discard = None
    for i, card in enumerate(remaining_deck):
        if card.type not in ("wild", "wild_draw_four"):
            first_discard = remaining_deck.pop(i)
            break

    if first_discard is None and remaining_deck:
        first_discard = remaining_deck.pop()

    return hands, remaining_deck, [first_discard] if first_discard else []

def can_play_card(card: Card, top_card: Card, active_color: ColorLiteral, pending_draw: int) -> bool:
    """Check if a card can be legally played."""
    # If pending draw, must play +2/+4 or draw
    if pending_draw > 0:
        if card.type in ("draw_two", "wild_draw_four"):
            return True
        return False

    # Wild cards always playable
    if card.type in ("wild", "wild_draw_four"):
        return True

    # Match active color
    if card.color == active_color:
        return True

    # Match number
    if card.type == "number" and top_card.type == "number" and card.value == top_card.value:
        return True

    # Match action type
    if card.type == top_card.type and card.type != "number":
        return True

    return False

def get_playable_indices(hand: List[Card], top_card: Card, active_color: ColorLiteral, pending_draw: int) -> List[int]:
    """Return indices of playable cards in hand."""
    return [i for i, card in enumerate(hand) if can_play_card(card, top_card, active_color, pending_draw)]

def get_next_turn_index(current_index: int, num_players: int, direction: int) -> int:
    """Calculate next player turn index."""
    return (current_index + direction) % num_players

def get_action_effect(card: Card, active_color: ColorLiteral, pending_draw: int, num_players: int) -> dict:
    """Determine what effects the card has. Returns dict with keys: skip, reverse, draw_count, new_color."""
    effect = {
        "skip": False,
        "reverse": False,
        "draw_count": 0,
        "new_color": active_color,
        "must_discard": False
    }

    if card.type == "skip":
        effect["skip"] = True
    elif card.type == "reverse":
        if num_players == 2:
            # In 2-player, reverse acts like skip
            effect["skip"] = True
        else:
            effect["reverse"] = True
    elif card.type == "draw_two":
        effect["draw_count"] = 2
    elif card.type == "wild":
        effect["must_discard"] = True  # Color must be chosen
    elif card.type == "wild_draw_four":
        effect["draw_count"] = 4
        effect["must_discard"] = True

    return effect