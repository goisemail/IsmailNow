# Android Setup Guide for Mac

## Prerequisites
- Mac computer (macOS)
- Internet connection
- At least 8GB RAM (16GB recommended)
- 10GB+ free disk space

---

## Step 1: Install Android Studio

### 1.1 Download Android Studio
1. Go to: https://developer.android.com/studio
2. Click "Download Android Studio"
3. Accept the terms and download the `.dmg` file for Mac

### 1.2 Install Android Studio
1. Open the downloaded `.dmg` file
2. Drag Android Studio to your Applications folder
3. Open Android Studio from Applications
4. If prompted about security, go to System Preferences > Security & Privacy and allow it

### 1.3 First Launch Setup
1. When Android Studio opens, select "Do not import settings" (if first time)
2. Click "Next" through the setup wizard
3. Choose "Standard" installation type
4. Accept the license agreements
5. Click "Finish" and wait for components to download (this may take 10-20 minutes)

---

## Step 2: Install Android SDK Components

### 2.1 Open SDK Manager
1. In Android Studio, go to: **Tools** > **SDK Manager**
   - OR click the SDK Manager icon in the toolbar

### 2.2 Install Required SDK Platforms
In the **SDK Platforms** tab, check:
- ✅ **Android 15.0 (API 35)** - Target SDK for HabitNow
- ✅ **Android 6.0 (API 23)** - Minimum SDK for HabitNow
- ✅ **Android 14.0 (API 34)** - Recommended
- ✅ **Android 13.0 (API 33)** - Recommended
- ✅ **Android 12.0 (API 31)** - Recommended

### 2.3 Install SDK Tools
In the **SDK Tools** tab, ensure these are checked:
- ✅ Android SDK Build-Tools
- ✅ Android SDK Command-line Tools
- ✅ Android SDK Platform-Tools
- ✅ Android Emulator
- ✅ Intel x86 Emulator Accelerator (HAXM installer) - for better performance
- ✅ Google Play services
- ✅ Google Play Store

### 2.4 Apply and Install
1. Click **Apply** or **OK**
2. Accept all license agreements
3. Wait for installation to complete (may take 15-30 minutes)

---

## Step 3: Set Up Environment Variables

### 3.1 Find Android SDK Path
1. In Android Studio, go to: **Tools** > **SDK Manager**
2. Note the "Android SDK Location" path (usually: `/Users/yourusername/Library/Android/sdk`)

### 3.2 Add to Shell Profile
Open Terminal and run:

```bash
# Check which shell you're using
echo $SHELL

# If using zsh (default on newer Macs)
nano ~/.zshrc

# If using bash
nano ~/.bash_profile
```

Add these lines (replace the path with your actual SDK path):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Save and exit (Ctrl+X, then Y, then Enter)

### 3.3 Reload Shell Configuration
```bash
# For zsh
source ~/.zshrc

# For bash
source ~/.bash_profile
```

### 3.4 Verify Installation
```bash
# Check Android SDK
echo $ANDROID_HOME

# Check adb (Android Debug Bridge)
adb version

# Check emulator
emulator -version
```

---

## Step 4: Create Android Virtual Device (AVD)

### 4.1 Open AVD Manager
1. In Android Studio, go to: **Tools** > **Device Manager**
   - OR click the Device Manager icon in the toolbar
   - OR go to: **Tools** > **AVD Manager**

### 4.2 Create Virtual Device
1. Click **Create Device** button
2. Select a device definition:
   - **Recommended**: Pixel 6 or Pixel 7
   - Or choose any phone you prefer
   - Click **Next**

### 4.3 Select System Image
1. Select a system image:
   - **Recommended**: **Android 15.0 (API 35)** - "Tiramisu" or latest
   - Or **Android 14.0 (API 34)** - "UpsideDownCake"
   - Click the **Download** link if the image isn't installed
   - Wait for download to complete
   - Click **Next**

### 4.4 Configure AVD
1. **AVD Name**: Give it a name (e.g., "Pixel_6_API_35")
2. **Startup orientation**: Portrait (default)
3. **Graphics**: 
   - **Automatic** (recommended) - uses hardware acceleration
   - Or **Hardware - GLES 2.0** for better performance
4. **Advanced Settings** (optional):
   - RAM: 2048 MB or more (4096 MB recommended)
   - VM heap: 512 MB
   - Internal Storage: 2048 MB
   - SD Card: Optional
5. Click **Finish**

### 4.5 Create Additional AVDs (Optional)
Create multiple AVDs for different Android versions:
- One with Android 15 (API 35) - for testing latest
- One with Android 6.0 (API 23) - for minimum version testing
- One with Android 14 (API 34) - for common version

---

## Step 5: Test the Emulator

