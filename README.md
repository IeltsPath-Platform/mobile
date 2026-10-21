# IELTSPath Mobile

React Native app with Expo Router. Backend and frontend live in sibling folders.

## Start the mobile app

Run these commands from `D:\DOAN\mobile`:

```powershell
npm install
npm run android
```

`npm run android` starts the LAN gateway bridge and Expo in one process. Start Docker Compose in `D:\DOAN\backend` separately. The app connects to the API Gateway on port 8080 by default. `npm run backend:check` inspects gateway health and Docker service status without changing or restarting services.

For an iPhone on the same Wi-Fi, run `npm run ios` on Windows and scan the Expo QR with Expo Go. The iOS Simulator requires macOS. For a remote Metro tunnel, set `EXPO_PUBLIC_API_BASE_URL` to an HTTPS API origin, then run `npm run start:remote`.

## API connection settings

Copy `.env.example` to `.env` (npm install does this when `.env` is missing).

- `EXPO_PUBLIC_API_BASE_URL`: optional API origin. Leave unset for LAN auto-detection. Use `http://10.0.2.2:8080` for an Android emulator or `http://localhost:8080` for the iOS Simulator.
- `EXPO_PUBLIC_API_PORT`: optional gateway port, default `8080`.
- `MOBILE_LAN_HOST`: optional PC Wi-Fi/Ethernet IPv4 address when the computer has multiple network adapters.
- `EXPO_PUBLIC_AUTH_ENABLED`: backend authentication toggle, default `true`.
- `EXPO_PUBLIC_USE_MOCK_LEARNING`: learning-path mock toggle, default `false`.

A physical phone and PC must share Wi-Fi. The bridge binds the selected PC LAN address and forwards HTTP uploads and WebSocket traffic to the local backend. Do not use Expo's tunnel host as the API host.

## Check, test, and build

```powershell
npm run backend:check
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
```

## Mobile features

The tab bar provides Today, Practice, Community, Notifications, and Profile. Community includes paged feed, image attachments, post and comment actions, mentions, public profiles, bookmarks, reports, notification preferences, and unread counts. Wordly includes room setup, multiplayer lobby, server synchronized play, hints, ranking, and match results.
