# Overview

This is a real-time messaging application built with React, TypeScript, Express, and PostgreSQL. The application provides a WhatsApp-like interface with features including one-on-one and group chats, message reactions, read receipts, story sharing, and real-time communication via WebSockets. The frontend uses modern React with ShadCN UI components and TanStack Query for state management, while the backend is built with Express.js and Drizzle ORM for database interactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript in strict mode
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: ShadCN UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server using 'ws' library for instant messaging
- **API Design**: RESTful endpoints for CRUD operations with WebSocket events for real-time features
- **Middleware**: Custom logging middleware for API request monitoring

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Relational tables for users, chats, messages, stories, reactions, and read receipts
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment
- **Migrations**: Drizzle Kit for database schema management and migrations

## Authentication & Session Management
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **User Management**: Basic user system with profile pictures and online status tracking
- **Security**: Express session handling with secure cookie configuration

## Real-time Features
- **WebSocket Connection**: Persistent connections for instant message delivery
- **Typing Indicators**: Real-time typing status broadcasting to chat participants
- **Online Status**: Live user presence tracking and status updates
- **Message Delivery**: Instant message synchronization across all connected clients

## Component Architecture
- **Modular Design**: Separated concerns with dedicated components for chat sidebar, message area, and user interface
- **Responsive Layout**: Mobile-first design with adaptive layouts for different screen sizes
- **Story System**: Instagram-like story viewing with auto-expiry and viewer tracking
- **Message Reactions**: Emoji reaction system with real-time updates

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form with Zod validation
- **TypeScript**: Full TypeScript support with strict type checking
- **Vite**: Development server and build tool with hot module replacement

## UI and Styling
- **Radix UI**: Comprehensive primitive component library for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Modern icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variant management

## Backend Infrastructure
- **Express.js**: Web application framework with middleware support
- **WebSocket (ws)**: Real-time bidirectional communication library
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **Zod**: Runtime type validation and schema definition

## Database and Storage
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **Drizzle Kit**: Database migration and schema management tools

## Development and Build Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **TSX**: TypeScript execution environment for development
- **Replit Integration**: Development environment optimization and error handling