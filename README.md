# IELTSPath Mobile

React Native app with Expo Router. Backend and frontend live in sibling folders.

## Start the mobile app

```powershell
# From the repository root, with Docker Desktop running:
cd backend
.\scripts\start-dev.ps1

# Start Expo Go from the mobile project:
cd ..\mobile
npm ci
npm start
```

The backend script creates a git-ignored local `.env` with fresh development secrets when needed, then builds and starts the Compose stack. It never overwrites an existing `.env` or removes database volumes. Wait until services are healthy before opening the app. Scan the Expo QR code with Expo Go on a phone connected to the same Wi-Fi as the computer. The mobile startup script chooses the computer's LAN address and starts a bridge to the API Gateway on port 8080.

`npm run backend:check` inspects gateway health and Docker service status without changing or restarting services.

For an iPhone on the same Wi-Fi, run `npm run ios` on Windows and scan the Expo QR with Expo Go. The iOS Simulator requires macOS. For a remote Metro tunnel, set `EXPO_PUBLIC_API_BASE_URL` to an HTTPS API origin, then run `npm run start:remote`.

## API connection settings

`npm ci` creates `.env` from `.env.example` when `.env` is missing. Same-Wi-Fi Expo Go use normally needs no API URL edit.

- `EXPO_PUBLIC_API_BASE_URL`: optional API origin. Leave unset for LAN auto-detection. Use `http://10.0.2.2:8080` for an Android emulator or `http://localhost:8080` for the iOS Simulator.
- `EXPO_PUBLIC_API_PORT`: optional gateway port, default `8080`.
- `MOBILE_LAN_HOST`: optional override for the PC's Wi-Fi/Ethernet IPv4 address. The startup script automatically prefers Wi-Fi, then Ethernet, and skips common virtual adapters; set this only if automatic selection picks the wrong network.
- `EXPO_PUBLIC_AUTH_ENABLED`: backend authentication toggle, default `true`.

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
