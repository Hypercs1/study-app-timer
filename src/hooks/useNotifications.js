import { useEffect, useRef, useCallback } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidAudioUsage,
  AndroidAudioContentType,
  SchedulableTriggerInputTypes,
} from "expo-notifications";

// Sound presets that ship with a bundled WAV + dedicated Android channel.
const SOUND_PRESETS = ["classic", "chime", "bell", "marimba"];

// An Android channel's sound is immutable once the channel is created, so we
// need one channel per preset. These helpers keep the naming in one place.
const channelIdFor = (preset) => `study-alarm-${preset}`;
const soundFileFor = (preset) => `alarm_${preset}.wav`;

const normalizePreset = (preset) =>
  SOUND_PRESETS.includes(preset) ? preset : "classic";

// In the foreground we swallow the notification entirely (no banner, no tray
// entry, no sound): SessionScreen plays the in-app alarm and drives the phase
// UI itself, so a system notification would just double up. When the app is
// backgrounded or locked this handler does NOT run, so the notification is
// shown by the system and the channel's own sound (the user's chosen preset)
// plays — which is exactly the background alarm we want.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Hook that manages notification permissions, per-preset Android channels,
 * and scheduling/cancelling a chain of phase-end notifications.
 */
export function useNotifications() {
  // Every notification id scheduled for the current chain, so we can cancel
  // the whole set at once when the session pauses / changes / ends.
  const scheduledIdsRef = useRef([]);

  // ── Request notification permission on mount ──
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Notifications Disabled",
          "Enable notifications in Settings so alarms fire when the app is backgrounded.",
          [{ text: "OK" }]
        );
      }
    })();
  }, []);

  // ── Create one Android channel per sound preset ──
  useEffect(() => {
    if (Platform.OS !== "android") return;
    SOUND_PRESETS.forEach((preset) => {
      Notifications.setNotificationChannelAsync(channelIdFor(preset), {
        name: `Study Timer — ${preset}`,
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#4f8ef7",
        sound: soundFileFor(preset),
        audioAttributes: {
          usage: AndroidAudioUsage.ALARM,
          contentType: AndroidAudioContentType.SONIFICATION,
        },
        bypassDnd: true,
      });
    });
  }, []);

  /**
   * Cancel every notification scheduled by the current session.
   */
  const cancelAll = useCallback(async () => {
    const ids = scheduledIdsRef.current;
    scheduledIdsRef.current = [];
    await Promise.all(
      ids.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
      )
    );
  }, []);

  /**
   * Schedule a chain of phase-end notifications. Any previously scheduled
   * chain is cancelled first.
   *
   * @param {Array<{seconds:number,title:string,body:string}>} items
   *   Each item fires `seconds` from now — the caller passes cumulative
   *   offsets so every upcoming phase boundary is covered even while the app
   *   is backgrounded (JS timers don't run in the background).
   * @param {string} soundPreset - which preset sound/channel to use.
   */
  const scheduleChain = useCallback(
    async (items, soundPreset) => {
      await cancelAll();

      if (!items || items.length === 0) return;

      const preset = normalizePreset(soundPreset);
      const channelId = channelIdFor(preset);
      const soundFile = soundFileFor(preset);

      const ids = [];
      for (const item of items) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: soundFile, // iOS reads the sound off the content
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.max(Math.round(item.seconds), 1),
              repeats: false,
              // channelId lives on the TRIGGER in expo-notifications v0.32,
              // not on content. Android picks the sound from this channel.
              ...(Platform.OS === "android" && { channelId }),
            },
          });
          ids.push(id);
        } catch (e) {
          console.warn("Failed to schedule notification", e);
        }
      }
      scheduledIdsRef.current = ids;
    },
    [cancelAll]
  );

  return { scheduleChain, cancelAll };
}
