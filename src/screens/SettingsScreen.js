import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from "react-native";
import { loadSettings, saveSettings } from "../utils/storage";
import { useAlarmSound } from "../hooks/useAlarmSound";
import { useTheme } from "../theme/ThemeContext";
import { THEME_OPTIONS } from "../theme/themes";

const SOUND_OPTIONS = [
  {
    key: "classic",
    name: "Classic Beep",
    emoji: "⏰",
    desc: "Digital 880Hz alarm tone",
  },
  {
    key: "chime",
    name: "Pleasant Chime",
    emoji: "🔔",
    desc: "Soft 3-note rising chime",
  },
  {
    key: "bell",
    name: "Resonant Bell",
    emoji: "🎐",
    desc: "Deep bell tone with long decay",
  },
  {
    key: "marimba",
    name: "Marimba Melody",
    emoji: "🎵",
    desc: "Warm acoustic wooden notes",
  },
];

/**
 * Settings Screen — sound selection with live audio previews, behavior toggles,
 * and live theme switching.
 */
export default function SettingsScreen({ onGoHome }) {
  const { theme, themeName, setThemeName } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [settings, setSettingsState] = useState({
    soundPreset: "classic",
    vibrate: true,
    keepAwake: true,
    theme: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [playingPreset, setPlayingPreset] = useState(null);

  const { playAlarm, stopAlarm } = useAlarmSound();

  // Load saved settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettingsState(s);
      setLoading(false);
    });
  }, []);

  // Update a single setting field and persist
  const updateSetting = useCallback(async (key, value) => {
    setSettingsState((prev) => {
      const updated = { ...prev, [key]: value };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Test sound preview
  const handleTestSound = useCallback(
    async (presetKey) => {
      if (playingPreset === presetKey) {
        await stopAlarm();
        setPlayingPreset(null);
      } else {
        setPlayingPreset(presetKey);
        await playAlarm(presetKey);
      }
    },
    [playingPreset, playAlarm, stopAlarm]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoHome}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <Text style={styles.loadingText}>Loading settings...</Text>
        ) : (
          <>
            {/* ── Section 1: Notification Sound ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🔔 Notification Alarm Sound</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the sound that plays when your study phase or break finishes.
              </Text>

              {SOUND_OPTIONS.map((opt) => {
                const isSelected = settings.soundPreset === opt.key;
                const isPlaying = playingPreset === opt.key;

                return (
                  <View
                    key={opt.key}
                    style={[
                      styles.soundOptionRow,
                      isSelected && styles.soundOptionRowSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.soundSelectArea}
                      onPress={() => updateSetting("soundPreset", opt.key)}
                      accessibilityRole="radio"
                      accessibilityLabel={`${opt.name}. ${opt.desc}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionName,
                            isSelected && styles.optionNameSelected,
                          ]}
                        >
                          {opt.name}
                        </Text>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Test Sound Preview Button */}
                    <TouchableOpacity
                      style={[
                        styles.testBtn,
                        isPlaying && styles.testBtnPlaying,
                      ]}
                      onPress={() => handleTestSound(opt.key)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying ? `Stop ${opt.name} preview` : `Preview ${opt.name}`
                      }
                    >
                      <Text style={styles.testBtnText}>
                        {isPlaying ? "⏹ Stop" : "🔊 Preview"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* ── Section 2: Vibrate & Keep Awake Toggles ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚡ Behavior & Controls</Text>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Vibration & Haptics</Text>
                  <Text style={styles.toggleDesc}>
                    Vibrate phone when alarm sounds or buttons are pressed
                  </Text>
                </View>
                <Switch
                  value={settings.vibrate}
                  onValueChange={(val) => updateSetting("vibrate", val)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.onAccent}
                  accessibilityLabel="Vibration and haptics"
                  accessibilityState={{ checked: settings.vibrate }}
                />
              </View>

              <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Keep Screen Awake</Text>
                  <Text style={styles.toggleDesc}>
                    Prevent screen from turning off automatically while timer runs
                  </Text>
                </View>
                <Switch
                  value={settings.keepAwake}
                  onValueChange={(val) => updateSetting("keepAwake", val)}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.onAccent}
                  accessibilityLabel="Keep screen awake"
                  accessibilityState={{ checked: settings.keepAwake }}
                />
              </View>
            </View>

            {/* ── Section 3: App Theme ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🎨 App Theme</Text>
              <Text style={styles.sectionSubtitle}>
                Select your visual color palette. Changes apply instantly.
              </Text>

              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((opt) => {
                  const isActive = themeName === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.themePill, isActive && styles.themePillActive]}
                      onPress={() => setThemeName(opt.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`${opt.name} theme`}
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={styles.themePillEmoji}>{opt.emoji}</Text>
                      <Text
                        style={isActive ? styles.themePillTextActive : styles.themePillText}
                      >
                        {opt.name}
                      </Text>
                      {isActive && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: {
      backgroundColor: t.hairline,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    backBtnText: { color: t.textSecondary, fontSize: 18 },
    headerTitle: { color: t.textPrimary, fontSize: 16, fontWeight: "700" },
    spacer: { width: 40 },
    scroll: { padding: 20, paddingTop: 10 },
    loadingText: { color: t.textMuted, fontSize: 14, textAlign: "center", marginTop: 40 },
    sectionCard: {
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
    },
    sectionTitle: { color: t.textPrimary, fontSize: 15, fontWeight: "700" },
    sectionSubtitle: { color: t.textMuted, fontSize: 12, marginTop: 4, marginBottom: 14 },
    soundOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    soundOptionRowSelected: {
      borderColor: t.accent,
      backgroundColor: t.surfaceActive,
    },
    soundSelectArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: t.textMuted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    radioCircleSelected: { borderColor: t.accent },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent },
    optionEmoji: { fontSize: 18, marginRight: 10 },
    optionName: { color: t.textTertiary, fontSize: 14, fontWeight: "600" },
    optionNameSelected: { color: t.textPrimary },
    optionDesc: { color: t.textMuted, fontSize: 11, marginTop: 2 },
    testBtn: {
      backgroundColor: t.border,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginLeft: 8,
    },
    testBtnPlaying: {
      backgroundColor: t.danger,
    },
    testBtnText: { color: t.textPrimary, fontSize: 12, fontWeight: "600" },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    toggleTitle: { color: t.textPrimary, fontSize: 14, fontWeight: "600" },
    toggleDesc: { color: t.textMuted, fontSize: 11, marginTop: 2, paddingRight: 12 },
    themeRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    themePill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.surfaceAlt,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    themePillActive: {
      backgroundColor: t.surfaceActive,
      borderColor: t.accent,
    },
    themePillEmoji: { fontSize: 14, marginRight: 6 },
    themePillText: { color: t.textMuted, fontSize: 12, fontWeight: "600" },
    themePillTextActive: { color: t.textPrimary, fontSize: 12, fontWeight: "700" },
    checkIcon: { color: t.accent, fontSize: 12, fontWeight: "700", marginLeft: 4 },
  });
