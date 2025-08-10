# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development & Building
- `npm run dev` - Start development server (runs on localhost:3000)
- `npm run build` - Build the Next.js application for production (with linting and type checking)
- `npm run build:fast` - Fast production build (skips linting and type checking)
- `npm run build:parallel` - Run type checking, linting, and building in parallel
- `npm run build:prod` - Sequential production build (typecheck → lint → build)
- `npm start` - Start production server

### Testing & Quality
- `npm test` - Run Jest tests in verbose mode
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:oauth` - Run OAuth/auth specific tests
- `npm run lint` - Run Next.js linting
- `npm run typecheck` - Run TypeScript type checking

### Database & Scripts
- `npm run cleanup:userauth` - Clean up orphaned user authentication records
- `npm run compile_jobs` - Compile TypeScript job files for email digest functionality

## Project Architecture

### Multi-Game Platform Structure
This is a multi-game puzzle platform supporting currently two games:
- **Thinky** (main platform) - Game aggregator and social features
- **Pathology** - Shortest path puzzle game 
- **Sokopath** - Sokoban-style box pushing puzzle game

Games are configured in `constants/Games.ts` with game-specific settings, themes, and validation logic.

### Key Architectural Patterns

#### Next.js Structure
- **Pages**: Next.js pages router with dynamic routing (`[subdomain]` for multi-game support)
- **API Routes**: Comprehensive REST API in `/pages/api/` covering game mechanics, user management, and social features
- **Components**: Organized by feature area (game UI, admin, social, etc.)

#### Database Layer (MongoDB + Mongoose)
- **Models**: Type definitions in `/models/db/` and schemas in `/models/schemas/`
- **Key Entities**: User, Level, Record, Review, Achievement, MultiplayerMatch, Collection
- Connection handling in `lib/dbConnect.ts`

#### Game Engine Architecture
- **Game State**: Core game logic in `helpers/gameStateHelpers.ts`
- **Validation**: Game-specific validators in `helpers/validators/`
- **Controls**: Keyboard/touch controls in hooks (`useGameControls.ts`, `useTouchControls.ts`)
- **Rendering**: Game grid rendering in `components/level/` with WebGL support

#### Authentication & Authorization
- **Multi-provider OAuth**: Google, Discord via Passport.js
- **JWT Tokens**: Token management in `lib/` directory
- **User Types**: Guest users, full accounts, Pro subscriptions
- **Permissions**: Role-based access (admin, curator, etc.)

#### Real-time Features
- **Socket.io**: Multiplayer and live features in `server/socket/`
- **Notifications**: Real-time notifications system
- **Multiplayer**: Head-to-head matches with live gameplay

### Development Environment Setup

#### Local Development
Requires `.env` file with:
```
JWT_SECRET=anything
LOCAL=true
NEW_RELIC_APP_NAME=dummy  
NEW_RELIC_LICENSE_KEY=dummy
REVALIDATE_SECRET=whatever
```

### Testing Strategy
- **Jest Configuration**: Custom setup in `jest.config.ts` with MongoDB memory server
- **Coverage**: Excludes UI components, focuses on business logic
- **Test Types**: Unit tests for helpers, API endpoint tests, page component tests
- **Test Database**: Isolated test environment with in-memory MongoDB

### Key Directories
- `/components/` - React components organized by feature
- `/pages/` - Next.js pages and API routes  
- `/models/` - Database models and schemas
- `/helpers/` - Business logic and utility functions
- `/hooks/` - React hooks for state management
- `/constants/` - Game configurations and enums
- `/lib/` - Core utilities (auth, database, external services)
- `/server/` - Socket.io server and background scripts

### Performance & Monitoring
- **New Relic**: Application monitoring and error tracking
- **PostHog**: Analytics and feature flags
- **SWR**: Client-side caching for API calls
- **Sharp**: Image optimization
- **WebGL**: Optional high-performance game rendering


### MCPs available
- Playwright for browser based testing and being able to visually see changes
- Context7 for getting up to date documentation
