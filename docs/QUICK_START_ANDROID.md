# Quick Start: Android Setup on Mac

## 🚀 Quick Checklist

Follow these steps in order:

### Step 1: Install Android Studio (15-20 min)
- [ ] Download from: https://developer.android.com/studio
- [ ] Install the `.dmg` file
- [ ] Launch Android Studio
- [ ] Complete first-time setup wizard (Standard installation)

### Step 2: Install SDK Components (10-15 min)
- [ ] Open **Tools** > **SDK Manager**
- [ ] **SDK Platforms** tab: Install API 35, 34, 33, 31, 23
- [ ] **SDK Tools** tab: Ensure these are checked:
  - Android SDK Build-Tools
  - Android SDK Platform-Tools
  - Android Emulator
  - Android SDK Command-line Tools
- [ ] Click **Apply** and wait for installation

### Step 3: Set Environment Variables (2 min)
Open Terminal and run:
```bash
# Check your shell
echo $SHELL

# Edit your shell config (use .zshrc for zsh, .bash_profile for bash)
nano ~/.zshrc
# OR
nano ~/.bash_profile
```

Add these lines:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Save (Ctrl+X, Y, Enter) and reload:
```bash
source ~/.zshrc
# OR
source ~/.bash_profile
```

### Step 4: Create Android Virtual Device (5 min)
- [ ] Open **Tools** > **Device Manager** (or AVD Manager)
- [ ] Click **Create Device**
- [ ] Select **Pixel 6** or **Pixel 7**
- [ ] Select **Android 15.0 (API 35)** system image (download if needed)
- [ ] Name it: `Pixel_6_API_35`
- [ ] Click **Finish**

### Step 5: Test Emulator (2-5 min)
- [ ] Click **Play** button (▶) next to your AVD
- [ ] Wait for emulator to boot (first time: 2-5 minutes)
- [ ] Verify Android home screen appears

### Step 6: Verify Setup
Run in Terminal:
```bash
# Check ADB
adb version

# Check emulator
emulator -version

# List devices
adb devices
```

You should see your emulator listed!

### Step 7: Install HabitNow APK (1 min)
With emulator running:
```bash
cd /Users/goisemail/base/habbitNow
adb install HabitNow.apk
```

OR simply drag `HabitNow.apk` into the emulator window.

### Step 8: Launch HabitNow
- [ ] In emulator, open app drawer
- [ ] Find and tap **HabitNow**
- [ ] App should launch! 🎉

---

## 🔧 Quick Verification Script

Run this to check your setup:
```bash
cd /Users/goisemail/base/habbitNow
./setup_android.sh
```

---

## ⚡ Common Issues & Quick Fixes

### Emulator won't start?
- Try: **Cold Boot Now** from AVD Manager dropdown
- Increase RAM: Edit AVD > Show Advanced Settings > RAM: 4096 MB

### ADB not found?
- Restart Terminal after adding environment variables
- Check: `echo $ANDROID_HOME` should show a path

### APK won't install?
- Uninstall first: `adb uninstall com.habitnow`
- Try again: `adb install -r HabitNow.apk`

### Slow emulator?
- Close other apps
- Increase RAM allocation
- Use hardware acceleration (should be automatic)

---

## 📱 Recommended AVD Configuration

**Device**: Pixel 6 or Pixel 7  
**System Image**: Android 15.0 (API 35)  
**RAM**: 4096 MB  
**Graphics**: Automatic (Hardware - GLES 2.0)  
**Storage**: 2048 MB internal

---

## ✅ Final Checklist

Before moving to iOS setup, verify:
- [ ] Android Studio installed and working
- [ ] Emulator starts successfully
- [ ] `adb devices` shows your emulator
- [ ] HabitNow.apk installed and launches
- [ ] You can interact with the app in emulator

---

## 🎯 Next Steps

Once Android is working:
1. ✅ Test HabitNow app thoroughly
2. ✅ Note any issues or behaviors
3. ✅ Proceed to **iOS 16 Simulator Setup**
4. ✅ Then start **React Native Project Setup**

---

**Estimated Total Time**: 45-60 minutes  
**Difficulty**: Easy to Medium