### 5.1 Start the Emulator
1. In Device Manager, click the **Play** button (▶) next to your AVD
2. Wait for the emulator to boot (first time may take 2-5 minutes)
3. The emulator window will open showing the Android home screen

### 5.2 Verify Emulator is Running
In Terminal:
```bash
adb devices
```
You should see your emulator listed (e.g., `emulator-5554`)

---

## Step 6: Install and Run HabitNow APK

### 6.1 Install APK via ADB
1. Make sure your emulator is running
2. Open Terminal
3. Navigate to your project directory:
```bash
cd /Users/goisemail/base/habbitNow
```

4. Install the APK:
```bash
adb install HabitNow.apk
```

### 6.2 Alternative: Drag and Drop
1. With emulator running, simply drag `HabitNow.apk` file into the emulator window
2. The APK will install automatically

### 6.3 Launch the App
1. In the emulator, open the app drawer
2. Find "HabitNow" app
3. Tap to launch

### 6.4 Verify Installation
```bash
# List installed packages
adb shell pm list packages | grep habitnow

# Should show: package:com.habitnow
```

---

## Step 7: Enable Hardware Acceleration (Optional but Recommended)

### 7.1 For Intel Macs
1. In Android Studio, go to: **Tools** > **SDK Manager** > **SDK Tools**
2. Check **Intel x86 Emulator Accelerator (HAXM installer)**
3. Install it
4. Restart Android Studio

### 7.2 For Apple Silicon (M1/M2/M3) Macs
1. Android Studio automatically uses ARM images
2. Make sure you selected ARM64 system images when creating AVD
3. Performance should be good without additional setup

---

## Step 8: Troubleshooting

### 8.1 Emulator Won't Start
**Issue**: Emulator shows "Waiting for target device to come online"

**Solutions**:
1. Check if virtualization is enabled in BIOS (for Intel Macs)
2. Try cold boot: In AVD Manager, click the dropdown arrow next to your AVD > **Cold Boot Now**
3. Increase RAM allocation in AVD settings
4. Try a different system image

### 8.2 ADB Not Found
**Issue**: `command not found: adb`

**Solutions**:
1. Verify ANDROID_HOME is set correctly
2. Check PATH includes platform-tools
3. Restart Terminal
4. Try full path: `$ANDROID_HOME/platform-tools/adb`

### 8.3 APK Installation Fails
**Issue**: `INSTALL_FAILED` or `INSTALL_PARSE_FAILED`

**Solutions**:
1. Check if app is already installed: `adb uninstall com.habitnow`
2. Try installing again
3. Check APK file integrity
4. Enable "Install via USB" in emulator settings (usually enabled by default)

### 8.4 Slow Emulator Performance
**Solutions**:
1. Increase RAM allocation (4096 MB or more)
2. Enable hardware acceleration
3. Close other applications
4. Use a lighter system image (without Google Play)
5. Reduce emulator window size

### 8.5 Emulator Crashes
**Solutions**:
1. Update Android Studio to latest version
2. Update system images
3. Create a new AVD with default settings
4. Check Mac system logs: Console.app

---

## Step 9: Useful Commands

### ADB Commands
```bash
# List connected devices
adb devices

# Install APK
adb install path/to/app.apk

# Uninstall app
adb uninstall com.habitnow

# View logs
adb logcat

# Clear app data
adb shell pm clear com.habitnow

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/record.mp4
# Press Ctrl+C to stop
adb pull /sdcard/record.mp4
```

### Emulator Commands
```bash
# List available AVDs
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_6_API_35

# Start with specific options
emulator -avd Pixel_6_API_35 -no-snapshot-load
```

---

## Step 10: Verify Complete Setup

### Checklist
- [ ] Android Studio installed and launched
- [ ] Android SDK installed (API 35, 23, and others)
- [ ] SDK tools installed (emulator, platform-tools, etc.)
- [ ] Environment variables set (ANDROID_HOME, PATH)
- [ ] AVD created and tested
- [ ] Emulator starts successfully
- [ ] ADB recognizes emulator (`adb devices`)
- [ ] HabitNow APK installed on emulator
- [ ] HabitNow app launches successfully

---

## Next Steps

Once Android setup is complete:
1. ✅ Test the existing HabitNow app thoroughly
2. ✅ Note any issues or behaviors
3. ✅ Proceed to iOS setup (iOS 16 simulator)
4. ✅ Then start React Native project setup

---

## Additional Resources

- **Android Studio Documentation**: https://developer.android.com/studio
- **AVD Documentation**: https://developer.android.com/studio/run/emulator
- **ADB Documentation**: https://developer.android.com/studio/command-line/adb

---

**Setup Time Estimate**: 30-60 minutes (depending on internet speed)

**System Requirements**:
- macOS 10.14 or later
- 8GB RAM minimum (16GB recommended)
- 10GB+ free disk space
- Internet connection for downloads

