# Room / Waiting Lobby Screen

**Route**: `/room/[roomId]`
**Purpose**: Waiting for players before game starts, or already in game

## Layout (Desktop)

```
+---------------------------------------------------------------+
|  [← Back]    Room: Minh's Room     [Room Code: ABCD]  [Share] |
+---------------------------------------------------------------+
|                                                                |
|   PLAYERS (2/4)                                                |
|   +----------------------------------------------------------+ |
|   | [●A] Player 847 (Host)          [Ready]                   | |
|   | [●B] Player 312                 [Ready]                  | |
|   | [  ] Empty slot                                          | |
|   | [  ] Empty slot                                          | |
|   +----------------------------------------------------------+ |
|                                                                |
|   +-----------------+                                        |
|   | WAITING FOR     |   [START GAME] (host, 2+ players)       |
|   | MORE PLAYERS    |                                        |
|   +-----------------+                                        |
|                                                                |
+---------------------------------------------------------------+
```

## Layout (Mobile, 375px)

```
+----------------------------------------+
| [←]  Room: Minh's Room    [Share]     |
+----------------------------------------+
|                                        |
|   PLAYERS (2/4)                        |
|   +----------------------------------+ |
|   | ● Player 847 (Host)     [Ready] | |
|   | ● Player 312            [Ready] | |
|   |   Empty slot                     | |
|   +----------------------------------+ |
|                                        |
|   WAITING FOR MORE PLAYERS             |
|   Share this link to invite friends:   |
|   [https://uno-online.vercel.app/room/ |
|    65f1a2b3c4d5e6f7]  [Copy]           |
|                                        |
|   [START GAME]                         |
|                                        |
+----------------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Back button | Returns to lobby | Confirmation if in game |
| Room name | Display name of room | Set by host on create |
| Room code | 4-letter code for manual join | Display only |
| Share button | Copies room link to clipboard | Shows "Copied!" toast |
| Player list | Shows all players in room | Updates in real-time |
| Player card | Avatar, name, host badge, ready status | — |
| Empty slot | Placeholder for not-yet-joined player | Dashed border |
| Start Game button | Initiates game (host only) | Disabled until 2+ players |
| Leave button | Exit room and return to lobby | Confirmation |

## States

- **Waiting for players** (< 2 players): "Waiting for more players..." message, Start button disabled
- **Ready to start** (2+ players, host): Start button enabled and glowing
- **In game** (game started): Shows game view instead of this lobby
- **Room full** (max players reached): No more join buttons shown
- **Host left** (host disconnected): Next player becomes host automatically

## Key Interactions

### Share Link
1. User clicks Share button
2. Room URL copied to clipboard
3. Toast appears: "Link copied! Share with friends"
4. User pastes link to friends via any channel

### Start Game
1. Host clicks "Start Game"
2. API called → game created, deck shuffled, cards dealt
3. All players redirected to game view
4. First player's turn begins

### Leave Room
1. User clicks Leave
2. If game in progress: confirmation modal "Leave game?"
3. API called → player removed from room
4. User redirected to lobby
5. If host leaves: next player promoted to host (or room deleted if < 2 players)

## Component Inventory

| Component | States |
|-----------|--------|
| PlayerCard | default, host, disconnected, empty |
| ShareButton | default, hover, copied (shows checkmark) |
| StartButton | disabled, enabled, loading |
| LeaveButton | default, confirm modal open |
| Toast | success (link copied) |
| BackConfirmModal | closed, open |