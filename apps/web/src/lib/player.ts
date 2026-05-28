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