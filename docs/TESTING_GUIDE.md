# RideSquad Mobile App Testing Guide

This guide provides instructions for testing the RideSquad mobile application on both iOS and Android simulators.

## Prerequisites

- macOS (required for iOS simulator)
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)
- Node.js and npm/yarn installed
- Expo CLI installed globally (`npm install -g expo-cli`)

## Testing on iOS Simulator

### 1. Install Xcode
- Download and install Xcode from the Mac App Store
- Open Xcode and install any additional required components when prompted

### 2. Start the Development Server
```bash
# Navigate to the project directory
cd /Users/stefantillman/Desktop/RideSquad/apps/mobile

# Install dependencies if you haven't already
yarn install  # or npm install

# Start the Expo development server
yarn start     # or npm start
```

### 3. Open in iOS Simulator
After running `yarn start`, you'll see the Expo developer menu. You can either:

1. Press `i` in the terminal to open the iOS simulator automatically, or
2. Press `w` to open the web version, or
3. Scan the QR code with your iPhone's camera (requires Expo Go app)

### 4. Common iOS Simulator Commands
- `⌘ + R` - Reload the app
- `⌘ + D` - Open developer menu
- `⌘ + ←` or `⌘ + →` - Rotate device
- `⌘ + S` - Take screenshot
- `⌘ + Q` - Quit the simulator

## Testing on Android Emulator

### 1. Install Android Studio
- Download and install [Android Studio](https://developer.android.com/studio)
- During installation, make sure to install:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device

### 2. Set Up Environment Variables
Add the following to your shell configuration file (`.zshrc` or `.bash_profile`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 3. Create an Android Virtual Device (AVD)
1. Open Android Studio
2. Click on "More Actions" > "Virtual Device Manager"
3. Click "Create Device"
4. Select a device definition (e.g., Pixel 6)
5. Download a system image (preferably a recent API level)
6. Complete the AVD configuration

### 4. Start the Android Emulator
1. From the AVD Manager, click the green play button next to your device
2. Or run from terminal:
   ```bash
   emulator -avd Your_AVD_Name
   ```

### 5. Run the App on Android
With the emulator running:

```bash
# Make sure you're in the project directory
cd /Users/stefantillman/Desktop/RideSquad/apps/mobile

# Start the Expo development server if not already running
yarn start

# In the Expo developer menu, press 'a' to open the app on Android
# Or scan the QR code with your Android device's camera (requires Expo Go app)
```

### 6. Common Android Emulator Commands
- `R` (double tap) - Reload the app
- `Ctrl + M` - Open developer menu
- `Ctrl + F11` or `Ctrl + F12` - Rotate device
- `⌘ + S` - Take screenshot
- `⌘ + M` - Toggle developer menu

## Testing Features

### Theme Switching
1. Open the app
2. Go to Settings
3. Under "Appearance", toggle between Light, Dark, and System themes
4. Verify the UI updates immediately

### Language Switching
1. Open the app
2. Go to Settings
3. Under "Language", select a different language
4. Verify the UI updates with the new language

### Navigation
1. Test each tab (Connect, Friends, Teams, Settings)
2. Verify the bottom tab bar updates correctly
3. Check that the back button works as expected

## Debugging

### Viewing Logs
```bash
# View logs in terminal
expo start --clear

# Or press 'd' in the terminal to open the developer menu in the app
# Then select "Debug Remote JS"
```

### Common Issues
- **App not updating?** Try clearing the cache with `expo start -c`
- **Simulator not starting?** Make sure Xcode/Android Studio is properly installed
- **App crashes on launch?** Check the terminal for error messages

## Testing on Physical Devices

### iOS (using Expo Go)
1. Install Expo Go from the App Store
2. Scan the QR code from the terminal with your iPhone's camera
3. The app will open in Expo Go

### Android (using Expo Go)
1. Install Expo Go from the Google Play Store
2. Scan the QR code from the terminal with your Android device's camera
3. The app will open in Expo Go

## Next Steps
- Set up EAS for building production versions
- Configure testing with Detox or React Native Testing Library
- Set up CI/CD for automated testing

## Support
For additional help, refer to:
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Debugging](https://reactnative.dev/docs/debugging)
- [Expo Forums](https://forums.expo.dev/)
