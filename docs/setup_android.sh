#!/bin/bash

# Android Setup Script for Mac
# This script helps verify and set up Android development environment

echo "=========================================="
echo "Android Development Environment Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Android Studio is installed
echo "Checking Android Studio installation..."
if [ -d "/Applications/Android Studio.app" ]; then
    echo -e "${GREEN}✓ Android Studio is installed${NC}"
else
    echo -e "${RED}✗ Android Studio is not installed${NC}"
    echo "Please install Android Studio from: https://developer.android.com/studio"
    exit 1
fi

# Check Android SDK
echo ""
echo "Checking Android SDK..."
if [ -d "$HOME/Library/Android/sdk" ]; then
    ANDROID_HOME="$HOME/Library/Android/sdk"
    echo -e "${GREEN}✓ Android SDK found at: $ANDROID_HOME${NC}"
else
    echo -e "${YELLOW}⚠ Android SDK not found in default location${NC}"
    echo "Please set ANDROID_HOME manually or install SDK via Android Studio"
    read -p "Enter Android SDK path (or press Enter to skip): " custom_path
    if [ ! -z "$custom_path" ]; then
        ANDROID_HOME="$custom_path"
    fi
fi

# Check environment variables
echo ""
echo "Checking environment variables..."
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}⚠ ANDROID_HOME is not set${NC}"
    echo ""
    echo "Add these lines to your ~/.zshrc or ~/.bash_profile:"
    echo ""
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin"
    echo ""
    read -p "Do you want to add these to ~/.zshrc now? (y/n): " add_env
    if [ "$add_env" = "y" ] || [ "$add_env" = "Y" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
        if [ -f "$HOME/.bash_profile" ] && [ ! -f "$HOME/.zshrc" ]; then
            SHELL_CONFIG="$HOME/.bash_profile"
        fi
        
        echo "" >> "$SHELL_CONFIG"
        echo "# Android SDK" >> "$SHELL_CONFIG"
        echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> "$SHELL_CONFIG"
        echo "export PATH=\$PATH:\$ANDROID_HOME/emulator" >> "$SHELL_CONFIG"
        echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> "$SHELL_CONFIG"
        echo "export PATH=\$PATH:\$ANDROID_HOME/tools" >> "$SHELL_CONFIG"
        echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin" >> "$SHELL_CONFIG"
        
        echo -e "${GREEN}✓ Added to $SHELL_CONFIG${NC}"
        echo "Please run: source $SHELL_CONFIG"
    fi
else
    echo -e "${GREEN}✓ ANDROID_HOME is set to: $ANDROID_HOME${NC}"
fi

# Check ADB
echo ""
echo "Checking ADB (Android Debug Bridge)..."
if command_exists adb; then
    ADB_VERSION=$(adb version | head -n 1)
    echo -e "${GREEN}✓ ADB is installed: $ADB_VERSION${NC}"
else
    if [ ! -z "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        echo -e "${YELLOW}⚠ ADB found but not in PATH${NC}"
        echo "Add platform-tools to your PATH"
    else
        echo -e "${RED}✗ ADB is not installed${NC}"
        echo "Install via Android Studio > SDK Manager > SDK Tools > Android SDK Platform-Tools"
    fi
fi

# Check Emulator
echo ""
echo "Checking Android Emulator..."
if command_exists emulator; then
    EMULATOR_VERSION=$(emulator -version | head -n 1)
    echo -e "${GREEN}✓ Emulator is installed: $EMULATOR_VERSION${NC}"
else
    if [ ! -z "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/emulator/emulator" ]; then
        echo -e "${YELLOW}⚠ Emulator found but not in PATH${NC}"
        echo "Add emulator to your PATH"
    else
        echo -e "${RED}✗ Emulator is not installed${NC}"
        echo "Install via Android Studio > SDK Manager > SDK Tools > Android Emulator"
    fi
fi

# List available AVDs
echo ""
echo "Checking available AVDs..."
if command_exists emulator; then
    AVD_LIST=$(emulator -list-avds 2>/dev/null)
    if [ ! -z "$AVD_LIST" ]; then
        echo -e "${GREEN}✓ Available AVDs:${NC}"
        echo "$AVD_LIST" | sed 's/^/  - /'
    else
        echo -e "${YELLOW}⚠ No AVDs found${NC}"
        echo "Create an AVD via Android Studio > Device Manager > Create Device"
    fi
fi

# Check connected devices
echo ""
echo "Checking connected devices..."
if command_exists adb; then
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
    if [ "$DEVICES" -gt 0 ]; then
        echo -e "${GREEN}✓ Found $DEVICES connected device(s):${NC}"
        adb devices
    else
        echo -e "${YELLOW}⚠ No devices connected${NC}"
        echo "Start an emulator or connect a physical device"
    fi
fi

# Check if HabitNow APK exists
echo ""
echo "Checking HabitNow APK..."
APK_PATH="$(pwd)/HabitNow.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${GREEN}✓ HabitNow.apk found (Size: $APK_SIZE)${NC}"
    
    if command_exists adb; then
        DEVICES_COUNT=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
        if [ "$DEVICES_COUNT" -gt 0 ]; then
            echo ""
            read -p "Do you want to install HabitNow.apk on connected device(s)? (y/n): " install_apk
            if [ "$install_apk" = "y" ] || [ "$install_apk" = "Y" ]; then
                echo "Installing HabitNow.apk..."
                adb install -r "$APK_PATH"
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ HabitNow installed successfully${NC}"
                else
                    echo -e "${RED}✗ Installation failed${NC}"
                    echo "Try: adb uninstall com.habitnow (if already installed)"
                fi
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠ HabitNow.apk not found in current directory${NC}"
    echo "Expected location: $APK_PATH"
fi

echo ""
echo "=========================================="
echo "Setup Check Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If environment variables were added, run: source ~/.zshrc"
echo "2. Open Android Studio and create an AVD (if not done)"
echo "3. Start the emulator"
echo "4. Install HabitNow.apk: adb install HabitNow.apk"
echo ""

