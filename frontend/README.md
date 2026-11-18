# HR System Frontend

This directory contains the Next.js frontend for the HR System backend.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Browser session authentication

## Prerequisites

- Node.js 20 or newer
- npm
- The Spring Boot backend running on port `8080`

## Development

Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## API proxy

`next.config.ts` forwards all `/api/*` requests to:

```text
http://localhost:8080/api/*
```

This lets the frontend call `/api/...` while avoiding cross-origin issues during local development.

## Available commands

```powershell
npm run dev     # Start the Next.js development server
npm run build   # Type-check and create a production build
npm run start   # Run the production build
```

## Source layout

- `app/`: routes and page layouts
- `components/`: reusable navigation and chart components
- `lib/api.ts`: typed API client and domain types
- `lib/auth.tsx`: authentication context and route protection
- `app/globals.css`: shared application styles

For complete setup instructions, demo accounts, and backend documentation, see the [root README](../README.md).
