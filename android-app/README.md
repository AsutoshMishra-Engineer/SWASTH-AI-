# Swasth AI Lite (Android Web Application with Firebase)

An ultra-lightweight (< 3 MB), hardware-accelerated Android application wrapper for **Swasth AI (ସ୍ୱାସ୍ଥ୍ୟ AI)**, featuring native hardware access (direct microphone & camera capture without browser popups) and Firebase Cloud Messaging (FCM) for public health alerts.

---

## 📱 Features

1. **Direct Native Hardware Access**:
   * Auto-grants `AUDIO_CAPTURE` and `VIDEO_CAPTURE` to `swasth-ai.pages.dev` via `WebChromeClient.onPermissionRequest`.
   * No annoying browser permission dialogs when tapping the mic or camera.
2. **Native Camera & Gallery File Chooser**:
   * Uses Android's native `ACTION_IMAGE_CAPTURE` and `ACTION_GET_CONTENT` through Android `FileProvider`.
   * Tapping the camera button opens your smartphone's native camera immediately to snap ringworm or skin lesion photos.
3. **Firebase Cloud Messaging (FCM)**:
   * Background and foreground push notifications for emergency health alerts (e.g. *"Dengue alert in your district"* or *"108 Ambulance dispatched"*).
4. **Pull-to-Refresh & Offline Edge**:
   * Integrated with `SwipeRefreshLayout` and smooth progress bar.
5. **Ultra-Lightweight**:
   * APK size < 3 MB (similar to *Instagram Lite* or *Team-Space*).

---

## 🚀 How to Build and Run in Android Studio

### Step 1: Open the Project
1. Open **Android Studio**.
2. Click **File -> Open...**
3. Browse to `D:\Swasth AI Project\android-app` and click **OK**.
4. Allow Gradle to sync dependencies automatically.

### Step 2: Connect Your Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create or select your project.
3. Register an Android app with package name: `com.asutosh.swasthai`.
4. Download your `google-services.json` and replace the placeholder at:
   `android-app/app/google-services.json`

### Step 3: Connect Phone & Run
1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your phone via USB cable (or select an Android Virtual Device emulator).
3. Click the green **Run (▶)** button in Android Studio.
4. The app will install and open instantly on your phone!

---

## 📦 How to Generate the APK for Hackathon Judges

1. In Android Studio, go to the top menu: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
2. When Gradle finishes, click **Locate** in the bottom-right popup.
3. The generated APK will be at:
   `app/build/outputs/apk/debug/app-debug.apk`
4. Copy this `.apk` to your phone via USB or WhatsApp/Drive and hand it to judges to test live!
