# StarCenttinel Owner App — prototype 0.3

Standalone Expo (SDK 54) React Native app for iOS and Android. Not connected to the Guardian runtime.

## Opening sequence (follows approved storyboard)
1. Tap to launch: app icon made from the S-eye mark (`assets/icon.png`)
2. Logo activation: logo powers up, eye core pulses, light streak, rotating rings
3. Laser engage: laser fires from the eye, camera pushes in, red flash
4. Camera into laser: tunnel flythrough with light streaks, white-out
5. Briefcase reveal: closed case, camera settles, red light sweep
6. Briefcase opens: light burst, rising light rays, smoke
7. Systems initializing: Config A + Config B slide together, chrome divider, "+" emblem, scan line
8. Load complete: chrome rings, segmented loading bar, 0 to 100%, chevrons
9. Command centre

The full sequence plays on every launch and can be skipped. With Reduce Motion on, only steps 2 and 8 play.

## Command centre (storyboard frame 9 + concept dashboard)
- Top bar: menu, crest, OWNER / PRIMARY AUTHORITY badge
- Hero: eye core + STARCENTTINEL COMMAND CENTRE wordmark, Guardian, System Status panel, Toronto skyline
- Module row: Threat Monitor, Device Network, Backup & Recovery, Emergency Modes, Guardian Link, Portal Protection, Field Kit
- Threat Intelligence (globe), System Health ring, Guardian Portals (7 cores), Live Incident Timeline
- INITIATE LOCKDOWN / EMERGENCY RECOVERY buttons (locked until all 6 security gates are cleared)
- Left drawer menu taken from the concept: Command Centre … Settings

## Data
All displayed values come from `src/status.js`. Today that file holds an offline snapshot (CAUTION, revision 1, feeds not connected). When the owner API is live, return live values in the same shape and the screens render them; for example `state: 'SECURE'` shows the green SECURE / ALL SYSTEMS ONLINE panel from storyboard frame 9.

## Assets
- `assets/story/`: frames cropped from the storyboard, upscaled 2x. They are placeholders until full-resolution renders or videos exist; swap in files with the same names.
- `assets/ui/`: pieces cropped from the concept dashboard (eye core, wordmark, globe, owner badge, action buttons).
- `assets/icons/`: module icons from storyboard frame 9.
- The Guardian figure is the storyboard placeholder. Replace `assets/story/sb_guardian.png` with the approved Guardian render.

## Run
Install Node 20 or newer, then `npm install` and `npx expo start`. Open the app in Expo Go.

## Structure
`App.js` · `src/Intro.js` · `src/Dashboard.js` · `src/ui.js` (chrome kit) · `src/status.js` · `src/theme.js`

## v0.5 owner read API integration

The independent Supabase Edge Function `starcenttinel-owner-read` is deployed. To enable the app's email-code login, copy `.env.example` to `.env` and supply the project's **public publishable/anon key only**. No private keys or service-role credentials may be included in the app. The app requests an email code, exchanges it for a short-lived owner session (held in memory only), and polls the authenticated read-only endpoint every 30 seconds. A network/authentication failure changes the status badge to OFFLINE and does not enable any controls. This is not a passkey implementation. The backend must still be tested with the real owner session and the app must undergo device testing before release.
