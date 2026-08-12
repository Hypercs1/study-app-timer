import { useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";

/**
 * Hook that manages alarm sound playback using a local bundled file.
 * Properly unloads previous sounds to prevent resource leaks.
 */
export function useAlarmSound() {
  const soundRef = useRef(null);

  /**
   * Play the alarm sound. Unloads any previous instance first
   * to avoid orphaned audio resources.
   */
  const playAlarm = useCallback(async () => {
    try {
      // Unload previous sound if it exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/alarm.wav"),
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  }, []);

  // Set audio mode configuration on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((e) => console.warn("Failed to set audio mode", e));

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return { playAlarm };
}
