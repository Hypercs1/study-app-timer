import React, { useState, useEffect, useCallback } from "react";
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
 * Settings Screen — Sound selection, live audio previews, and future setting placeholders.
 */
export default function SettingsScreen({ onGoHome }) {
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
        <TouchableOpacity onPress={onGoHome} style={styles.backBtn}>
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
                  trackColor={{ false: "#1e2a38", true: "#4f8ef7" }}
                  thumbColor="#fff"
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
                  trackColor={{ false: "#1e2a38", true: "#4f8ef7" }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* ── Section 3: App Theme (Future Customization Placeholder) ── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🎨 App Theme</Text>
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>Customization</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Select your visual color palette preference.
              </Text>

              <View style={styles.themeRow}>
                <TouchableOpacity style={[styles.themePill, styles.themePillActive]}>
                  <Text style={styles.themePillEmoji}>🌙</Text>
                  <Text style={styles.themePillTextActive}>Dark Mode</Text>
                  <Text style={styles.checkIcon}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.themePillDisabled}>
                  <Text style={styles.themePillEmoji}>☀️</Text>
                  <Text style={styles.themePillText}>Light</Text>
                  <Text style={styles.miniSoon}>Soon</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.themePillDisabled}>
                  <Text style={styles.themePillEmoji}>🖤</Text>
                  <Text style={styles.themePillText}>OLED Black</Text>
                  <Text style={styles.miniSoon}>Soon</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d14" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtnText: { color: "#aab4c8", fontSize: 18 },
  headerTitle: { color: "#f0f6ff", fontSize: 16, fontWeight: "700" },
  spacer: { width: 40 },
  scroll: { padding: 20, paddingTop: 10 },
  loadingText: { color: "#556070", fontSize: 14, textAlign: "center", marginTop: 40 },
  sectionCard: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: { color: "#f0f6ff", fontSize: 15, fontWeight: "700" },
  sectionSubtitle: { color: "#556070", fontSize: 12, marginTop: 4, marginBottom: 14 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  soonBadge: {
    backgroundColor: "#1e2a38",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  soonText: { color: "#4f8ef7", fontSize: 10, fontWeight: "700" },
  soundOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  soundOptionRowSelected: {
    borderColor: "#4f8ef7",
    backgroundColor: "#131c28",
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
    borderColor: "#556070",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioCircleSelected: { borderColor: "#4f8ef7" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4f8ef7" },
  optionEmoji: { fontSize: 18, marginRight: 10 },
  optionName: { color: "#9ab", fontSize: 14, fontWeight: "600" },
  optionNameSelected: { color: "#f0f6ff" },
  optionDesc: { color: "#556070", fontSize: 11, marginTop: 2 },
  testBtn: {
    backgroundColor: "#1e2a38",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  testBtnPlaying: {
    backgroundColor: "#e06070",
  },
  testBtnText: { color: "#f0f6ff", fontSize: 12, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2a38",
  },
  toggleTitle: { color: "#f0f6ff", fontSize: 14, fontWeight: "600" },
  toggleDesc: { color: "#556070", fontSize: 11, marginTop: 2, paddingRight: 12 },
  themeRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  themePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1117",
    borderWidth: 1.5,
    borderColor: "#4f8ef7",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  themePillActive: { backgroundColor: "#131c28" },
  themePillDisabled: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    opacity: 0.5,
  },
  themePillEmoji: { fontSize: 14, marginRight: 6 },
  themePillText: { color: "#556070", fontSize: 12, fontWeight: "600" },
  themePillTextActive: { color: "#f0f6ff", fontSize: 12, fontWeight: "700" },
  checkIcon: { color: "#4f8ef7", fontSize: 12, fontWeight: "700", marginLeft: 4 },
  miniSoon: { color: "#556070", fontSize: 9, marginLeft: 4 },
});
