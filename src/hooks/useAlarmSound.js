import { useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { loadSettings } from "../utils/storage";

const SOUND_FILES = {
  classic: require("../../assets/alarm_classic.wav"),
  chime: require("../../assets/alarm_chime.wav"),
  bell: require("../../assets/alarm_bell.wav"),
  marimba: require("../../assets/alarm_marimba.wav"),
};

/**
 * Hook that manages alarm sound playback using local bundled preset files.
 * Properly unloads previous sounds to prevent resource leaks.
 */
export function useAlarmSound() {
  const soundRef = useRef(null);

  /**
   * Play the alarm sound for a given presetKey (or default from settings).
   */
  const playAlarm = useCallback(async (presetKey) => {
    try {
      // Stop and unload any playing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      let soundKey = presetKey;
      if (!soundKey) {
        const settings = await loadSettings();
        soundKey = settings.soundPreset || "classic";
      }

      const fileAsset = SOUND_FILES[soundKey] || SOUND_FILES.classic;

      const { sound } = await Audio.Sound.createAsync(fileAsset, {
        shouldPlay: true,
      });
      soundRef.current = sound;
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  }, []);

  /**
   * Stop any currently playing alarm preview.
   */
  const stopAlarm = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
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

  return { playAlarm, stopAlarm };
}
