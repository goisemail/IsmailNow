# IsmailNow - Task & Habit Management PWA

IsmailNow is a Progressive Web App (PWA) for managing tasks and habits with cloud synchronization support via Google Drive.

## Features

- **Task Management**: Create, edit, and delete tasks with status tracking
- **Habit Tracking**: Track daily habits with completion status
- **Cloud Sync**: Seamlessly sync data to Google Drive
- **Offline Support**: Full functionality works offline with sync on reconnect
- **Google Authentication**: Secure login via Google OAuth
- **Guest Mode**: Use locally without authentication
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **PWA**: Installable as a standalone app on supported devices

## Tech Stack

- **Frontend**: React 18.2 + TypeScript 5.2
- **Build Tool**: Vite 8
- **Styling**: Bootstrap 5 + custom CSS
- **UI Components**: Lucide React icons
- **State Management**: Zustand 5
- **Routing**: React Router v6
- **Calendar**: React Big Calendar
- **Date Handling**: date-fns 2
- **PWA**: vite-plugin-pwa

## Project Structure

```
.
├── web/                          # Main web application
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── components/          # Reusable React components
│   │   ├── contexts/            # React contexts (Auth, etc.)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components
│   │   ├── store/               # Zustand stores
│   │   ├── utils/               # Utility functions
│   │   ├── theme/               # Theme configuration
│   │   └── lib/                 # Helper libraries
│   ├── dist/                    # Build output
│   └── package.json
├── docs/                        # Documentation
├── vercel.json                  # Vercel deployment config
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or bun package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/goisemail/IsmailNow.git
cd IsmailNow
```

2. Install dependencies:
```bash
cd web
npm install
# or use bun
bun install
```

3. Start the development server:
```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:5173`

## Building

To build the project for production:

```bash
npm run build
# or
bun run build
```

Output files will be in `web/dist/`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks
- `npm run type-check` - Run TypeScript type checking

## Architecture Overview

### Authentication
- Supports Google OAuth for cloud sync
- Guest mode for local-only usage
- Auth state managed via React Context

### Data Storage & Sync
- **Local Storage**: IndexedDB for offline data
- **Cloud Storage**: Google Drive JSON file
- **Sync Strategy**: 
  - Periodic auto-sync when online
  - Manual sync via "Sync to Cloud" button in sidebar
  - Merges local and remote data on sync

### State Management
- Tasks and habits stored in Zustand stores
- Real-time updates with React hooks
- Persistent storage with Drive sync

## Pages & Features

- **Login**: Google OAuth and Guest mode authentication
- **Dashboard**: Daily overview with week navigation
- **Tasks**: View and manage all tasks
- **Habits**: Track daily habits
- **Planner**: Plan and organize activities
- **History**: View past activity
- **Settings**: App configuration and preferences

## Deployment

The app is deployed on Vercel with the following configuration:
- Build command: `cd web && npm install && npm run build`
- Output directory: `web/dist`
- Framework preset: Vite
- SPA rewrites configured for React Router

See `vercel.json` for deployment configuration details.

## Contributing

1. Create a feature branch from main
2. Make your changes
3. Test locally with `npm run dev`
4. Commit and push your branch
5. Create a pull request

## Development Workflow

### Making Changes
1. Edit components in `web/src/`
2. Test in development: `npm run dev`
3. Ensure no TypeScript errors: `npm run type-check`
4. Check linting: `npm run lint`
5. Build for production: `npm run build`

### Common Tasks
- **Adding a new page**: Create component in `web/src/pages/` and add route in `App.tsx`
- **Adding a new feature**: Consider if it needs store changes, component changes, and/or auth changes
- **Syncing changes**: Ensure changes to task/habit models are reflected in Drive sync logic

## Known Issues & Notes

- See docs directory for platform-specific guides and troubleshooting
- Review `BUN_MIGRATION.md` for bun package manager migration notes

## License

See repository for license details.

## Support

For issues and feature requests, please open an issue on GitHub.
