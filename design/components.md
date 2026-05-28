# uno-online — Component Specifications

> **Status**: Draft | Created: 2026-05-29

## 1. UI Primitives

### 1.1 Button

**Purpose**: Trigger actions
**Used on**: Lobby, Room, Game, Game Over

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}
```

| Variant | Background | Text | Use Case |
|---------|------------|------|----------|
| primary | `--uno-blue` | white | Main actions (Create Room, Join, Start Game) |
| secondary | `--bg-elevated` | `--text-primary` | Secondary actions (Play Again, Cancel) |
| ghost | transparent | `--text-secondary` | Tertiary (Leave, Back) |
| danger | `--error` | white | Destructive actions |

**States**:
- Default: as defined
- Hover: brightness +10%
- Active: scale 0.98
- Disabled: opacity 0.5, cursor not-allowed
- Loading: spinner icon, text "..."

---

### 1.2 Card (Surface)

**Purpose**: Container for content, elevated surface
**Used on**: Room list, modals, panels

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

**Visual**: `--bg-surface`, border `--border`, radius `--radius-lg`, shadow `--shadow-card`

**States**:
- Default: as above
- Hover (if hoverable): border becomes `--uno-blue`, translateY -2px
- Active: scale 0.99

---

### 1.3 Input

**Purpose**: Text entry for names, room codes
**Used on**: CreateRoomModal, JoinRoomModal, NameEditor

```typescript
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
}
```

**Visual**: `--bg-elevated` background, `--border` border, `--radius-md`, padding 12px

**States**:
- Default: as above
- Focus: border `--border-focus`, ring
- Error: border `--error`, error message below
- Disabled: opacity 0.5

---

### 1.4 Modal

**Purpose**: Overlay dialog for forms and confirmations
**Used on**: CreateRoom, JoinRoom, ColorPicker, GameOver, Confirm

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}
```

**Visual**:
- Overlay: `rgba(0,0,0,0.6)`
- Panel: `--bg-elevated`, radius `--radius-xl`, shadow `--shadow-modal`
- Header: title in `--text-lg`, `--font-semibold`
- Close X button top right

**States**:
- Closed: display none
- Open: fade in 200ms

---

### 1.5 Badge

**Purpose**: Status indicators, counts
**Used on**: Player cards (hand count), room status

```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'uno';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}
```

| Variant | Background | Text |
|---------|------------|------|
| success | green tint | green text |
| warning | yellow tint | yellow text |
| error | red tint | red text |
| info | blue tint | blue text |
| uno | --uno-red | white |

---

### 1.6 Avatar

**Purpose**: Player identity representation
**Used on**: Player list, player panels

```typescript
interface AvatarProps {
  name: string;  // Used to derive color and initials
  size?: 'sm' | 'md' | 'lg';
  isHost?: boolean;
  isCurrentTurn?: boolean;
  connected?: boolean;
}
```

**Visual**:
- Circle with 2-letter initials
- Background color derived from name hash (consistent per player)
- Border: 2px solid (host = gold, current turn = green glow, disconnected = gray)

---

### 1.7 Toast

**Purpose**: Feedback notifications
**Used on**: Global — any action result

```typescript
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;  // ms, default 3000
  onClose: (id: string) => void;
}
```

**Visual**:
- Bottom-right positioned
- Rounded, shadow
- Color-coded by type
- Auto-dismiss after duration

---

## 2. Game Components

### 2.1 UNOCard

**Purpose**: Display a UNO card
**Used on**: Player hand, discard pile, draw deck

```typescript
interface UNOCardProps {
  card: Card;  // { color, type, value }
  isPlayable?: boolean;
  isSelected?: boolean;
  isHidden?: boolean;  // face down for draw deck
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
```

**Visual**:
- Color background (red/yellow/green/blue) or black (wild)
- Center: number (0-9) or action text (Skip/Reverse/+2/Wild)
- White text, bold
- Border radius `--radius-lg`
- Shadow `--shadow-card`

**Card Content by Type**:
| Type | Display |
|------|---------|
| number | The digit (0-9) |
| skip | "SKIP" |
| reverse | "REV" |
| draw_two | "+2" |
| wild | "WILD" (rainbow border) |
| wild_draw_four | "+4" (rainbow border) |

**States**:
- Default: normal appearance
- Playable: glowing border animation (pulse)
- Selected: yellow border, scale 1.05
- Hidden (face down): dark patterned back
- Hover: translateY -4px, shadow increase

---

### 2.2 PlayerHand

**Purpose**: Display player's cards in horizontal layout
**Used on**: Game screen (bottom panel)

```typescript
interface PlayerHandProps {
  cards: Card[];
  playableIndices?: number[];
  selectedIndex?: number;
  isCurrentPlayer?: boolean;
  onCardClick: (index: number) => void;
  facingUp?: boolean;  // false = show count only (spectator/opponent)
}
```

