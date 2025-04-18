# FocusGrid - AI-Powered Study Planning App

A minimalist study planning application that helps students create and optimize their study schedules using AI. Built with React, TypeScript, and integrated with OpenRouter AI for intelligent study plan optimization.

## Features

- Create personalized study plans
- AI-powered study plan optimization using OpenRouter
- Local storage for saving study plans
- Clean, modern UI using Radix UI components
- Responsive design with Tailwind CSS

## Prerequisites

- Node.js (v20.0.0 or higher)
- npm (v7 or higher)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/focus-grid.git
   cd focus-grid
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
focus-grid/
├── client/
│   └── src/
│       ├── components/    # React components
│       ├── lib/          # Utility functions and API integrations
│       ├── pages/        # Page components
│       └── types/        # TypeScript type definitions
├── public/              # Static assets
└── ...config files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenRouter AI API
- React Hook Form
- Zod for validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 