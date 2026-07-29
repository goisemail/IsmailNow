# HabitNow Web - Progressive Web App (PWA)

A responsive web version of HabitNow built with React, TypeScript, Bootstrap, and Vite. Works on desktop and mobile with offline-first capabilities and installable PWA support.

## ✨ Features

- **Dashboard** - Track habits and tasks for any date
- **Habit Management** - Create, edit, and track daily habits with colors and streaks
- **Task Management** - Add and track tasks with completion status
- **History & Analytics** - View statistics and top streaks
- **Settings** - Manage data and export backups
- **PWA Ready** - Installable on mobile home screen, offline support
- **Responsive** - Perfect on mobile, tablet, and desktop

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd web
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 📦 Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite 5
- **Styling**: Bootstrap 5
- **State**: Zustand (with localStorage persistence)
- **Routing**: React Router DOM
- **PWA**: vite-plugin-pwa
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
web/
├── src/
│   ├── components/          # Reusable components (Navigation, etc.)
│   ├── pages/              # Screen components (Dashboard, HabitEditor, etc.)
│   ├── store/              # Zustand stores (habits, tasks)
│   ├── theme/              # Design tokens (colors)
│   ├── utils/              # Utility functions (date helpers)
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── public/
│   └── manifest.json       # PWA manifest
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## 🔄 Comparison: React Native vs Web

| Aspect | React Native | React Web (PWA) |
|--------|---|---|
| **Codebase** | Separate iOS/Android | Single codebase |
| **Installation** | App Store/Play Store | Browser + installable |
| **Performance** | Native-like | Web-based |
| **Offline** | AsyncStorage | localStorage |
| **Updates** | Manual app updates | Auto-update on deployment |
| **Development** | Platform-specific | Universal |

## 🎯 Data Persistence

### LocalStorage Keys
- `ismailnow:v2:<account>:habits` - Account-scoped habits and metadata
- `ismailnow:v2:<account>:tasks` - Account-scoped tasks and completion status
- `ismailnow_user` - Non-sensitive profile only; OAuth access tokens stay in memory

### Data Structure

**Habit Object**
```typescript
{
  id: string
  name: string
  color: string
  progress: number (0-1)
  streak: number
  lastCompletedDate?: string (YYYY-MM-DD)
}
```

**Task Object**
```typescript
{
  id: string
  title: string
  startDate: string (YYYY-MM-DD)
  createdAt: string (ISO)
  completedDate?: string (YYYY-MM-DD)
}
```

## 📱 PWA Installation

### Desktop Chrome/Edge
1. Open the app in browser
2. Click the "Install" icon in the address bar
3. Click "Install"

### Mobile
1. Open in mobile browser (Chrome/Firefox/Safari)
2. Tap the share/menu icon
3. Select "Add to Home Screen" or "Install App"

### Offline Capabilities
- Service worker automatically caches app shell
- LocalStorage keeps habits and tasks available offline
- Task and habit changes sync automatically for Google users

### Google Drive Sync Safety

Local sync operations are serialized and Drive file versions are checked before writes. The versioned document includes tasks and habits, and recovery snapshots are retained before changed writes. The app verifies content after each upload and retries bounded conflicts. Google Drive does not always expose a browser-usable conditional-write ETag, so this direct single-file integration cannot guarantee atomic simultaneous writes from multiple devices. A transactional backend is required before advertising strict multi-device consistency.

## 🔧 Development Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run test          # Run Vitest regression tests
npm run type-check    # TypeScript check
```

## 📋 Migration from React Native

Key differences when migrating from the React Native version:

### State Management
- **React Native**: AsyncStorage
- **Web**: localStorage (same API, web-based)

### Navigation
- **React Native**: React Navigation (native stack)
- **Web**: React Router DOM (web routing)

### Styling
- **React Native**: StyleSheet + colors
- **Web**: CSS + Bootstrap utilities

### Components
- **React Native**: react-native built-ins
- **Web**: HTML + Bootstrap components

## 🚀 Deployment

### Vercel (Recommended for PWA)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy the dist/ folder
```

### GitHub Pages
```bash
npm run build
# Deploy dist/ folder as static site
```

## 📊 Future Enhancements

- [ ] SQLite for advanced queries (Phase 2)
- [ ] Local notifications/reminders
- [x] Google Drive recovery snapshots and restore
- [ ] i18n/localization
- [ ] Advanced analytics dashboard
- [ ] Dark mode toggle
- [ ] Data sync across devices
- [ ] Social sharing features

## 🐛 Troubleshooting

### App not persisting data
- Check browser's localStorage is enabled
- Verify storage quota isn't exceeded
- Try exporting and clearing data in Settings

### PWA not installing
- Must be served over HTTPS (except localhost)
- Check manifest.json is accessible
- Verify service worker registration

### Performance issues
- Clear browser cache and localStorage
- Run `npm run build` for production
- Check for large data sets in localStorage

## 📄 License

Same as parent IsmailNow project

## 🤝 Contributing

See main project README for contribution guidelines
