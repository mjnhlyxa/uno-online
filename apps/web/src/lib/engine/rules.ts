import type { Card, Color } from '@/types';

export function canPlayCard(
  card: Card,
  topCard: Card | null,
  activeColor: Color,
  pendingDraw: number
): boolean {
  if (!topCard) return true;

  // If pending draw, must play +2/+4 or draw
  if (pendingDraw > 0) {
    if (card.type === 'draw_two' || card.type === 'wild_draw_four') {
      return true;
    }
    return false;
  }

  // Wild cards always playable
  if (card.type === 'wild' || card.type === 'wild_draw_four') {
    return true;
  }

  // Match active color
  if (card.color === activeColor) {
    return true;
  }

  // Match number
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  // Match action type
  if (card.type === topCard.type && card.type !== 'number') {
    return true;
  }

  return false;
}

export function getPlayableIndices(
  hand: Card[],
  topCard: Card | null,
  activeColor: Color,
  pendingDraw: number
): number[] {
  return hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => canPlayCard(card, topCard, activeColor, pendingDraw))
    .map(({ index }) => index);
}

export function getCardDisplay(card: Card): string {
  if (card.type === 'number') {
    return card.value?.toString() ?? '';
  }
  switch (card.type) {
    case 'skip': return 'SKIP';
    case 'reverse': return 'REV';
    case 'draw_two': return '+2';
    case 'wild': return 'WILD';
    case 'wild_draw_four': return '+4';
    default: return '';
  }
}

export function getCardColorClass(color: Color | null): string {
  switch (color) {
    case 'red': return 'bg-uno-red';
    case 'yellow': return 'bg-uno-yellow text-gray-900';
    case 'green': return 'bg-uno-green';
    case 'blue': return 'bg-uno-blue';
    default: return 'bg-gray-900';
  }
}