'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getPlayerId, getPlayerName, setPlayerName } from '@/lib/player';
import type { Room } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LobbyPage() {
  const [playerId, setPlayerIdState] = useState('');
  const [playerName, setPlayerNameState] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const { data: roomsData, error, mutate } = useSWR(
    `${API_URL}/api/rooms?status=lobby&limit=20`,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    setPlayerIdState(getPlayerId());
    setPlayerNameState(getPlayerName());
  }, []);

  const handleCreateRoom = async (name: string, maxPlayers: number, isPrivate: boolean) => {
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        maxPlayers,
        isPrivate,
        playerId,
        playerName,
      }),
    });
    const data = await res.json();
    if (data.success && data.room?.id) {
      window.location.href = `/room/${data.room.id}`;
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const res = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, playerName }),
    });
    const data = await res.json();
    if (data.success && data.room?.id) {
      window.location.href = `/room/${data.room.id}`;
    } else {
      alert(data.detail || 'Failed to join room');
    }
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
      setPlayerNameState(nameInput.trim());
    }
    setEditingName(false);
  };

  const rooms: Room[] = roomsData?.rooms || [];

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-uno-red via-uno-yellow via-uno-green to-uno-blue bg-clip-text text-transparent">
          UNO Online
        </h1>
        <div className="flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="px-3 py-2 rounded-lg bg-bg-elevated border border-border text-sm w-32"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(playerName);
                setEditingName(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-surface border border-border hover:border-uno-blue transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-uno-blue flex items-center justify-center text-sm font-bold">
                {playerName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-text-secondary">{playerName}</span>
            </button>
          )}
        </div>
      </header>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-6 rounded-xl bg-uno-blue text-white font-bold text-lg hover:brightness-110 active:scale-98 transition-all"
        >
          Create Room
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className="p-6 rounded-xl bg-bg-elevated border border-border font-bold text-lg hover:border-uno-blue transition-all"
        >
          Join Room
        </button>
      </div>

      {/* Room List */}
      <section className="max-w-2xl mx-auto">
        <h2 className="text-sm uppercase tracking-wider text-text-muted mb-4">Public Rooms</h2>
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-12 bg-bg-surface rounded-xl border border-border">
              <p className="text-text-muted">No public rooms available.</p>
              <p className="text-text-secondary text-sm mt-2">Create one to get started!</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 bg-bg-surface rounded-xl border border-border hover:border-uno-blue transition-all"
              >
                <div>
                  <div className="font-semibold">{room.name}</div>
                  <div className="text-sm text-text-secondary">
                    {room.playerCount || 0}/{room.maxPlayers} players · {room.status}
                  </div>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="px-4 py-2 rounded-lg bg-uno-blue text-white font-semibold hover:brightness-110 transition-all"
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
        />
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <JoinRoomModal
          onClose={() => setShowJoinModal(false)}
          onJoin={(roomId) => {
            setShowJoinModal(false);
            handleJoinRoom(roomId);
          }}
        />
      )}
    </main>
  );
}

function CreateRoomModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, maxPlayers: number, isPrivate: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-elevated rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Create Room</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My UNO Room"
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg bg-bg-surface border border-border focus:border-uno-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Max Players</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-bg-surface border border-border focus:border-uno-blue outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} players</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span>Private room (not shown in public list)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-border font-semibold hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => name.trim() && onCreate(name.trim(), maxPlayers, isPrivate)}
              disabled={!name.trim()}
              className="flex-1 py-3 rounded-lg bg-uno-blue text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinRoomModal({
  onClose,
  onJoin,
}: {
  onClose: () => void;
  onJoin: (roomId: string) => void;
}) {
  const [roomId, setRoomId] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-elevated rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Join Room</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Room ID or Link</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Paste room link or ID"
              className="w-full px-4 py-3 rounded-lg bg-bg-surface border border-border focus:border-uno-blue outline-none font-mono text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-border font-semibold hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Extract room ID from URL if pasted
                let id = roomId.trim();
                if (id.includes('/room/')) {
                  const parts = id.split('/room/');
                  id = parts[parts.length - 1].split('?')[0];
                }
                if (id) onJoin(id);
              }}
              disabled={!roomId.trim()}
              className="flex-1 py-3 rounded-lg bg-uno-blue text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}