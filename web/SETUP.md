# Getting Started with HabitNow Web

This guide walks you through setting up and running the web version locally.

## Prerequisites

Ensure you have the following installed:
- **Node.js** 18 or higher ([download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)

Verify installation:
```bash
node --version
npm --version
```

## Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

This installs all required packages including:
- React & React Router
- Bootstrap 5
- Zustand for state management
- Vite for bundling
- TypeScript tooling

## Running Locally

Start the development server:
```bash
npm run dev
```

You should see output like:
```
VITE v5.0.7 ready in 234 ms

➜ Local:   http://localhost:5173/
➜ press h + enter to show help
```

Open **http://localhost:5173** in your browser.

### Features to Test

- **Dashboard** - View today's habits and tasks
- **Date Navigation** - Scroll dates or click chips
- **Add Task** - Create new tasks for any date
- **Log Habit** - Click "Log" button to complete habits
- **Bottom Navigation** - Navigate between screens
- **Settings** - View data management options

## Building for Production

Create an optimized build:
```bash
npm run build
```

This generates a `dist/` folder with minified, optimized files.

Preview the production build locally:
```bash
npm run preview
```

Then visit **http://localhost:4173** to test the production build.

## Deployment Options

### Option 1: Vercel (Recommended for PWA)

Vercel is ideal for PWAs and provides:
- ✅ Automatic deployments from Git
- ✅ HTTPS by default (required for PWA)
- ✅ Edge caching
- ✅ Free tier available

**Steps:**
1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel`
3. Follow prompts
4. Get live URL

### Option 2: Netlify

Netlify also has great PWA support:

**Steps:**
1. Build: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag and drop the `dist/` folder
4. Or connect your Git repo for auto-deploy

### Option 3: GitHub Pages

Deploy for free to GitHub Pages:

1. Update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/habbitnow/', // your repo name
  // ...
})
```

2. Build and deploy:
```bash
npm run build
npm install -g gh-pages
npx gh-pages -d dist
```

## Type Checking

Before deploying, verify TypeScript:
```bash
npm run type-check
```

Fix any type errors before deployment.

## Lint Code

Check code quality:
```bash
npm run lint
```

## PWA Testing

### Install PWA Locally

1. With dev server running (`npm run dev`):
   - Chrome: Look for install icon in address bar
   - Mobile: Tap share → "Add to Home Screen"

2. Or with production build:
   - Run `npm run preview`
   - Same install process as above

### Offline Testing

1. Open DevTools (F12)
2. Go to **Application** tab
3. Select **Service Workers**
4. Check "Offline" checkbox
5. App should still work offline

## Environment Variables

Create `.env` file for configuration (optional):
```
VITE_API_URL=http://localhost:3000
```

Reference in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Troubleshooting

### Port 5173 Already in Use
```bash
npm run dev -- --port 3001
```

### Module Not Found Error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Fails
```bash
npm run type-check  # Check TypeScript errors
npm run lint        # Check ESLint errors
```

### Service Worker Not Updating
- Clear browser cache: DevTools → Application → Cache Storage → Clear All
- Restart dev server

## Next Steps

- ✅ Run locally
- ✅ Test features
- ✅ Deploy to Vercel/Netlify
- ✅ Share PWA URL
- ✅ Install on mobile home screen

## Additional Resources

- [React Documentation](https://react.dev)
- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.0/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [React Router Docs](https://reactrouter.com/)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

For issues:
1. Check browser DevTools Console for errors
2. Verify Node.js version: `node --version`
3. Try clearing cache: `npm cache clean --force`
4. Reinstall: `rm -rf node_modules && npm install`

Happy tracking! 🎯
