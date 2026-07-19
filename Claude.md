# Claude.md - Architecture Guide for AI Agents

This file provides essential information for AI agents (like Claude) working on the IsmailNow codebase.

## Project Overview

**IsmailNow** is a Progressive Web App (PWA) for managing tasks and habits with cloud synchronization to Google Drive. The tech stack is React 18 + TypeScript + Vite.

## Key Architecture Patterns

### 1. Authentication (React Context)
**Location**: `web/src/contexts/AuthContext.tsx`

- Supports two auth modes:
  - **Google OAuth**: Full cloud sync via Google Drive
  - **Guest Mode**: Local-only, no cloud sync
- Manages `user` state and provides `signOut()` function
- All pages require auth via `RequireAuth` wrapper in `App.tsx`

**Usage in Components**:
```tsx
const { user, signOut } = useAuth()
```

### 2. State Management (Zustand Stores)
**Location**: `web/src/store/`

Two main stores exist:
- **Tasks Store** (`tasks.ts`):
  - Methods: `add()`, `update()`, `delete()`, `load()`, `syncWithDrive()`
  - Task visibility rule: `task.startDate <= date AND (!task.completedDate OR task.completedDate >= date)`
  - Completed tasks stay visible on completion day, then hide on later days
  
- **Habits Store** (`habits.ts`):
  - Similar methods for habit management
  - Tracks completion status

**Pattern**: Use Zustand hooks for accessing store:
```tsx
const { tasks, add, update } = useTasksStore()
```

### 3. Drive Synchronization
**Location**: `web/src/hooks/useDriveSync.ts`

- **Auto-sync**: Periodic syncing when app is online
- **Manual sync**: "Sync to Cloud" button in sidebar (Sidebar.tsx)
- **Strategy**: Merges local + remote data, writes merged set back to single Drive JSON file
- **Persistence**: Also flushes to Drive on page visibility change

**Key Pattern**:
- Local changes queue up automatically
- On sync: read remote file → merge with local → write back
- Handles conflicts by keeping latest changes

### 4. Routing
**Location**: `web/src/App.tsx`

Routes are defined in main App component:
- `/login` - Login/Guest mode selection
- `/dashboard` - Main dashboard with day/week view
- `/tasks` - Task management
- `/habits` - Habit tracking
- `/planner` - Planning interface
- `/history` - Historical data
- `/settings` - User settings

All routes except `/login` are protected by `RequireAuth`.

### 5. Component Organization

```
web/src/
├── components/          # Reusable UI components
│   ├── Navigation.tsx   # Top navigation bar
│   ├── Sidebar.tsx      # Sidebar with sync button
│   ├── TaskWizard.tsx   # Task creation wizard
│   ├── QuickAddSheet.tsx # Quick add modal
│   └── ...
├── pages/               # Full page components (tied to routes)
│   ├── Dashboard.tsx
│   ├── Tasks.tsx
│   ├── Habits.tsx
│   ├── Planner.tsx
│   ├── Settings.tsx
│   ├── Login.tsx
│   └── ...
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── store/               # Zustand stores
├── utils/               # Utility functions
└── theme/               # Theme configuration
```

## Common Development Tasks

### Adding a New Feature
1. **Determine if it needs store state**: Add to relevant Zustand store
2. **Create component**: Add to `components/` or `pages/` as appropriate
3. **Add routing**: If it's a page, add route in `App.tsx`
4. **Handle auth**: Use `RequireAuth` wrapper if needed
5. **Sync with Drive**: Update Drive sync logic if storing new data

### Adding a New Page
1. Create component in `web/src/pages/`
2. Add import in `App.tsx`
3. Add route in Routes element
4. Wrap with `RequireAuth` if not public
5. Add navigation link if needed

### Modifying Task/Habit Models
1. Update store in `web/src/store/`
2. Update Drive sync logic in `web/src/hooks/useDriveSync.ts`
3. Update any related components that display this data
4. Test sync: create item locally, sync, reload to verify persistence

### Fixing Deployment Issues
- Check `vercel.json` for build/output configuration
- Verify `web/dist/` is output directory
- Ensure build command installs and builds correctly
- Test build locally: `npm run build`
- Check that SPA rewrites are configured (needed for React Router)

## Important Files & Their Purpose

| File | Purpose |
|------|---------|
| `web/src/App.tsx` | Main app shell, routing, protected routes |
| `web/src/contexts/AuthContext.tsx` | Authentication state & login logic |
| `web/src/store/tasks.ts` | Task store with sync logic |
| `web/src/hooks/useDriveSync.ts` | Google Drive sync orchestration |
| `web/src/components/Sidebar.tsx` | Sidebar with manual sync button |
| `vercel.json` | Deployment configuration |
| `web/package.json` | Dependencies and build scripts |

## Key External Dependencies

- **React Router**: Page navigation (`useNavigate()`, `useLocation()`)
- **Zustand**: State management (store hooks)
- **date-fns**: Date utilities
- **Bootstrap**: CSS framework
- **Lucide React**: Icon library
- **vite-plugin-pwa**: PWA functionality

## Testing & Validation

- **Type checking**: `npm run type-check` (verify no TS errors)
- **Linting**: `npm run lint` (code quality)
- **Development**: `npm run dev` (test locally)
- **Production build**: `npm run build` (verify production build works)

## Debugging Tips

1. **Auth issues**: Check `AuthContext.tsx` and browser DevTools Application tab
2. **Sync issues**: Check `useDriveSync.ts` and browser Network tab
3. **State issues**: Use Zustand devtools or React DevTools
4. **Build issues**: Check `vercel.json` and run `npm run build` locally
5. **Routing issues**: Verify routes in `App.tsx` and check React Router setup

## Code Style & Conventions

- **TypeScript**: Use strict mode, add types to all functions
- **Components**: Functional components with hooks
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Files**: Named after their main export (e.g., `TaskWizard.tsx` for TaskWizard component)
- **Imports**: Group by: external packages, then relative imports

## Build & Deployment

**Local Build**:
```bash
cd web
npm install
npm run build
```

**Vercel Deployment**:
- Automatic on push to main branch
- Uses configuration in `vercel.json`
- Output: `web/dist/`
- Framework: Vite with SPA rewrites

**Environment Setup**:
- Development: `npm run dev` on port 5173
- Production: `npm run build` creates optimized bundle

## Troubleshooting Checklist

- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Builds successfully: `npm run build`
- [ ] Starts in dev mode: `npm run dev`
- [ ] Can create/edit/delete tasks
- [ ] Sync button works (when authenticated)
- [ ] Can toggle between offline/online
- [ ] No console errors in DevTools

## When Making Changes

Always ensure:
1. Changes maintain TypeScript compatibility
2. No breaking changes to store interfaces
3. Auth context remains consistent
4. Drive sync logic still works correctly
5. Routes and protected pages remain secure
6. Build still succeeds locally

## Quick Reference

**To understand what a file does**: Check its exports and the hooks/components that use it.

**To find where something is used**: Search for the component/function name across `web/src/`.

**To understand data flow**: Follow the Zustand store → component hook → render → user interaction → store update cycle.

**To add new functionality**: Start with the store, then build components that use it, then wire to UI/routes.
