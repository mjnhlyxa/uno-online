#!/bin/bash
# Uno Online - Local Development Setup

## Prerequisites
# - Bun installed: https://bun.sh/
# - MongoDB running locally or MongoDB Atlas connection string

## Quick Start

### 1. Install dependencies
bun install

### 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and add your MONGODB_URI

cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local if needed

### 3. Start MongoDB (if local)
# mongod --dbpath /path/to/data

### 4. Start the backend API
bun run dev:api

### 5. In a new terminal, start the frontend
bun run dev

## Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

## Tech Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: FastAPI (Python 3.11+), Motor (async MongoDB)
- Database: MongoDB
- Real-time: WebSocket (FastAPI native)
- Package Manager: Bun