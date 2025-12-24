# Android Build Instructions for Mars Miner

## Current Status

✅ **Completed:**
- Capacitor dependencies installed
- Android platform added
- Web app built for production
- Capacitor synced with Android project
- Android project structure created
- **APK signing configured with release keystore**
- **SDK versions set to 36 (Android 16+ compatible)**
- **GitHub Actions workflow created for automated builds**

🎉 **Ready to Build:** The project is fully configured to generate signed, installable APKs!

📱 **See [APK_BUILD_FIX.md](./APK_BUILD_FIX.md) for detailed information about the signing configuration and fixes applied.**

## Project Structure

```
Mars-miner-vibe-game/
├── android/                    # Android native project (generated)
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── assets/
│   │   │       │   └── public/  # Your web app lives here
│   │   │       └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── gradlew                 # Gradle wrapper
│   └── build.gradle
├── dist/                       # Built web app
├── capacitor.config.json       # Capacitor configuration
└── src/                        # Game source code
```

## Building the APK

### Method 1: Using Local Environment (Recommended)

If you have Android Studio and SDK installed locally:

```bash
# 1. Build the web app
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. In Android Studio:
#    - Build > Build Bundle(s) / APK(s) > Build APK(s)
#    - Or use: Build > Generate Signed Bundle / APK
```

### Method 2: Command Line Build

If you have Android SDK and Gradle configured:

```bash
# 1. Build web app
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 3: Using System Gradle

```bash
cd android
gradle assembleDebug
# Or for release:
gradle assembleRelease
```

## Common Issues & Solutions

### Issue: Network/Repository Access
**Error:** `UnknownHostException: repo.maven.apache.org`

**Solution:**
1. Configure proxy if behind firewall
2. Use offline mode if dependencies are cached: `./gradlew assembleDebug --offline`
3. Pre-download dependencies in an environment with internet access

### Issue: Missing Android SDK
**Error:** SDK location not found

**Solution:**
Create `local.properties` in android/ directory:
```properties
sdk.dir=/path/to/your/Android/sdk
```

### Issue: Gradle Wrapper Fails
**Solution:** Use system Gradle instead:
```bash
which gradle  # Find your gradle installation
/path/to/gradle assembleDebug
```

## Configuration Files

### capacitor.config.json
```json
{
  "appId": "com.marsminer.game",
  "appName": "Mars Miner",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

### App Information
- **App ID:** com.marsminer.game
- **App Name:** Mars Miner
- **Package:** Web app in `dist/` folder
- **Platform:** Android (iOS can be added later)

## Building for Different Environments

### Debug Build (Testing)
```bash
cd android
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release Build (Production)
```bash
cd android
./gradlew assembleRelease
# Note: Requires signing configuration
# Output: app/build/outputs/apk/release/app-release.apk
```

## Signing for Release

To create a signed release APK, you need a keystore:

1. Generate keystore:
```bash
keytool -genkey -v -keystore mars-miner.keystore -alias mars-miner -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure in `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("path/to/mars-miner.keystore")
            storePassword "your-password"
            keyAlias "mars-miner"
            keyPassword "your-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## Development Workflow

1. **Make changes to web app**
   ```bash
   npm run dev  # Test in browser
   ```

2. **Build for mobile**
   ```bash
   npm run build
   npx cap sync android
   ```

3. **Test on Android**
   ```bash
   npx cap run android
   # Or open in Android Studio
   npx cap open android
   ```

## Next Steps

To successfully build the APK, you'll need either:

1. **Local development environment** with:
   - Android Studio
   - Android SDK (API level 33 or higher)
   - JDK 17
   - Gradle 8.x

2. **CI/CD pipeline** with internet access (see GitHub Actions setup below)

3. **Pre-configured build environment** with cached dependencies

## GitHub Actions Build (Future)

Create `.github/workflows/build-apk.yml` for automated builds:

```yaml
name: Build Android APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: mars-miner-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### Check Capacitor Status
```bash
npx cap doctor
```

### List Connected Devices
```bash
adb devices
```

### Install APK Manually
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### View Logs
```bash
adb logcat | grep Mars
```

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/studio/build/building-cmdline)
- [Gradle Build Tool](https://gradle.org/guides/)
