#!/bin/bash
# Script for running the app in Replit development environment

# Kill any existing processes on port 5173 to avoid conflicts
pkill -f "node.*vite" || true

echo "🔄 Installing dependencies..."
npm install

echo "🚀 Starting Replit development server..."
npm run dev:replit 