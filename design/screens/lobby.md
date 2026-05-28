# Lobby Screen

**Route**: `/`
**Purpose**: Entry point for creating or joining rooms

## Layout (Desktop)

```
+---------------------------------------------------------------+
|  [UNO Logo]         UNO Online              [Player 847 ▼]   |
+---------------------------------------------------------------+
|                                                                |
|    +-------------------+    +-------------------+             |
|    |                   |    |                   |             |
|    |   CREATE ROOM     |    |    JOIN ROOM      |             |
|    |   + size selector |    |    + room code    |             |
|    |   + private toggle|    |    + submit       |             |
|    |                   |    |                   |             |
|    +-------------------+    +-------------------+             |
|                                                                |
|    PUBLIC ROOMS                                                |
|    +--------------------------------------------------------+ |
|    |  Room Name        Players       Status      [Join]     | |
|    +--------------------------------------------------------+ |
|    |  Phòng của Minh   2/4          Waiting     [Join]      | |
|    +--------------------------------------------------------+ |
|    |  (empty state: "No public rooms. Create one!")          | |
|    +--------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

## Layout (Mobile, 375px)

```
+----------------------------------------+
| [UNO]    UNO Online      [Player 847] |
+----------------------------------------+
|                                        |
|   [CREATE ROOM]                        |
|                                        |
|   [JOIN ROOM]                          |
|                                        |
|   PUBLIC ROOMS                         |
|   +----------------------------------+ |
|   | Minh's Room     2/4    [Join]   | |
|   +----------------------------------+ |
|                                        |
+----------------------------------------+
```

## Elements

| Element | Description | Behavior |
|---------|-------------|----------|
| Logo | "UNO Online" text + UNO colors | None — branding |
| Create Room button | Primary action, large | Opens CreateRoomModal |
| Join Room button | Secondary action, large | Opens JoinRoomModal |
| Room list | List of public open rooms | Scrollable, click to join |
| Room card | Shows name, player count, status | Hover highlight, click to join |
| Player name | Top right, shows current player name | Click to edit inline |
| Edit name modal | Text input for new name | Save on Enter or blur |

## States

- **Default**: Full lobby with rooms list (or empty state)
- **Empty rooms**: "No public rooms. Create one to get started!"
- **Loading rooms**: Skeleton cards
- **Error loading**: Toast "Failed to load rooms. Retry?" with retry button

## Key Interactions

### Create Room Flow
1. User clicks "Create Room"
2. Modal opens with: room name input, max players dropdown (2-10), private toggle
3. User fills form and clicks "Create"
4. API called → room created
5. User redirected to room waiting page (`/room/[roomId]`)

### Join Room Flow
1. User clicks "Join Room"
2. Modal opens with room code input (or paste link)
3. User enters code and clicks "Join"
4. API called → player added to room
5. User redirected to room waiting page

### Join via Public List
1. User sees list of public rooms
2. User clicks "Join" on a room card
3. API called → player added to room
4. User redirected to room waiting page

## Component Inventory

| Component | States |
|-----------|--------|
| Button (Create/Join) | default, hover, active, disabled |
| RoomCard | default, hover, full (can't join) |
| CreateRoomModal | closed, open, submitting |
| JoinRoomModal | closed, open, submitting, invalid code |
| PlayerNameEditor | display, editing |
| Toast | success, error, info |
| LoadingSkeleton | visible while fetching |