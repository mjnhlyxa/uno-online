# Game Over Screen

**Route**: `/room/[roomId]` (overlay on game)
**Purpose**: Show winner, offer rematch/leave options

## Layout (Desktop)

```
+---------------------------------------------------------------+
|                                                               |
|                                                               |
|                    +-------------------------+                |
|                    |                         |                |
|                    |    🏆 Player 847 Wins!  |                |
|                    |                         |                |
|                    |    Reason: Empty hand  |                |
|                    |                         |                |
|                    |    Cards remaining:    |                |
|                    |    Player 312: 3      |                |
|                    |    Player 847: 0      |                |
|                    |                         |                |
|                    +-------------------------+                |
|                                                               |
|         +---------------+  +-------------------+             |
|         |    REMATCH     |  |     PLAY AGAIN    |             |
|         |  (same room)   |  |    (new room)     |             |
|         +---------------+  +-------------------+             |
|                                                               |
|                    [Leave Game]                               |
|                                                               |
+---------------------------------------------------------------+
```

## Layout (Mobile, 375px)

```
+----------------------------------------+
|                                        |
|         +-------------------------+    |
|         |                         |    |
|         |    🏆 Player 847 Wins!  |    |
|         |                         |    |
|         |    Reason: Empty hand   |    |
|         |                         |    |
|         +-------------------------+    |
|                                        |
|    Cards remaining:                    |
|    Player 312: 3                       |
|                                        |
|    +------------------------------+   |
|    |         REMATCH              |   |
|    +------------------------------+   |
|    +------------------------------+   |
|    |        PLAY AGAIN            |   |
|    +------------------------------+   |
|    +------------------------------+   |
|    |         LEAVE               |   |
|    +------------------------------+   |
|                                        |
+----------------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Winner announcement | Large text with winner name + trophy emoji | — |
| Win reason | "Empty hand" or "Other player forfeit" | — |
| Scoreboard | Cards remaining for each player | Sort ascending |
| Confetti animation | Animated particles for winner celebration | 2s duration |
| Rematch button | Creates new round with same players | Primary button |
| Play Again button | Leaves room, returns to lobby to create new | Secondary button |
| Leave button | Returns to lobby immediately | Ghost button |

## States

- **Winner declared**: Show winner with confetti
- **Draw (future)**: If somehow all players lose simultaneously (not possible in standard rules)
- **Forfeit**: Show "Player [name] forfeited" as reason

## Key Interactions

### Rematch
1. Click "Rematch" button
2. API called → new round created in same room, same players
3. All players see "Starting new round..." for 1 second
4. New game begins — cards dealt, first turn
5. Players redirected to game view

### Play Again
1. Click "Play Again" button
2. Confirmation if needed
3. Leave room API called
4. User redirected to lobby
5. Other players stay in room (can start new round without host)

### Leave
1. Click "Leave" button
2. Leave room API called
3. User redirected to lobby

## Component Inventory

| Component | States |
|-----------|--------|
| GameOverModal | closed, winner, draw |
| ConfettiEffect | idle, playing (2s) |
| WinnerAnnouncement | normal, animated |
| ScoreboardList | populated |
| RematchButton | default, hover, loading |
| PlayAgainButton | default, hover |
| LeaveButton | default, hover |

## Visual Design

- Modal: centered, dark overlay backdrop (rgba(0,0,0,0.7))
- Winner text: large (32px), white, font-extrabold
- Trophy emoji: 🏆 displayed above name
- Confetti: multi-colored particles falling from top
- Buttons: Primary for Rematch, Secondary for Play Again, Ghost for Leave