# Study Timer — Native App (Stage 1)

## What's new vs the web version
- Uses **expo-notifications** to schedule the phase-end alert natively — this fires
  correctly even if you switch apps or lock your screen, because it's handled by
  the OS notification system, not a JS timer.
- Same timestamp-based countdown logic (self-corrects if the app was
  backgrounded).
- Same 1hr/2hr templates, same breaks, same tip system.

## How to run it (you already have Expo set up)

1. Copy this `study-timer-app` folder onto your PC.
2. Open a terminal inside the folder and run:
   ```
   npm install
   npx expo start
   ```
3. A QR code will appear in your terminal/browser.
4. Open the **Expo Go** app on your phone (install free from Play Store if you
   don't have it) and scan the QR code.
5. The app will load and run like a native app on your phone.

## Notes
- The very first time you open it, it'll ask for notification permission —
  accept this, it's required for the background alerts to work.
- The alarm sound currently uses a placeholder online beep tone
  (`beep_short.ogg` from Google's sound library) for the in-app sound when the
  app is open. If you want a custom sound file, drop an `.mp3` into an
  `/assets` folder and I'll wire it in — just let me know.
- This is a local dev build via Expo Go — no app store involved, completely
  free, and only visible on your phone.

## Next steps (Stage 2 onward)
Once you've tested this and confirmed timing + notifications work well on
your phone, we move to Stage 2: adding local data storage so the app
remembers sessions, which sets up course tracking (Stage 3) and custom
session building (Stage 4).
