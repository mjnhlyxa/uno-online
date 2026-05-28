# uno-online — Technology Stack

> **C4 Level**: 2 — Technology Choices
> **Status**: Draft | Created: 2026-05-29

## 1. Monorepo Structure

### 1.1 Workspace Manager: Bun
**Why Bun?** Faster than npm/yarn/pnpm for installs, built-in workspace support, native TypeScript execution.

```json
// package.json (root)
{
  "name": "uno-online",
  "workspaces": [
    "apps/web",
    "apps/api"
  ],
  "scripts": {
    "dev": "bun --cwd apps/web dev",
    "dev:api": "bun --cwd apps/api run dev",
    "build": "bun run build --filter './apps/*'",
    "test": "bun test"
  }
}
```

### 1.2 Project Structure
```
uno-online/
├── apps/
│   ├── web/                    # Next.js 14 (frontend)
│   │   ├── src/
│   │   │   ├── app/           # App Router
│   │   │   ├── components/     # React components
│   │   │   ├── lib/           # Utilities, engine
│   │   │   └── types/         # TypeScript types
│   │   ├── public/            # Static assets
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── tsconfig.json
│   └── api/                   # FastAPI (backend)
│       ├── src/
│       │   ├── main.py        # App entry point
│       │   ├── routers/       # API route modules
│       │   ├── models/        # Pydantic models
│       │   ├── db/            # Database connection
│       │   └── game_logic/    # UNO engine
│       ├── tests/             # pytest tests
│       ├── requirements.txt
│       └── pyproject.toml
├── package.json               # Bun workspace root
└── bun.lockb                  # Lockfile
```

## 2. Frontend Stack (apps/web)

### 2.1 Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14+ | React framework, App Router, SSR |
| `react` | 18+ | UI library |
| `react-dom` | 18+ | DOM rendering |
| `typescript` | 5+ | Type safety, strict mode |
| `tailwindcss` | 3+ | Utility-first CSS, mobile-first |
| `@tanstack/react-query` | 5+ | Server state, caching, polling |
| `swr` | 2+ | Alternative to React Query (lighter) |
| `clsx` | 2+ | Conditional classname utility |
| `framer-motion` | 11+ | Animations (cards, modals, transitions) |
| `uuid` | 9+ | Anonymous player ID generation |
| `zustand` | 4+ | Light client-side state (UI modals, toasts) |

### 2.2 Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 8+ | Linting |
| `@typescript-eslint/eslint-plugin` | 7+ | TypeScript ESLint rules |
| `prettier` | 3+ | Code formatting |
| `autoprefixer` | 10+ | CSS vendor prefixes |
| `postcss` | 8+ | CSS processing |

### 2.3 Next.js Configuration
```javascript
// apps/web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  // Enable experimental features if needed
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 2.4 Tailwind Configuration
```javascript
// apps/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'uno-red': '#E41E26',
        'uno-yellow': '#F9E000',
        'uno-green': '#00A84F',
        'uno-blue': '#0072CE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## 3. Backend Stack (apps/api)

### 3.1 Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.109+ | Web framework, async-first |
| `uvicorn` | 0.27+ | ASGI server (production) |
| `motor` | 3.3+ | Async MongoDB driver |
| `pydantic` | 2+ | Data validation, settings |
| `python-dotenv` | 1+ | Environment variable loading |
| `python-jose` | 3.3+ | JWT handling (if needed for future auth) |
| `websockets` | 12+ | WebSocket server (FastAPI native) |
| `secrets` | (stdlib) | Crypto-random deck shuffling |

### 3.2 Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `pytest` | 8+ | Unit testing |
| `pytest-asyncio` | 0.23+ | Async test support |
| `httpx` | 0.27+ | Async HTTP client for tests |
| `mypy` | 1.8+ | Static type checking |

### 3.3 FastAPI App Structure
```python
# apps/api/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db.mongodb import db_client
from .routers import rooms, games, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    db_client.close()

app = FastAPI(
    title="UNO Online API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://uno-online.vercel.app", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
```

### 3.4 MongoDB Connection
```python
# apps/api/src/db/mongodb.py
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            "mongodb://10.60.184.61:27017",
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
    return _client

def get_db():
    return get_client()["uno_online"]
```

## 4. Shared Types

### 4.1 Cross-Stack Type Consistency
Both frontend and backend should agree on shared types:

```typescript
// apps/web/src/lib/engine/types.ts (and mirrored in Python)
export type Color = 'red' | 'yellow' | 'green' | 'blue';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export interface Card {
  color: Color | null;
  type: CardType;
  value: number | null;  // 0-9 for number cards
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  connected: boolean;
}

export type Direction = 1 | -1;  // 1 = clockwise, -1 = counter-clockwise

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface GameState {
  id: string;
  roomId: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentTurnIndex: number;
  direction: Direction;
  activeColor: Color;
  status: GameStatus;
  pendingDrawCount: number;
  winner: { playerIndex: number; reason: string } | null;
}
```

## 5. Environment Variables

### 5.1 apps/web (.env.local)
```bash
# Public variables (exposed to client)
NEXT_PUBLIC_API_URL=https://uno-api.vercel.app
NEXT_PUBLIC_WS_URL=wss://uno-api.vercel.app

# Server-only variables
MONGODB_URI=mongodb://10.60.184.61:27017
```

### 5.2 apps/api (.env)
```bash
# MongoDB
MONGODB_URI=mongodb://10.60.184.61:27017
MONGODB_DB=uno_online

# CORS
CORS_ORIGINS=https://uno-online.vercel.app,http://localhost:3000

# Server
HOST=0.0.0.0
PORT=8000
```

## 6. Code Quality Tools

### 6.1 ESLint (Frontend)
```json
// apps/web/.eslintrc.json
{
  "extends": ["next/core-web-vitals", "typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### 6.2 MyPy (Backend)
```toml
# apps/api/mypy.ini
[mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

## 7. Testing Strategy

### 7.1 Frontend Testing
- **Unit tests**: Game engine (Jest/Vitest)
- **Component tests**: React Testing Library
- **E2E tests**: Playwright (game-test skill)

### 7.2 Backend Testing
- **Unit tests**: pytest on game logic functions
- **Integration tests**: FastAPI TestClient against in-memory DB
- **API tests**: httpx against running server