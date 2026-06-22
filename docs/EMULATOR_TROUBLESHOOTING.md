# Emulator Troubleshooting Guide

## Current Issue
The emulator `Medium_Phone_API_36.1` is not booting properly. API 36.1 is very new and may have stability issues.

## Solution: Create a New AVD with Stable API

### Option 1: Create via Android Studio (Recommended)

1. **Open Android Studio**
2. **Go to**: Tools > Device Manager (or click Device Manager icon)
3. **Click**: "Create Device" button
4. **Select Device**: Choose "Pixel 6" or "Pixel 7"
5. **Select System Image**: 
   - **Choose**: **Android 15.0 (API 35)** - This is stable and matches HabitNow's target SDK
   - If not available, click "Download" next to it
   - Wait for download to complete
6. **Click Next**
7. **Configure AVD**:
   - Name: `Pixel_6_API_35`
   - Graphics: **Automatic** (or Hardware - GLES 2.0)
   - RAM: 4096 MB (recommended)
8. **Click Finish**

### Option 2: Create via Command Line

```bash
# List available system images
sdkmanager --list | grep "system-images" | grep "android-35"

# Install system image if needed (via Android Studio SDK Manager is easier)
# Then create AVD:
avdmanager create avd -n Pixel_6_API_35 -k "system-images;android-35;google_apis;x86_64" -d "pixel_6"
```

## Start the New Emulator

### Via Android Studio:
1. In Device Manager, find your new AVD
2. Click the **Play** button (▶)
3. Wait for it to boot (2-5 minutes first time)

### Via Command Line:
```bash
emulator -avd Pixel_6_API_35
```

## Alternative: Fix Current AVD

If you want to try fixing the current one:

1. **Cold Boot** (wipe data):
   ```bash
   emulator -avd Medium_Phone_API_36.1 -wipe-data
   ```

2. **Check Hardware Acceleration**:
   - In Android Studio: Tools > SDK Manager > SDK Tools
   - Ensure "Intel x86 Emulator Accelerator (HAXM)" is installed (for Intel Macs)
   - For Apple Silicon (M1/M2/M3): Should use ARM64 images automatically

3. **Check AVD Configuration**:
   - Edit AVD in Device Manager
   - Show Advanced Settings
   - Graphics: Try "Software - GLES 2.0" if hardware acceleration fails

## Recommended AVD Configuration

- **Device**: Pixel 6 or Pixel 7
- **API Level**: 35 (Android 15.0) - Stable and matches HabitNow
- **System Image**: Google APIs (not Google Play) - Faster boot
- **RAM**: 4096 MB
- **Graphics**: Automatic
- **Storage**: 2048 MB internal

## Why API 35 Instead of 36.1?

- API 35 is the **target SDK** for HabitNow (as seen in AndroidManifest.xml)
- API 36.1 is very new and may have bugs
- API 35 is more stable and widely tested
- Better compatibility with existing apps

## Verify Emulator is Working

Once emulator boots:
```bash
adb devices
# Should show: emulator-5554    device
```

Then install HabitNow:
```bash
adb install HabitNow.apk
```

