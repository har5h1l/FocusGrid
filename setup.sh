#!/bin/bash

echo "🚀 Setting up FocusGrid development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create client environment file if it doesn't exist
if [ ! -f "./client/.env" ]; then
  echo "🔧 Creating client .env file..."
  cp ./client/.env.example ./client/.env
  echo "✅ Created client .env file. You may need to update the values."
fi

# Create server environment file if it doesn't exist
if [ ! -f "./server/.env" ]; then
  echo "🔧 Creating server .env file..."
  cp ./server/.env.example ./server/.env
  
  # Generate a random AUTH_SECRET
  AUTH_SECRET=$(openssl rand -hex 32)
  # Replace the placeholder in the .env file
  sed -i '' "s/your_auth_secret_here/$AUTH_SECRET/g" ./server/.env 2>/dev/null || sed -i "s/your_auth_secret_here/$AUTH_SECRET/g" ./server/.env
  
  echo "✅ Created server .env file with a secure random AUTH_SECRET."
fi

# Build shared package
echo "🔨 Building shared package..."
npm run build:shared

# Setup the database
echo "🗄️ Setting up the database..."
npm run db:migrate

echo "✨ Setup complete! You can now start the development server with:"
echo "  npm run dev"
echo ""
echo "📝 Don't forget to update your .env files with your own API keys before starting development."
echo ""
echo "🌐 The client will be available at: http://localhost:5173"
echo "🖥️ The server will be available at: http://localhost:3000"
echo ""
echo "📚 View database contents with: npm run db:studio" 