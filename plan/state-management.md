# uno-online — State Management Design

> **C4 Level**: 3 — State Management Components
> **Status**: Draft | Created: 2026-05-29

## 1. State Categories

### 1.1 Server State (Persisted in MongoDB)
- Room state (players, settings, status, maxPlayers)
- Game state (deck, discardPile, hands, turn, direction, activeColor)
- Move history (for replay/analysis)
- Match history (finished games)

### 1.2 Client State (In-Memory)
- UI state: selected card, open modals, toasts, loading states
- Connection state: WebSocket connected/disconnected, reconnect attempts
- Player identity: UUID from localStorage

### 1.3 URL State
- Room ID: `/room/[roomId]` — for shareability
- Used to restore game state on page load

## 2. State Management Approach

### 2.1 Server State: React Query / SWR
```typescript
// apps/web/src/lib/queryProvider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SWRConfig } from 'swr';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,  // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const swrConfig = {
  refreshInterval: 5000,  // Poll lobby list every 5s
  revalidateOnFocus: true,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={swrConfig}>
        {children}
      </SWRConfig>
    </QueryClientProvider>
  );
}
```

### 2.2 Game State Sync: WebSocket + Local Mirror
```typescript
// apps/web/src/lib/gameStore.ts
import { create } from 'zustand';

interface GameState {
  // Server-authoritative state
  gameId: string | null;
  players: Player[];
  deckCount: number;
  discardPile: Card[];
  currentTurnIndex: number;
  direction: 1 | -1;
  activeColor: Color;
  status: GameStatus;
  pendingDrawCount: number;

  // UI state
  selectedCardIndex: number | null;
  isConnected: boolean;
  isReconnecting: boolean;

  // Actions
  setGameState: (state: Partial<GameState>) => void;
  selectCard: (index: number | null) => void;
  setConnectionStatus: (connected: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  gameId: null,
  players: [],
  deckCount: 0,
  discardPile: [],
  currentTurnIndex: 0,
  direction: 1,
  activeColor: 'red',
  status: 'waiting',
  pendingDrawCount: 0,

  selectedCardIndex: null,
  isConnected: false,
  isReconnecting: false,

  setGameState: (newState) => set((state) => ({ ...state, ...newState })),
  selectCard: (index) => set({ selectedCardIndex: index }),
  setConnectionStatus: (connected) => set({ isConnected: connected }),
}));
```

### 2.3 Client UI State: Zustand (Lightweight)
```typescript
// UI modals, toasts, etc.
interface UIState {
  createRoomModalOpen: boolean;
  joinRoomModalOpen: boolean;
  gameOverModalOpen: boolean;
  toasts: Toast[];

  openCreateRoom: () => void;
  closeCreateRoom: () => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  createRoomModalOpen: false,
  joinRoomModalOpen: false,
  gameOverModalOpen: false,
  toasts: [],

  openCreateRoom: () => set({ createRoomModalOpen: true }),
  closeCreateRoom: () => set({ createRoomModalOpen: false }),
  addToast: (message, type) => set((state) => ({
    toasts: [...state.toasts, { id: uuid(), message, type }],
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));
```

## 3. Player Identity Management

### 3.1 Anonymous ID Generation
```typescript
// apps/web/src/lib/player.ts
import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID_KEY = 'uno_player_id';
const PLAYER_NAME_KEY = 'uno_player_name';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return 'Anonymous';

  let name = localStorage.getItem(PLAYER_NAME_KEY);
  if (!name) {
    // Generate friendly name: "Player 123"
    name = `Player ${Math.floor(Math.random() * 900) + 100}`;
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }
  return name;
}

export function setPlayerName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_NAME_KEY, name.slice(0, 20));
  }
}
```

## 4. Turn Validation Flow

### 4.1 Client-Side Preview (Instant Feedback)
```typescript
// apps/web/src/lib/engine/rules.ts
export function getPlayableCards(hand: Card[], topCard: Card, activeColor: Color): number[] {
  return hand.reduce((indices, card, i) => {
    if (canPlayCard(card, topCard, activeColor)) {
      indices.push(i);
    }
    return indices;
  }, [] as number[]);
}

export function canPlayCard(card: Card, topCard: Card, activeColor: Color): boolean {
  // Wild cards always playable
  if (card.type === 'wild' || card.type === 'wild_draw_four') return true;

  // Match active color
  if (card.color === activeColor) return true;

  // Match number
  if (card.type === 'number' && card.value === topCard.value) return true;

  // Match action type
  if (card.type === topCard.type && card.type !== 'number') return true;

  return false;
}
```

### 4.2 Server-Side Validation (Authoritative)
```python
# apps/api/src/game_logic/rules.py
def can_play_card(card: Card, top_card: Card, active_color: Color, pending_draw: int) -> bool:
    """Validate card play on server side."""
    # If pending draw cards, must play +2/+4 or draw
    if pending_draw > 0:
        if card.type in ('draw_two', 'wild_draw_four'):
            return True
        return False  # Must draw

    # Wild always playable
    if card.type in ('wild', 'wild_draw_four'):
        return True

    # Color match
    if card.color == active_color:
        return True

    # Number match
    if card.type == 'number' and card.value == top_card.value:
        return True

    # Action match
    if card.type == top_card.type and card.type != 'number':
        return True

    return False
```

## 5. Reconnection Strategy

### 5.1 State Recovery on Reconnect
```typescript
// apps/web/src/lib/websocket.ts
class GameWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private roomId: string;
  private playerId: string;

  connect(roomId: string, playerId: string) {
    this.roomId = roomId;
    this.playerId = playerId;

    const url = `${WS_URL}/ws/${roomId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendAuth();
      this.reconnectAttempts = 0;
      useGameStore.getState().setConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.handleDisconnect();
    };
  }

  private handleDisconnect() {
    useGameStore.getState().setConnectionStatus(false);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      useGameStore.getState().setConnectionStatus(true);  // "reconnecting" state
      setTimeout(() => this.connect(this.roomId, this.playerId), delay);
    }
  }
}
```

## 6. Optimistic Updates

### 6.1 Card Play (Optimistic + Rollback)
```typescript
// In game component
const playCard = async (cardIndex: number) => {
  const previousState = useGameStore.getState();

  // Optimistically update UI
  useGameStore.getState().setGameState({
    selectedCardIndex: null,
    // ... optimistic state
  });

  try {
    const response = await fetch(`/api/games/${gameId}/play`, {
      method: 'POST',
      body: JSON.stringify({ playerId, cardIndex }),
    });
    const result = await response.json();

    if (result.success) {
      useGameStore.getState().setGameState(result.game);
    } else {
      // Rollback on failure
      useGameStore.getState().setGameState(previousState);
      useUIStore.getState().addToast(result.message, 'error');
    }
  } catch (err) {
    // Rollback on network error
    useGameStore.getState().setGameState(previousState);
    useUIStore.getState().addToast('Network error', 'error');
  }
};
```