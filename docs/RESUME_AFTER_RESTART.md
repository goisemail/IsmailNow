# Resume Guide After OS/Xcode Restart

Date: 2026-05-01
Project: IsmailNow (`/Users/goisemail/base/habbitNow/habbitNow/IsmailNow`)

## Current status before restart

- React Native app scaffold created in `app/` (Android + iOS folders present).
- App shell created with navigation/screens/theme.
- Lint and tests are passing in `app/`.
- Ruby toolchain was fixed:
  - `rbenv` installed
  - Ruby `3.2.4` installed and set locally in `app/`
  - `bundle install` succeeds in `app/`
- iOS CocoaPods install is blocked only because full Xcode is not installed/selected.

## Why it failed

`bundle exec pod install` failed with:
- `xcodebuild requires Xcode`, and
- current developer path is `CommandLineTools`, not full Xcode app.

Also, `/Applications/Xcode.app/Contents/Developer` was invalid, confirming Xcode app is not present there yet.

## After restart: exact steps

Run these commands in order:

```bash
# 1) Verify Xcode path
ls /Applications | rg -i xcode

# 2) Select the correct Xcode app path (adjust name if needed, e.g. Xcode-beta.app)
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 3) Accept Xcode license
sudo xcodebuild -license accept

# 4) Verify toolchain
xcode-select -p
xcodebuild -version
```

Then continue project setup:

```bash
cd /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/app
export RBENV_ROOT="$HOME/.rbenv"
eval "$(rbenv init - zsh)"
ruby -v
bundle install

cd /Users/goisemail/base/habbitNow/habbitNow/IsmailNow/app/ios
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
bundle exec pod install
```

## If Xcode app has a different name

Example:

```bash
sudo xcode-select -s /Applications/Xcode-beta.app/Contents/Developer
```

## Where to resume coding

After pods install successfully, continue feature work from:
- `app/src/navigation/AppNavigator.tsx`
- `app/src/screens/Screens.tsx`
- `app/DECISIONS.md`