**Layout**:
- Desktop: fan arrangement, max 10 visible, scroll for more
- Mobile: horizontal scroll, snap to center on selection

---

### 2.3 PlayerPanel

**Purpose**: Show player info, hand count, turn status
**Used on**: Game screen (around table)

```typescript
interface PlayerPanelProps {
  player: {
    id: string;
    name: string;
    handCount: number;
    connected: boolean;
  };
  isCurrentTurn: boolean;
  isHost?: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}
```

**Visual**:
- Avatar + name + hand count badge
- Current turn: glowing border `--warning`
- Disconnected: gray overlay, "Reconnecting..." text
- Position varies layout (top/bottom = horizontal, left/right = vertical)

---

### 2.4 DiscardPile

**Purpose**: Show top card of discard pile
**Used on**: Game screen (center)

```typescript
interface DiscardPileProps {
  topCard: Card;
  previousCards?: Card[];  // stack visualization (top 2-3)
  activeColor: Color;
}
```

**Visual**:
- Top card prominent, full size
- Stack offset (cards behind slightly visible)
- Active color indicator below

---

### 2.5 DrawDeck

**Purpose**: Show draw pile, click to draw
**Used on**: Game screen (center)

```typescript
interface DrawDeckProps {
  remainingCount: number;
  onClick: () => void;
  disabled?: boolean;
}
```

**Visual**:
- Stack of face-down cards (dark patterned back)
- Count badge showing remaining
- Hover: lift effect, "Draw" hint
- Disabled: gray overlay (not your turn)

---

### 2.6 TurnIndicator

**Purpose**: Show whose turn it is
**Used on**: Game screen (top)

```typescript
interface TurnIndicatorProps {
  currentPlayerName: string;
  isYourTurn: boolean;
  timeRemaining?: number;
  direction: 'cw' | 'ccw';
}
```

**Visual**:
- Banner: "Your turn" (green) or "[Name]'s turn" (neutral)
- Direction arrow: → or ←
- Pulsing animation on your turn

---

### 2.7 ActiveColorBadge

**Purpose**: Show current active color to match
**Used on**: Game screen (near discard pile)

```typescript
interface ActiveColorBadgeProps {
  color: Color;
}
```

**Visual**:
- Large colored badge (Red/Yellow/Green/Blue)
- Icon or text label
- Updates when Wild is played

---

### 2.8 UnoButton

**Purpose**: Call UNO when at 1 card
**Used on**: Game screen (bottom, near hand)

```typescript
interface UnoButtonProps {
  handSize: number;  // must be 1 to activate
  isYourTurn: boolean;
  onClick: () => void;
  disabled?: boolean;
}
```

**Visual**:
- Large red button with "UNO!" text
- Pulsing glow when active (handSize=1 and isYourTurn)
- Disabled: gray, no animation

---

### 2.9 ColorPickerModal

**Purpose**: Choose color after playing Wild/Wild+4
**Used on**: Game (modal overlay)

```typescript
interface ColorPickerModalProps {
  isOpen: boolean;
  onSelect: (color: Color) => void;
}
```

**Visual**:
- Modal with 4 large color buttons
- Red / Yellow / Green / Blue
- Each button is large (fills modal width)
- Click to select

---

### 2.10 GameOverModal

**Purpose**: Show winner and rematch options
**Used on**: Game (overlay when game ends)

```typescript
interface GameOverModalProps {
  isOpen: boolean;
  winner: { index: number; name: string } | null;
  reason: string;
  players: { name: string; cardCount: number }[];
  onRematch: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}
```

**Visual**:
- Large winner announcement
- Confetti animation (2s)
- Scoreboard: cards remaining per player
- Three buttons: Rematch, Play Again, Leave

---

### 2.11 RoomCard

**Purpose**: Display room in public list
**Used on**: Lobby room list

```typescript
interface RoomCardProps {
  room: {
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    status: 'lobby' | 'playing';
  };
  onJoin: () => void;
}
```

**Visual**:
- Card with room name, "2/4 Players", status badge
- Join button on right
- Full row clickable to join

---

## 3. Component States Summary

| Component | States |
|-----------|--------|
| Button | default, hover, active, disabled, loading |
| Card | default, hover, active |
| Input | default, focus, error, disabled |
| Modal | closed, open |
| Badge | (variant defines color) |
| Avatar | default, host, current-turn, disconnected |
| Toast | success, error, info, warning (auto-dismiss) |
| UNOCard | default, playable, selected, hidden, hover |
| PlayerHand | active, disabled, empty |
| PlayerPanel | waiting, current-turn, disconnected, winner |
| DiscardPile | normal, stacking |
| DrawDeck | full, low, empty, disabled |
| UnoButton | disabled, ready, pressed |
| ColorPickerModal | closed, open |
| GameOverModal | closed, winner-display |