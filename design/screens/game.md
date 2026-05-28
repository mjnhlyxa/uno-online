# Game Room Screen

**Route**: `/room/[roomId]`
**Purpose**: Main gameplay — play cards, draw, call UNO

## Layout (Desktop)

```
+---------------------------------------------------------------+
|  [← Leave]     UNO Online           Your Turn: Player 847   |
+---------------------------------------------------------------+

                         CENTER TABLE
    +------------------------------------------------------+
    |                                                      |
    |     +--------+                    +--------+         |
    |     | Player |    +--------+      | Player |         |
    |     |   Top  |    | DISCARD|      |  Top   |         |
    |     |  7 🔵  |    |  [5]   |      |   7    |         |
    |     +--------+    |  BLUE  |      +--------+         |
    |                   +--------+                           |
    |     +--------+         ↑         +--------+           |
    |     | DRAW   |    Direction      | Player |           |
    |     |  DECK  |    → CW           |  Top   |           |
    |     |  94    |         ↓         +--------+           |
    |     +--------+                    +--------+           |
    |                                 | Player |           |
    |                                 |   Top  |           |
    |                                 +--------+           |
    +------------------------------------------------------+

+---------------------------------------------------------------+
|   YOUR HAND                                                   |
|   +----------------------------------------------------------+|
|   | [1]  [3]  [5]  [7]  [Skip] [Reverse] [+2] [Wild]         ||
|   |  Red  Blue Green Yellow Red   Yellow   Blue    WILD      ||
|   +----------------------------------------------------------+|
|                                              [UNO!] (pulsing) |
+---------------------------------------------------------------+
```

## Layout (Mobile, 375px)

```
+----------------------------------------+
| [←]  Turn: Player 847    [+2 pending] |
+----------------------------------------+
|                                        |
|          +--------+                    |
|          | DISCARD|                    |
|          |  [5]   |                    |
|          |  BLUE  |                    |
|          +--------+                    |
|                                        |
|   +--------+          +--------+       |
|   | Player |    →     | Player |      |
|   |  Top   |   CW     |  Top   |       |
|   +--------+          +--------+       |
|   +--------+          +--------+       |
|   | DRAW   |          | Player |       |
|   |  DECK  |          |  Top   |       |
|   +--------+          +--------+       |
|                                        |
|   ACTIVE COLOR: 🔵 BLUE                |
|                                        |
+----------------------------------------+
|   YOUR HAND (horizontal scroll)        |
|   +----------------------------------+ |
|   |[1][3][Skip][Wild]...         [UNO]| |
|   +----------------------------------+ |
+----------------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Turn indicator | Shows current player name | Updates on turn change |
| Direction indicator | CW/CCW arrow | Shows rotation direction |
| Active color | Shows current color to match | Changes after Wild played |
| Discard pile | Top card visible, stack of prev cards | Click disabled |
| Draw deck | Clickable, shows remaining count | Click to draw card |
| Player panels | Shows player name, hand count, avatar | Real-time updates |
| Your hand | Horizontal scroll of your cards | Click to play |
| Playable highlight | Glow effect on playable cards | Client-side calculated |
| UNO button | Appears when hand size = 1 | Click to call UNO |
| Color picker | Modal appears after Wild/Wild+4 | Choose next color |
| Pending draw indicator | Shows "+2" or "+4" pending | Affects turn flow |

## Card Interactions

### Play a Card
1. User sees playable cards highlighted (glow effect)
2. User clicks a card
3. If Wild/Wild+4: ColorPickerModal appears
4. User selects color
5. API called → card played, state updated
6. Card animates from hand to discard pile
7. Turn passes to next player

### Draw a Card
1. User has no playable cards OR chooses to draw
2. User clicks draw deck
3. API called → card drawn from deck
4. If drawn card playable and same turn: user can play it
5. If not playable: turn ends automatically
6. If deck empty: reshuffle discard pile (except top card)

### Call UNO
1. User's hand size becomes 1
2. UNO button starts pulsing
3. User clicks UNO button (required before playing last card)
4. API called → UNO called
5. Must play last card within 3 seconds or penalty

## States

- **Your turn**: Your hand enabled, playable cards highlighted
- **Opponent turn**: Your hand disabled (grayed), shows "[Name]'s turn"
- **Pending draw**: +2 or +4 pending — must play matching card or draw
- **Color picker**: Modal open for Wild card
- **Card animation**: Card flying to discard (200-400ms)
- **Turn transition**: Brief highlight of next player
- **Game over**: Overlay with results

## Component Inventory

| Component | States |
|-----------|--------|
| UNOCard | default, playable, selected, hidden, hover |
| PlayerHand | active, disabled, empty |
| PlayerPanel | waiting, current-turn, disconnected, winner |
| DiscardPile | normal, stacking, new-card-animating |
| DrawDeck | full, low (<10), empty, disabled |
| TurnIndicator | your-turn, opponent-turn |
| DirectionArrow | cw, ccw |
| ActiveColorBadge | red, yellow, green, blue |
| UnoButton | disabled, ready (pulsing), pressed |
| ColorPickerModal | closed, open (4 color options) |
| GameOverModal | closed, winner-display |
| Toast | played-card, invalid-move, uno-called, disconnected |

## Card Visual States

| Card State | Visual |
|------------|--------|
| Default | Normal size, slight shadow |
| Playable | Glowing border (white, pulsing) |
| Selected | Yellow border, scale 1.05 |
| Not playable | Normal (no glow) |
| Hover | Lift up 4px, shadow increase |
| Playing (animating) | Fly to discard with rotation |