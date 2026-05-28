# uno-online — Component Specifications

> **C4 Level**: 3 — UI Component Specifications
> **Status**: Draft | Created: 2026-05-29

## 1. Component Architecture

### 1.1 Directory Structure
```
apps/web/src/
├── app/
│   ├── layout.tsx              # Root layout (font, providers)
│   ├── page.tsx               # Lobby page (SSG)
│   ├── room/[roomId]/
│   │   └── page.tsx           # Game room (CSR + WebSocket)
│   └── globals.css
├── components/
│   ├── ui/                     # Generic reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   └── Toast.tsx
│   └── game/                  # Game-specific components
│       ├── Lobby/
│       │   ├── CreateRoomModal.tsx
│       │   ├── JoinRoomModal.tsx
│       │   └── RoomList.tsx
│       ├── GameRoom/
│       │   ├── GameBoard.tsx
│       │   ├── PlayerHand.tsx
│       │   ├── PlayerPanel.tsx
│       │   ├── DiscardPile.tsx
│       │   ├── DrawDeck.tsx
│       │   ├── UnoButton.tsx
│       │   ├── ColorPickerModal.tsx
│       │   ├── TurnIndicator.tsx
│       │   └── GameOverModal.tsx
│       └── Spectator/
│           └── SpectatorView.tsx
├── lib/
│   ├── engine/                # Pure JS UNO engine (no React deps)
│   │   ├── types.ts           # Card, GameState, Action types
│   │   ├── deck.ts            # Deck creation, shuffle
│   │   ├── rules.ts            # Move validation, card matching
│   │   ├── game.ts            # Game state transitions
│   │   └── ai.ts              # Bot player logic
│   ├── api.ts                 # REST API client
│   ├── websocket.ts           # WebSocket client manager
│   └── player.ts              # Anonymous player ID management
└── types/
    └── index.ts               # Shared TypeScript types
```

## 2. UI Primitives (Generic)

### 2.1 Button Component
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
**Visual**: Rounded corners (8px), bold text, subtle shadow, color by variant
**States**: default, hover (+brightness), active (scale 0.98), disabled (opacity 0.5), loading (spinner)

### 2.2 Card Component
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}
```
**Visual**: White background, 1px border, rounded-lg, padding 16px
**States**: default, hover (shadow + translate -2px) if hoverable

### 2.3 Input Component
```typescript
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  maxLength?: number;
}
```

### 2.4 Modal Component
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```
**Visual**: Centered overlay, dark backdrop (rgba(0,0,0,0.5)), white panel, rounded-xl
**Behavior**: Click backdrop or X button to close, ESC to close, focus trap

### 2.5 Badge Component
```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'uno';
  children: React.ReactNode;
}
```

### 2.6 Avatar Component
```typescript
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isHost?: boolean;
  isCurrentTurn?: boolean;
  connected?: boolean;
}
```
**Visual**: Circle with initials, color derived from name hash, border for status

