from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from .db.mongodb import get_client, get_db
from .routers import rooms, games, websocket

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    client = get_client()
    try:
        await client.admin.command('ping')
        print("MongoDB connected successfully")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
    yield
    # Shutdown
    client.close()

app = FastAPI(
    title="UNO Online API",
    version="1.0.0",
    description="Real-time multiplayer UNO card game API",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

@app.get("/api/health")
async def health_check():
    client = get_client()
    try:
        await client.admin.command('ping')
        mongodb_status = "connected"
    except Exception:
        mongodb_status = "disconnected"

    return {
        "status": "ok",
        "mongodb": mongodb_status,
        "timestamp": "2026-05-29T00:00:00Z"
    }

@app.get("/")
async def root():
    return {"message": "UNO Online API", "version": "1.0.0"}