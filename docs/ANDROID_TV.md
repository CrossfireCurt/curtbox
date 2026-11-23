# Curtbox TV — Android TV / Google TV / compatible Fire TV host app

## What it does

Curtbox TV is a small native Android application that points at your existing Curtbox server and opens the normal **Host** web interface. It does **not** include a game server, local room database, or private player screens. A TV can create and present either Survey Show or President / Asshole. Guests join normally from their phones using the TV QR code or room code.

The native setup screen stores a configurable origin such as `https://curtbox.example.com` or `http://192.168.1.50:3000`. Do not enter a `/room/ABCD` path. The server must be reachable from the TV network. Prefer HTTPS with a trusted certificate; HTTP is supported for self-hosted **trusted LAN** servers only.

## Install the APK

1. Open [GitHub → Actions → Android TV APK](https://github.com/CrossfireCurt/curtbox/actions/workflows/android-tv.yml).
2. Select a successful run (or run the workflow manually) and download the `curtbox-tv-sideload-...` artifact.
3. Extract `app-debug.apk` and sideload it on an Android TV/Google TV or compatible Fire TV device using developer options and ADB, or a trusted file manager.
4. Start **Curtbox TV** from the TV launcher, enter your server address, choose a game, create a room, configure host settings, and open the lobby.

Example with Android Debug Bridge and TV networking enabled:

```bash
adb connect TV_IP:5555
adb install -r app-debug.apk
```

**This is a debug-signed test APK, not a signed Play Store/Amazon Appstore release.** GitHub runner debug signing identities can change between runs; if upgrading fails with a signature mismatch, uninstall the older debug build and install the new one. This clears application-local settings and session tokens. Stable, upgradeable production distribution requires a separately secured release signing key.

Version tags (e.g., `v0.1.1`) run the existing Curtbox release pipeline, which now attaches an Android TV **debug** APK alongside the web application bundle/checksums. Do not mistake that for a production-signed store build.

## Controls

- D-pad Up/Down/Left/Right: move focus between Curtbox host controls. The current element has a large gold outline.
- Remote OK/Select: activate the focused game, button or form control.
- TV keyboard: edit the server URL on the native setup screen.
- **Server** button in top toolbar: enter a different server URL.
- **Reload** button: reload Curtbox, preserving browser storage by origin.
- Remote Back: close an open Curtbox modal where supported; otherwise choose Continue / Change server / Exit.
- Remote Menu button (if present): return to server setup.

## Development

The `android-tv/` Gradle project uses Java 17, Android Gradle Plugin 8.7.3, Gradle 8.9 and SDK 35, minimum SDK 23. The Android application is dependency-light and uses system WebView with DOM storage and JavaScript. It appends `CurtboxTV/1.0` to its user agent. The existing React app activates remote-focus navigation from `client/src/tvNavigation.ts` when it detects that marker.

Android is **not** a game engine: it relies on existing Socket.IO/server authorization. TV-origin local storage contains the host reconnect token; web origins stay isolated. File/content access is off, external-site navigation is blocked, no JavaScript-to-native bridge is exposed, and debug inspection is only enabled for debuggable APKs.

To build locally with JDK 17, Android SDK Platform 35, Android SDK Build Tools, and Gradle 8.9:

```bash
cd android-tv
gradle :app:assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

The standalone GitHub Android workflow also builds and uploads an APK and SHA256 checksum, including on TV-related pull requests. The standard web CI continues to build the Node/Vite/React application separately.

## Testing and limitations

- Verify the actual APK on a Google TV/Android TV emulator **and at least one Google TV or Fire TV device** before closing [issue #1](https://github.com/CrossfireCurt/curtbox/issues/1).
- Test remote navigation through both game creation flows, text fields and dropdowns, entering a host room, QR display, speaker/music controls, reconnects, slow network and TV sleep/wake.
- Some Fire TV versions may have different WebView support, remote layouts, or URL input keyboards. Fire TV support is a compatibility target, not a hardware-tested guarantee.
- No offline hosting; the configured Curtbox server must stay online.
- Only the Host interface runs on TV. To play personally, use a separate Player session/device.
- Server connections over HTTP should be confined to trusted LANs. The app deliberately permits cleartext for that use case.
- Before distributing outside personal sideload testing, introduce durable signing and additional device/security review.