### 2.7 Toast Component
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;  // ms, default 3000
  onClose: () => void;
}
```

## 3. Game Components

### 3.1 UNOCard Component
```typescript
interface UNOCardProps {
  card: Card;  // { color, type, value }
  isPlayable?: boolean;
  isSelected?: boolean;
  isHidden?: boolean;  // face down
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
```
**Visual**:
- Size md: 80px × 120px
- Colored background matching card color
- Number/action centered, large font
- Rounded corners (12px)
- Subtle inner shadow for depth
**States**:
- Default: flat
- Playable: glowing border (box-shadow pulse animation)
- Selected: scale 1.05, yellow border
- Hidden: dark pattern back
- Hover: translateY -4px, shadow increase

### 3.2 PlayerHand Component
```typescript
interface PlayerHandProps {
  cards: Card[];
  playableIndices?: number[];
  selectedIndex?: number;
  isCurrentPlayer?: boolean;
  onCardClick: (index: number) => void;
  facingUp?: boolean;  // false for other players' hands (count only)
}
```
**Layout**: Horizontal scroll if >7 cards, fan arrangement for 7-10 cards
**Behavior**: Tap card to select, tap again to play (if playable), or tap deck to draw

### 3.3 PlayerPanel Component
```typescript
interface PlayerPanelProps {
  player: {
    id: string;
    name: string;
    handCount: number;
    connected: boolean;
  };
  isCurrentTurn: boolean;
  isHost: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  score?: number;  // cumulative wins
}
```
**Visual**: Shows name, avatar, hand count badge, turn indicator (glowing ring)
**Layout**: Vertical on left/right sides, horizontal on top/bottom

### 3.4 DiscardPile Component
```typescript
interface DiscardPileProps {
  topCard: Card;
  previousCards?: Card[];  // stack visualization
  activeColor: string;
}
```
**Visual**: Stack with offset cards showing depth, top card prominent
**Animation**: New card flies in from player hand with rotation

### 3.5 DrawDeck Component
```typescript
interface DrawDeckProps {
  remainingCount: number;
  onClick: () => void;  // draw card action
  disabled?: boolean;
}
```
**Visual**: Stack of face-down cards with count badge
**States**: Default, hover (lift), disabled (grayed)
**Animation**: Top card slides out when drawn

### 3.6 TurnIndicator Component
```typescript
interface TurnIndicatorProps {
  currentPlayerName: string;
  timeRemaining?: number;  // seconds (optional)
  direction: 'cw' | 'ccw';
}
```
**Visual**: Banner showing "Your turn" or "[Name]'s turn"
**Direction arrow**: Shows current rotation direction (cw/ccw)

### 3.7 ColorPickerModal Component
```typescript
interface ColorPickerModalProps {
  isOpen: boolean;
  onSelect: (color: Color) => void;
}
```
**Visual**: 4 large color buttons (Red/Yellow/Green/Blue) with icons
**Behavior**: Modal blocks game until color selected

### 3.8 UnoButton Component
```typescript
interface UnoButtonProps {
  handSize: number;  // must be 1 to activate
  onClick: () => void;
  disabled?: boolean;
}
```
**Visual**: Large prominent button with UNO logo, pulsing when handSize=1
**States**: Disabled (gray) when handSize > 1, pulsing when handSize=1

### 3.9 GameOverModal Component
```typescript
interface GameOverModalProps {
  isOpen: boolean;
  winner: { index: number; name: string } | null;
  reason: string;
  onRematch: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}
```
**Visual**: Overlay with winner announcement, confetti for winner
**Buttons**: Rematch (same players), Play Again (new room), Leave

### 3.10 Lobby Components

#### RoomList
```typescript
interface RoomListProps {
  rooms: Room[];
  onJoin: (roomId: string) => void;
}
```
**Visual**: Scrollable list of RoomCard components
**Empty state**: "No public rooms. Create one!"

#### RoomCard
```typescript
interface RoomCardProps {
  room: Room;
  onJoin: () => void;
}
```
**Visual**: Card showing room name, player count (e.g., "2/4"), join button

#### CreateRoomModal
```typescript
interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, maxPlayers: number, isPrivate: boolean) => void;
}
```

#### JoinRoomModal
```typescript
interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}
```
**Visual**: Text input for room ID/link

## 4. Pages

### 4.1 Lobby Page (`/`)
```typescript
// Server component (SSG)
export default function LobbyPage() {
  return (
    <main>
      <h1>UNO Online</h1>
      <CreateRoomButton />
      <JoinRoomButton />
      <RoomList rooms={fetchPublicRooms()} />
    </main>
  );
}
```

### 4.2 Game Room Page (`/room/[roomId]`)
```typescript
// Client component
'use client';
export default function GameRoomPage({ params }: { params: { roomId: string } }) {
  // WebSocket connection on mount
  // Fetch initial room/game state
  // Render game components based on state
  // Handle all game events
}
```

## 5. Component States Summary

| Component | States |
|-----------|--------|
| UNOCard | default, playable, selected, hidden, hover |
| PlayerHand | active (scroll), compact, empty |
| PlayerPanel | waiting, current-turn, disconnected, winner |
| DiscardPile | empty, normal, stacking |
| DrawDeck | full, low (<10), empty |
| UnoButton | disabled, ready (pulsing), pressed |
| ColorPickerModal | closed, open |
| GameOverModal | closed, winner-display, draw-display |

## 6. Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|------------|-------|---------------------|
| Mobile | < 640px | Stack player panels, smaller cards (60×90px) |
| Tablet | 640-1024px | Side player panels, medium cards (70×105px) |
| Desktop | > 1024px | Full layout, standard cards (80×120px) |