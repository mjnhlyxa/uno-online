export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export interface Card {
  color: Color | null;
  type: CardType;
  value: number | null;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  connected: boolean;
}

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  currentPlayers: Player[];
  gameId: string | null;
  status: 'lobby' | 'full' | 'playing';
  createdAt: string;
  shareUrl?: string;
  playerCount?: number;
}

export interface GameState {
  id: string;
  roomId: string;
  players: { id: string; name: string; handCount: number; connected: boolean }[];
  deckCount: number;
  discardPile: Card[];
  currentTurnIndex: number;
  direction: 1 | -1;
  activeColor: Color | null;
  status: 'waiting' | 'playing' | 'finished';
  pendingDrawCount: number;
  canPlayCards: number[];
  winner: { playerIndex: number; name: string; reason: string } | null;
}

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}