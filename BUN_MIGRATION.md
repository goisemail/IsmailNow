# Migration to Bun Package Manager

This project has been migrated from **npm** to **bun** for faster dependency installation and better performance.

## What is Bun?

Bun is an all-in-one JavaScript runtime and package manager that is:
- **~10x faster** than npm for installation
- Better TypeScript support out-of-the-box
- Compatible with npm packages
- Produces smaller lockfiles

## Installation

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

For more installation options, see: https://bun.sh

### Install Dependencies

```bash
# Root dependencies
bun install

# App dependencies
cd app && bun install

# Web dependencies
cd web && bun install
```

## Command Reference

| Task | npm | bun |
|------|-----|-----|
| Install dependencies | `npm install` | `bun install` |
| Run script | `npm run <script>` | `bun run <script>` |
| Add package | `npm install pkg` | `bun add pkg` |
| Add dev package | `npm install --save-dev pkg` | `bun add --save-dev pkg` |
| Remove package | `npm uninstall pkg` | `bun remove pkg` |

## Lockfile

- **Old**: `package-lock.json` (npm)
- **New**: `bun.lockb` (binary lockfile)

The `bun.lockb` file is binary and optimized for faster performance. It should be committed to version control.

## Project Structure

This project has multiple workspaces:
- **`/`** - Root project
- **`/app`** - React Native mobile app
- **`/web`** - React web application

Each has its own `package.json` and dependencies managed by bun.

## Scripts

### App (React Native)
```bash
cd app
bun run android        # Run on Android
bun run ios           # Run on iOS
bun run start         # Start Metro bundler
bun run test          # Run tests
bun run lint          # Lint code
```

### Web (React + Vite)
```bash
cd web
bun run dev           # Development server
bun run build         # Production build
bun run preview       # Preview production build
bun run lint          # Lint code
```

## Benefits

✅ **Faster installations** - Bun is significantly faster than npm  
✅ **Better caching** - Improved dependency caching  
✅ **Smaller lockfiles** - Binary format reduces file size  
✅ **npm compatible** - All existing npm packages work with bun  
✅ **TypeScript ready** - Native TypeScript support  

## Troubleshooting

### Clearing cache and reinstalling

If you encounter any issues, try clearing bun's cache:

```bash
bun install --force
```

### Falling back to npm

If needed, you can still use npm:

```bash
npm install
```

However, make sure to delete `bun.lockb` files to avoid conflicts.

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Package Manager](https://bun.sh/docs/cli/install)
- [Migration Guide](https://bun.sh/guides/migration/npm)
