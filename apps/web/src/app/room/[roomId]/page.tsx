'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getPlayerId, getPlayerName } from '@/lib/player';
import type { GameState, Card, Color } from '@/types';
import { getCardDisplay, getCardColorClass } from '@/lib/engine/rules';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  // Fetch room data
  const { data: roomData, mutate: mutateRoom } = useSWR(
    roomId ? `${API_URL}/api/rooms/${roomId}` : null,
    fetcher
  );

  useEffect(() => {
    setPlayerId(getPlayerId());
    setPlayerName(getPlayerName());
  }, []);

  useEffect(() => {
    if (roomData?.room) {
      setRoom(roomData.room);
      if (roomData.room.status === 'playing' && roomData.room.gameId) {
        fetchGameState(roomData.room.gameId);
      }
    }
  }, [roomData]);

  const fetchGameState = async (gameId: string) => {
    const res = await fetch(`${API_URL}/api/games/${gameId}`);
    const data = await res.json();
    if (data.success) {
      setGameState(data.game);
    }
  };

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!roomId || !playerId) return;

    const wsUrl = `${WS_URL}/ws/${roomId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Auth
      socket.send(JSON.stringify({ type: 'auth', playerId }));
      setIsConnected(true);
      setToast('Connected!');
      setTimeout(() => setToast(null), 2000);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'auth_ok') {
        if (data.gameState) {
          setGameState(data.gameState);
          if (data.gameState.status === 'finished') {
            setShowGameOver(true);
          }
        }
      } else if (data.type === 'game_update') {
        setGameState(data.game);
        if (data.game.status === 'finished') {
          setShowGameOver(true);
        }
      } else if (data.type === 'player_joined') {
        setToast(`${data.playerName} joined!`);
        setTimeout(() => setToast(null), 2000);
        mutateRoom();
      } else if (data.type === 'player_disconnected') {
        setToast('A player disconnected');
        setTimeout(() => setToast(null), 2000);
      } else if (data.type === 'chat') {
        setToast(`${data.playerId}: ${data.message}`);
        setTimeout(() => setToast(null), 3000);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Reconnect with backoff
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    socket.onerror = () => {
      socket.close();
    };

    setWs(socket);
  }, [roomId, playerId, mutateRoom]);

  useEffect(() => {
    if (roomId && playerId) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws?.close();
    };
  }, [roomId, playerId, connectWebSocket]);

  const handlePlayCard = async (cardIndex: number, chosenColor?: Color) => {
    if (!gameState) return;

    const res = await fetch(`${API_URL}/api/games/${gameState.id}/play?player_id=${playerId}&card_index=${cardIndex}&chosen_color=${chosenColor || ''}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      setGameState(data.game);
      setSelectedCardIndex(null);
      if (data.game.status === 'finished') {
        setShowGameOver(true);
      }
    } else {
      setToast(data.detail || 'Invalid move');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleDrawCard = async () => {
    if (!gameState) return;

    const res = await fetch(`${API_URL}/api/games/${gameState.id}/draw?player_id=${playerId}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      setGameState(data.game);
    } else {
      setToast(data.detail || 'Cannot draw');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleStartGame = async () => {
    if (!room) return;

    const res = await fetch(`${API_URL}/api/games?room_id=${roomId}&host_player_id=${playerId}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      setGameState(data.game);
      setRoom({ ...room, status: 'playing', gameId: data.game.id });
    }
  };

  const handleLeaveRoom = async () => {
    await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, playerName }),
    });
    router.push('/');
  };

  const handleRematch = async () => {
    if (!room) return;
    const res = await fetch(`${API_URL}/api/games?room_id=${roomId}&host_player_id=${playerId}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      setGameState(data.game);
      setShowGameOver(false);
      setRoom({ ...room, status: 'playing', gameId: data.game.id });
    }
  };

  const currentPlayerIndex = gameState?.players.findIndex((p) => p.id === playerId) ?? -1;
  const isMyTurn = currentPlayerIndex === gameState?.currentTurnIndex;
  const myHand = gameState?.players[currentPlayerIndex]?.hand || [];
  const topCard = gameState?.discardPile?.[0] as Card | null;
  const activeColor = (gameState?.activeColor || topCard?.color) as Color;
  const pendingDraw = gameState?.pendingDrawCount || 0;

  const playableIndices = gameState?.canPlayCards || [];

  const isHost = room?.currentPlayers?.[0]?.id === playerId;
  const canStart = isHost && (room?.currentPlayers?.length || 0) >= 2;

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading room...</div>
      </main>
    );
  }

  // Game view
  if (gameState && gameState.status === 'playing') {
    return (
      <main className="min-h-screen flex flex-col p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-lg border border-border hover:bg-bg-hover transition-colors">
            ← Leave
          </button>
          <div className={`px-4 py-2 rounded-full font-bold ${isMyTurn ? 'bg-success text-white' : 'bg-bg-elevated'}`}>
            {isMyTurn ? 'Your Turn' : `${gameState.players[gameState.currentTurnIndex]?.name}'s turn`}
          </div>
          <div className="text-sm text-text-secondary">
            {gameState.direction === 1 ? '→ Clockwise' : '← Counter-clockwise'}
          </div>
        </header>

        {/* Game Table */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 mb-4">
          {/* Center area */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <div className="text-xs text-text-muted mb-2">DRAW</div>
              <button
                onClick={handleDrawCard}
                disabled={!isMyTurn}
                className="w-20 h-28 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-text-muted text-xs mt-1">{gameState.deckCount}</div>
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-xs text-text-muted mb-2">DISCARD</div>
              {topCard && (
                <div className={`w-20 h-28 rounded-xl ${getCardColorClass(topCard.color)} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                  {getCardDisplay(topCard)}
                </div>
              )}
            </div>
          </div>

          {/* Active Color */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Active Color:</span>
            <div className={`w-6 h-6 rounded-full ${getCardColorClass(activeColor)}`} />
            <span className="font-semibold uppercase">{activeColor}</span>
          </div>

          {/* Players around table */}
          <div className="flex gap-8">
            {gameState.players.map((player, idx) => (
              <div
                key={player.id}
                className={`flex flex-col items-center p-3 rounded-xl border-2 ${
                  idx === gameState.currentTurnIndex
                    ? 'border-success shadow-lg shadow-success/30'
                    : 'border-border'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-uno-blue flex items-center justify-center font-bold text-sm mb-1">
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs font-semibold truncate max-w-16">{player.name}</div>
                <div className="text-xs text-text-muted">{player.handCount} cards</div>
              </div>
            ))}
          </div>
        </div>

        {/* My Hand */}
        <div className="bg-bg-surface rounded-xl p-4">
          <div className="text-sm text-text-secondary mb-2">Your Hand</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {myHand.map((card, idx) => {
              const isPlayable = playableIndices.includes(idx);
              const isSelected = selectedCardIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isMyTurn) return;
                    if (isPlayable) {
                      if (card.type === 'wild' || card.type === 'wild_draw_four') {
                        setSelectedCardIndex(idx);
                        setShowColorPicker(true);
                      } else {
                        handlePlayCard(idx);
                      }
                    }
                  }}
                  disabled={!isMyTurn}
                  className={`w-16 h-24 rounded-lg ${getCardColorClass(card.color)} flex items-center justify-center text-white text-lg font-bold transition-all flex-shrink-0 ${
                    isPlayable && isMyTurn ? 'animate-glow-pulse cursor-pointer' : ''
                  } ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''} disabled:opacity-60`}
                >
                  {getCardDisplay(card)}
                </button>
              );
            })}
          </div>
          {myHand.length === 1 && (
            <button className="mt-3 w-full py-3 rounded-xl bg-uno-red text-white font-black text-xl animate-uno-pulse">
              UNO!
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-bg-elevated border border-border shadow-lg">
            {toast}
          </div>
        )}

        {/* Color Picker Modal */}
        {showColorPicker && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowColorPicker(false)}>
            <div className="bg-bg-elevated rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-center">Choose a Color</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['red', 'yellow', 'green', 'blue'] as Color[]).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setShowColorPicker(false);
                      if (selectedCardIndex !== null) {
                        handlePlayCard(selectedCardIndex, color);
                      }
                    }}
                    className={`h-20 rounded-xl ${getCardColorClass(color)} text-white font-black text-xl capitalize`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {showGameOver && gameState.winner && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-bg-elevated rounded-xl p-8 text-center max-w-md w-full mx-4">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-black mb-2">
                {gameState.winner.name} Wins!
              </h2>
              <p className="text-text-secondary mb-6">Reason: {gameState.winner.reason}</p>

              <div className="space-y-3">
                <button
                  onClick={handleRematch}
                  className="w-full py-3 rounded-xl bg-uno-blue text-white font-bold hover:brightness-110 transition-all"
                >
                  Rematch (Same Players)
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 rounded-xl bg-bg-surface border border-border font-semibold hover:bg-bg-hover transition-all"
                >
                  Play Again
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-3 text-text-muted hover:text-text-secondary transition-colors"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // Waiting lobby
  return (
    <main className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between mb-6">
        <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-lg border border-border hover:bg-bg-hover transition-colors">
          ← Back
        </button>
        <h1 className="text-xl font-bold">{room.name}</h1>
        <span className="px-3 py-1 rounded-lg bg-bg-elevated text-sm font-mono">{roomId.slice(-4).toUpperCase()}</span>
      </header>

      <div className="bg-bg-surface rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Players ({(room.currentPlayers || []).length}/{room.maxPlayers})</h2>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setToast('Link copied!');
              setTimeout(() => setToast(null), 2000);
            }}
            className="px-4 py-2 rounded-lg bg-bg-elevated border border-border text-sm font-semibold hover:bg-bg-hover transition-colors"
          >
            Share Link
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(room.currentPlayers || []).map((player: any, idx: number) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-lg bg-bg-elevated ${
                idx === 0 ? 'border-2 border-warning' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-uno-blue flex items-center justify-center font-bold">
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm">{player.name}</div>
                {idx === 0 && <span className="text-xs text-warning">Host</span>}
              </div>
            </div>
          ))}
          {Array.from({ length: (room.maxPlayers || 4) - (room.currentPlayers || []).length }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border">
              <div className="w-10 h-10 rounded-full bg-bg-hover" />
              <span className="text-text-muted text-sm">Empty slot</span>
            </div>
          ))}
        </div>

        <div className="text-center text-text-muted mb-4">
          Share this link to invite friends:
        </div>
        <div className="flex items-center gap-2 p-3 bg-bg-elevated rounded-lg mb-6">
          <code className="flex-1 text-sm font-mono overflow-hidden text-ellipsis">
            {typeof window !== 'undefined' ? window.location.href : ''}
          </code>
        </div>

        <button
          onClick={handleStartGame}
          disabled={!canStart}
          className="w-full py-4 rounded-xl bg-uno-green text-white font-bold text-lg hover:brightness-110 transition-all disabled:bg-bg-hover disabled:text-text-muted disabled:cursor-not-allowed"
        >
          {canStart ? 'Start Game' : `Need ${2 - (room.currentPlayers?.length || 0)} more players`}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-success text-white font-semibold shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}