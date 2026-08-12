import { useEffect, useRef, useCallback } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidAudioContentType } from "expo-notifications";

// Show alert + play sound even when the app is in the foreground or locked
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Hook that manages notification permissions, Android channel setup,
 * and scheduling/cancelling phase-end notifications.
 */
export function useNotifications() {
  const scheduledNotifIdRef = useRef(null);

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

  // ── Create Android notification channel ──
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("study-timer-alarm", {
        name: "Study Timer Alarms",
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#4f8ef7",
        sound: "default",
        audioAttributes: {
          usage: AndroidAudioContentType.ALARM,
          contentType: AndroidAudioContentType.SONIFICATION,
        },
        bypassDnd: true,
      });
    }
  }, []);

  /**
   * Schedule a native notification that fires after `secondsFromNow`,
   * even if the app is backgrounded or the screen is locked.
   */
  const scheduleEndNotification = useCallback(
    async (phaseName, secondsFromNow) => {
      // Cancel any previously scheduled notification first
      if (scheduledNotifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(
          scheduledNotifIdRef.current
        ).catch(() => {});
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Study Timer ⏰",
          body: `"${phaseName}" complete! Time for the next phase.`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && {
            channelId: "study-timer-alarm",
          }),
        },
        trigger: {
          type: "timeInterval",
          seconds: Math.max(secondsFromNow, 1),
          repeats: false,
        },
      });

      scheduledNotifIdRef.current = id;
    },
    []
  );

  /**
   * Cancel any currently scheduled notification.
   */
  const cancelScheduledNotification = useCallback(async () => {
    if (scheduledNotifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(
        scheduledNotifIdRef.current
      ).catch(() => {});
      scheduledNotifIdRef.current = null;
    }
  }, []);

  return { scheduleEndNotification, cancelScheduledNotification };
}
