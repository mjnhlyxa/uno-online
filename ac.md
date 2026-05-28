# Acceptance Criteria — uno-online

> **Status**: Draft | Created: 2026-05-29 | Based on: brainstorm.md + plan/ + design/
> **Format**: Given-When-Then (BDD)
> **Total ACs**: 48

---

## Table of Contents

1. [Anonymous Identity](#1-anonymous-identity)
2. [Room Management](#2-room-management)
3. [Core Gameplay](#3-core-gameplay)
4. [Special Cards](#4-special-cards)
5. [UNO Call](#5-uno-call)
6. [Real-time Updates](#6-real-time-updates)
7. [Mobile Experience](#7-mobile-experience)
8. [Error Handling](#8-error-handling)
9. [Data Persistence](#9-data-persistence)

---

## 1. Anonymous Identity

### AC-ID-001: Anonymous player ID is generated on first visit
- **Given**: Player opens the game for the first time (no localStorage data)
- **When**: The game page loads
- **Then**: A unique UUID (v4) is generated and stored in localStorage as `playerId`

### AC-ID-002: Player ID persists across page reloads
- **Given**: Player has a `playerId` in localStorage
- **When**: Player reloads the page or opens a new browser tab
- **Then**: The same `playerId` is retrieved from localStorage and used

### AC-ID-003: Default player name is auto-generated
- **Given**: Player has no name set in localStorage
- **When**: Player joins a room or creates a room
- **Then**: A default name like "Player 847" is generated and stored as `playerName`

### AC-ID-004: Player can edit their display name
- **Given**: Player is on the lobby page with a default name
- **When**: Player clicks on their name and enters a new name
- **Then**: The name is saved to localStorage and displayed throughout the session

---

## 2. Room Management

### AC-ROOM-001: Player can create a public room
- **Given**: Player is on the lobby page
- **When**: Player clicks "Create Room", enters "Test Room", and clicks "Create"
- **Then**: A new public room named "Test Room" is created, player becomes host, and a shareable link is generated

### AC-ROOM-002: Room name is required (max 50 chars)
- **Given**: Player is on the lobby page and opens the "Create Room" dialog
- **When**: Player clicks "Create" without entering a room name
- **Then**: An error message "Room name is required" appears, and no room is created

### AC-ROOM-003: Private room does NOT appear in public list
- **Given**: Player creates a new room with "Private" checkbox selected
- **When**: Other players view the public room list
- **Then**: The private room is not visible in the public room list

### AC-ROOM-004: Player can join room via share link
- **Given**: Player 1 created a room and shared the link `/room/abc123`
- **When**: Player 2 opens the share link
- **Then**: Player 2 joins the room and sees the waiting lobby with all current players

### AC-ROOM-005: Player can join room from room list
- **Given**: A public room "Test Room" exists in the public room list
- **When**: Player clicks "Join" on that room
- **Then**: Player joins the room and sees the waiting lobby

### AC-ROOM-006: Room shows correct player count
- **Given**: A room has maxPlayers=4 and 2 players have joined
- **When**: The room page loads
- **Then**: The room displays "Players (2/4)"

### AC-ROOM-007: Room host can start game with 2+ players
- **Given**: A room has 2 or more players and the host is viewing the room
- **When**: Host clicks "Start Game"
- **Then**: The game is created, all players are dealt 7 cards, and the game begins

### AC-ROOM-008: Start Game button disabled with fewer than 2 players
- **Given**: A room has only 1 player (the host)
- **When**: The host views the room page
- **Then**: The "Start Game" button is disabled with text "Need 2+ players"

### AC-ROOM-009: Non-host cannot start the game
- **Given**: A room has 2+ players but the current player is not the host
- **When**: The non-host clicks "Start Game"
- **Then**: The button does nothing or shows an error "Only the host can start the game"

### AC-ROOM-010: Player can leave a room
- **Given**: Player is in a room waiting for the game to start
- **When**: Player clicks "Leave Room"
- **Then**: The player is removed from the room and redirected to the lobby

### AC-ROOM-011: Room auto-deletes when last player leaves
- **Given**: A room has only 1 player remaining and that player leaves
- **When**: The last player leaves the room
- **Then**: The room is deleted from MongoDB

---

## 3. Core Gameplay

### AC-GAME-001: Game starts with 7 cards dealt to each player
- **Given**: A room has 2+ players and the host starts the game
- **When**: The game begins
- **Then**: Each player receives exactly 7 cards, and one card is placed face-up on the discard pile

### AC-GAME-002: First player to act is determined randomly
- **Given**: A game has just been created with multiple players
- **When**: The game starts
- **Then**: One player is selected as the first player (random), and their name is shown as the current turn

### AC-GAME-003: Player can play a card matching by color
- **Given**: It's Player 1's turn and the discard pile shows a Blue 5
- **When**: Player 1 plays a Blue 3 from their hand
- **Then**: The Blue 3 is moved to the discard pile, and turn passes to the next player

### AC-GAME-004: Player can play a card matching by number
- **Given**: It's Player 1's turn and the discard pile shows a Red 7
- **When**: Player 1 plays a Green 7 from their hand
- **Then**: The Green 7 is moved to the discard pile, and turn passes to the next player

### AC-GAME-005: Player can play a card matching by action type
- **Given**: It's Player 1's turn and the discard pile shows a Red Skip
- **When**: Player 1 plays a Blue Skip from their hand
- **Then**: The Blue Skip is moved to the discard pile, and turn passes to the next player (skipping someone)

### AC-GAME-006: Invalid card play is rejected
- **Given**: It's Player 1's turn and the discard pile shows a Red 5
- **When**: Player 1 tries to play a Green 3 (no match)
- **Then**: The move is rejected with error "Card does not match", card remains in hand, turn unchanged

### AC-GAME-007: Only current player can play cards
- **Given**: It's Player 1's turn (Player 2 is watching)
- **When**: Player 2 attempts to play a card
- **Then**: The move is rejected with error "Not your turn"

### AC-GAME-008: Player can draw a card when no playable cards
- **Given**: It's Player 1's turn and Player 1 has no cards matching the discard pile
- **When**: Player 1 clicks the draw deck
- **Then**: One card is drawn from the deck and added to Player 1's hand

### AC-GAME-009: Turn passes after drawing if drawn card is not playable
- **Given**: Player 1 has no playable cards and draws a card
- **When**: The drawn card does not match the discard pile top
- **Then**: Player 1's turn ends, and turn passes to the next player

### AC-GAME-010: Player can play drawn card if it matches
- **Given**: Player 1 has no playable cards and draws a card that matches
- **When**: Player 1 clicks the drawn card (which matches)
- **Then**: The drawn card is played to the discard pile, turn does NOT pass (same player continues)

### AC-GAME-011: Draw deck shows remaining card count
- **Given**: A game is in progress
- **When**: Players view the draw deck
- **Then**: The deck shows the number of remaining cards (e.g., "94 cards")

### AC-GAME-012: Playable cards are visually highlighted
- **Given**: It's Player 1's turn and the discard pile shows Red 5
- **When**: Player 1 views their hand
- **Then**: All Red cards and all number-5 cards are highlighted with a glowing border

### AC-GAME-013: Player can select and deselect a card
- **Given**: It's Player 1's turn and Player 1 has a playable card highlighted
- **When**: Player 1 clicks the highlighted card
- **Then**: The card is selected (visual: yellow border, slightly enlarged)

### AC-GAME-014: Player can deselect a selected card
- **Given**: Player 1 has a card selected (yellow border)
- **When**: Player 1 clicks the selected card again
- **Then**: The card is deselected, border returns to normal

### AC-GAME-015: Win detection when player empties their hand
- **Given**: Player 1 plays their second-to-last card, leaving them with 1 card
- **When**: Player 1 plays their last card
- **Then**: The game ends immediately, Player 1 is declared the winner, and the game over screen appears

---

## 4. Special Cards

### AC-SPECIAL-001: Skip card skips the next player's turn
- **Given**: It's Player 1's turn and Player 1 plays a Skip card
- **When**: The Skip effect is applied
- **Then**: The player after the current player in the turn order is skipped (turn passes to the player after that)

### AC-SPECIAL-002: Reverse card changes play direction
- **Given**: The game direction is clockwise and Player 1 plays a Reverse card
- **When**: The Reverse effect is applied
- **Then**: The direction changes to counter-clockwise, and turn passes to the next player in the new direction

### AC-SPECIAL-003: +2 card makes next player draw 2
- **Given**: Player 1 plays a +2 card (e.g., Blue +2)
- **When**: The +2 effect is applied
- **Then**: The next player draws 2 cards and loses their turn

### AC-SPECIAL-004: Stacked +2 (house rule) — not in MVP
- **Given**: A +2 is pending and a player plays another +2
- **When**: Players try to chain +2 cards
- **Then**: In MVP, stacking is NOT allowed — playing a +2 when +2 is pending still requires the draw

### AC-SPECIAL-005: Wild card allows player to choose any color
- **Given**: Player 1 plays a Wild card
- **When**: The Wild effect is applied
- **Then**: A color picker modal appears, Player 1 must choose Red/Yellow/Green/Blue, and that becomes the active color

### AC-SPECIAL-006: Color must be chosen before turn passes
- **Given**: Player 1 has played a Wild card and the color picker is shown
- **When**: The color picker is displayed
- **Then**: Player 1 must select a color before the turn passes; game is paused until color is chosen

### AC-SPECIAL-007: Wild +4 card allows player to choose color and forces draw
- **Given**: Player 1 plays a Wild +4 card
- **When**: The Wild +4 effect is applied
- **Then**: Player 1 chooses a color, the next player draws 4 cards and loses their turn

### AC-SPECIAL-008: +4 can only be played if player has no matching color
- **Given**: Player 1 has at least one card matching the current active color
- **When**: Player 1 tries to play a Wild +4
- **Then**: The move is rejected with error "Must play a matching color first" (house rule enforced by server)

### AC-SPECIAL-009: Reverse when only 2 players acts like Skip
- **Given**: There are exactly 2 players in the game and Player 1 plays a Reverse
- **When**: The Reverse effect is applied
- **Then**: Since there are only 2 players, the reverse acts like a Skip — the other player loses their turn

---

## 5. UNO Call

### AC-UNO-001: UNO button appears when hand size is 1
- **Given**: Player 1 has 2 cards in hand and plays one
- **When**: Player 1 is now down to 1 card
- **Then**: The UNO button becomes active with a pulsing animation

### AC-UNO-002: Player must click UNO button when at 1 card
- **Given**: Player 1 has exactly 1 card and it is their turn
- **When**: Player 1 plays their last card without clicking UNO first
- **Then**: The game shows a warning "Remember to call UNO!" and a 2-card penalty is added to their hand

### AC-UNO-003: Calling UNO is optional but recommended
- **Given**: Player 1 has 1 card and it is their turn
- **When**: Player 1 clicks the UNO button and then plays their card
- **Then**: No penalty is applied, and the card is played normally

### AC-UNO-004: Other players see UNO call notification
- **Given**: Player 1 has 1 card and clicks the UNO button
- **When**: Player 1's UNO call is registered
- **Then**: A notification "[Player 1] called UNO!" appears briefly for all players

---

## 6. Real-time Updates

### AC-REALTIME-001: Opponent's card play appears within 2 seconds
- **Given**: Player 1 and Player 2 are in an active game
- **When**: Player 1 plays a card
- **Then**: Player 2 sees the card appear on the discard pile within 2 seconds

### AC-REALTIME-002: Player sees update when joining a game already in progress
- **Given**: A game is in progress and Player 2 joins mid-game via link
- **When**: Player 2's page loads
- **Then**: Player 2 sees the current game state: all hands (their own only), discard pile, turn indicator

### AC-REALTIME-003: Game state preserved on reconnection
- **Given**: Player 1 loses connection for 10 seconds during an active game
- **When**: Player 1 reconnects and the page reloads
- **Then**: The current game state is displayed correctly, and Player 1 can continue playing

### AC-REALTIME-004: Disconnected player indicator shown
- **Given**: Player 1 loses connection (closes tab)
- **When**: the system detects the disconnection
- **Then**: Other players see an "offline" or "reconnecting" indicator next to Player 1's name

### AC-REALTIME-005: Reconnected player indicator disappears
- **Given**: Player 1 was disconnected and has now reconnected
- **When**: the reconnection is established
- **Then**: The "offline" indicator disappears, and Player 1 is shown as connected again

### AC-REALTIME-006: Turn timer visible to all players
- **Given**: A turn timer is enabled (optional rule, 30s per turn)
- **When**: a player is taking too long
- **Then**: All players see the timer counting down; when it reaches 0, the player automatically draws a card

---

## 7. Mobile Experience

### AC-MOBILE-001: Game is playable at 375px viewport width
- **Given**: Player opens the game on a mobile device (375px width)
- **When**: Player plays through the full game flow (create room, join, play, win)
- **Then**: No horizontal scrolling is required, all elements fit on screen

### AC-MOBILE-002: Touch targets are at least 44x44px
- **Given**: Player is on a mobile device at 375px width
- **When**: Player taps buttons or cards
- **Then**: All interactive elements are at least 44x44px in size

### AC-MOBILE-003: Cards scroll horizontally in hand
- **Given**: Player 1 has more than 7 cards in hand on mobile
- **When**: Player 1 views their hand
- **Then**: Cards are scrollable horizontally, and the current player's cards are clearly visible

### AC-MOBILE-004: Color picker modal is usable on mobile
- **Given**: Player plays a Wild card on mobile
- **When**: The color picker modal appears
- **Then**: The four color buttons are large enough (min 80px height) to tap easily

---

## 8. Error Handling

### AC-ERROR-001: Network error shows retry option
- **Given**: Player loses internet connection during a game
- **When**: An API call fails due to network error
- **Then**: A toast message "Connection lost. Reconnecting..." appears, and automatic reconnection begins

### AC-ERROR-002: Invalid room link shows appropriate message
- **Given**: Player opens a link to a non-existent room `/room/abc123nonexistent`
- **When**: the system tries to load the room
- **Then**: Message "Room not found or has been deleted" appears with a button to return to lobby

### AC-ERROR-003: Room full rejection
- **Given**: A room with maxPlayers=4 already has 4 players
- **When**: A fifth player tries to join via link
- **Then**: Message "Room is full" appears, and the player is redirected to the lobby

### AC-ERROR-004: Cannot join room that has already started
- **Given**: A room's game has already started (status=playing)
- **When**: a player tries to join that room
- **Then**: The player can only join as a spectator (read-only), not as a player

### AC-ERROR-005: Loading states display during async operations
- **Given**: Player clicks "Start Game"
- **When**: The request is in flight
- **Then**: A loading indicator is shown (button shows spinner or "Starting...")

### AC-ERROR-006: Invalid card index rejected
- **Given**: Player 1 tries to play a card with an invalid card index
- **When**: The play request is sent to the server
- **Then**: The server returns error "Invalid card index", card remains in hand

---

## 9. Data Persistence

### AC-PERSIST-001: Game state survives page refresh
- **Given**: A game is in progress
- **When**: Player refreshes the page
- **Without clearing localStorage**
- **Then**: The game state is restored exactly as it was before refresh (from MongoDB)

### AC-PERSIST-002: Match history records completed games
- **Given**: Player completes a game (someone wins)
- **When**: the game ends
- **Then**: The game record (gameId, players, winner, duration, timestamp) is stored in MongoDB

### AC-PERSIST-003: Empty rooms auto-delete after 7 days
- **Given**: A room with no players has been empty for 7 days
- **When**: the TTL check runs
- **Then**: The room document is automatically deleted from MongoDB

### AC-PERSIST-004: Finished games auto-delete after 90 days
- **Given**: A game has been finished (status=finished) for 90 days
- **When**: the TTL check runs
- **Then**: The game document is automatically deleted from MongoDB

---

## AC Summary

| AC ID | Feature | Priority | Tested |
|-------|---------|----------|--------|
| AC-ID-001 | Anonymous ID generation | Must Have | ❌ |
| AC-ID-002 | Player ID persists | Must Have | ❌ |
| AC-ID-003 | Default player name | Must Have | ❌ |
| AC-ID-004 | Editable display name | Should Have | ❌ |
| AC-ROOM-001 | Create public room | Must Have | ❌ |
| AC-ROOM-002 | Room name validation | Must Have | ❌ |
| AC-ROOM-003 | Private room hidden | Must Have | ❌ |
| AC-ROOM-004 | Join via share link | Must Have | ❌ |
| AC-ROOM-005 | Join from room list | Must Have | ❌ |
| AC-ROOM-006 | Player count display | Must Have | ❌ |
| AC-ROOM-007 | Host can start game | Must Have | ❌ |
| AC-ROOM-008 | Start disabled < 2 players | Must Have | ❌ |
| AC-ROOM-009 | Non-host cannot start | Must Have | ❌ |
| AC-ROOM-010 | Player can leave room | Must Have | ❌ |
| AC-ROOM-011 | Room auto-delete on empty | Should Have | ❌ |
| AC-GAME-001 | 7 cards dealt | Must Have | ❌ |
| AC-GAME-002 | First player random | Must Have | ❌ |
| AC-GAME-003 | Play matching color | Must Have | ❌ |
| AC-GAME-004 | Play matching number | Must Have | ❌ |
| AC-GAME-005 | Play matching action | Must Have | ❌ |
| AC-GAME-006 | Invalid play rejected | Must Have | ❌ |
| AC-GAME-007 | Only current player plays | Must Have | ❌ |
| AC-GAME-008 | Draw card | Must Have | ❌ |
| AC-GAME-009 | Turn passes after draw | Must Have | ❌ |
| AC-GAME-010 | Play drawn card | Must Have | ❌ |
| AC-GAME-011 | Deck count visible | Must Have | ❌ |
| AC-GAME-012 | Playable cards highlighted | Must Have | ❌ |
| AC-GAME-013 | Select card | Must Have | ❌ |
| AC-GAME-014 | Deselect card | Must Have | ❌ |
| AC-GAME-015 | Win detection | Must Have | ❌ |
| AC-SPECIAL-001 | Skip effect | Must Have | ❌ |
| AC-SPECIAL-002 | Reverse effect | Must Have | ❌ |
| AC-SPECIAL-003 | +2 effect | Must Have | ❌ |
| AC-SPECIAL-005 | Wild card color picker | Must Have | ❌ |
| AC-SPECIAL-007 | Wild +4 effect | Must Have | ❌ |
| AC-SPECIAL-008 | +4 requires no matching color | Must Have | ❌ |
| AC-SPECIAL-009 | Reverse with 2 players = Skip | Should Have | ❌ |
| AC-UNO-001 | UNO button at 1 card | Must Have | ❌ |
| AC-UNO-002 | Penalty for not calling UNO | Should Have | ❌ |
| AC-UNO-003 | No penalty if called | Must Have | ❌ |
| AC-UNO-004 | UNO notification to all | Should Have | ❌ |
| AC-REALTIME-001 | Opponent move < 2s | Must Have | ❌ |
| AC-REALTIME-002 | Join mid-game sees state | Must Have | ❌ |
| AC-REALTIME-003 | Reconnect restores state | Must Have | ❌ |
| AC-REALTIME-004 | Disconnect indicator | Should Have | ❌ |
| AC-REALTIME-005 | Reconnect indicator clears | Should Have | ❌ |
| AC-MOBILE-001 | 375px playable | Must Have | ❌ |
| AC-MOBILE-002 | 44px touch targets | Must Have | ❌ |
| AC-MOBILE-003 | Horizontal card scroll | Must Have | ❌ |
| AC-MOBILE-004 | Mobile color picker | Must Have | ❌ |
| AC-ERROR-001 | Network error retry | Must Have | ❌ |
| AC-ERROR-002 | Invalid room message | Must Have | ❌ |
| AC-ERROR-003 | Room full rejection | Must Have | ❌ |
| AC-ERROR-004 | Join mid-game as spectator | Should Have | ❌ |
| AC-ERROR-005 | Loading states | Must Have | ❌ |
| AC-ERROR-006 | Invalid card index | Must Have | ❌ |
| AC-PERSIST-001 | Game survives refresh | Must Have | ❌ |
| AC-PERSIST-002 | Match history record | Should Have | ❌ |
| AC-PERSIST-003 | Empty room TTL 7 days | Should Have | ❌ |
| AC-PERSIST-004 | Finished game TTL 90 days | Should Have | ❌ |

## Notes

- **Spectator mode**: Listed as nice-to-have, not fully covered in MVP ACs
- **Stacking +2**: Not implemented in MVP — house rule, simplifies implementation
- **Turn timer**: Optional feature; if implemented, should be configurable per room
- **Bot AI**: Post-MVP — disconnected players will simply be marked offline until they reconnect