import { useEffect, useRef, useCallback } from "react";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { loadSettings } from "../utils/storage";

const SOUND_FILES = {
  classic: require("../../assets/alarm_classic.wav"),
  chime: require("../../assets/alarm_chime.wav"),
  bell: require("../../assets/alarm_bell.wav"),
  marimba: require("../../assets/alarm_marimba.wav"),
};

/**
 * Hook that manages alarm sound playback using local bundled preset files.
 *
 * Uses expo-audio (expo-av was deprecated and dropped from SDK 54+). Imperative
 * players from createAudioPlayer do NOT release themselves, so we always tear
 * down the previous player before creating a new one, and again on unmount.
 */
export function useAlarmSound() {
  const playerRef = useRef(null);

  // Release the current player, if any. Safe to call repeatedly.
  const releaseCurrent = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        // Player may already be removed — nothing to do.
      }
      playerRef.current = null;
    }
  }, []);

  /**
   * Play the alarm sound for a given presetKey (or the default from settings).
   */
  const playAlarm = useCallback(
    async (presetKey) => {
      try {
        // expo-audio players don't auto-release — free the previous one first.
        releaseCurrent();

        let soundKey = presetKey;
        if (!soundKey) {
          const settings = await loadSettings();
          soundKey = settings.soundPreset || "classic";
        }

        const fileAsset = SOUND_FILES[soundKey] || SOUND_FILES.classic;

        const player = createAudioPlayer(fileAsset);
        playerRef.current = player;
        player.play();
      } catch (e) {
        console.warn("Could not play alarm sound", e);
      }
    },
    [releaseCurrent]
  );

  /**
   * Stop any currently playing alarm (e.g. a Settings sound preview).
   */
  const stopAlarm = useCallback(async () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {
        // Ignore — it gets released below regardless.
      }
    }
    releaseCurrent();
  }, [releaseCurrent]);

  // Configure the audio session once on mount; release the player on unmount.
  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
    }).catch((e) => console.warn("Failed to set audio mode", e));

    return () => {
      releaseCurrent();
    };
  }, [releaseCurrent]);

  return { playAlarm, stopAlarm };
}
