import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

/**
 * Home screen — landing page with Start, Stats, History, and Settings buttons.
 *
 * @param {{ onStartStudying: () => void, onViewStats: () => void, onViewHistory: () => void, onViewSettings: () => void }} props
 */
export default function HomeScreen({
  onStartStudying,
  onViewStats,
  onViewHistory,
  onViewSettings,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrap}>
        <Text style={styles.emoji}>⏱️</Text>
        <Text style={styles.title}>Study Timer</Text>
        <Text style={styles.subtitle}>
          Track your learning, one session at a time
        </Text>

        <TouchableOpacity style={styles.startBtn} onPress={onStartStudying}>
          <Text style={styles.startBtnText}>Start Studying</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onViewStats}>
            <Text style={styles.secondaryBtnText}>📊 Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onViewHistory}>
            <Text style={styles.secondaryBtnText}>📋 History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onViewSettings}>
            <Text style={styles.secondaryBtnText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    wrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    emoji: { fontSize: 56, marginBottom: 12 },
    title: { color: t.textPrimary, fontSize: 28, fontWeight: "800" },
    subtitle: {
      color: t.textMuted,
      fontSize: 14,
      marginTop: 8,
      textAlign: "center",
      maxWidth: 260,
      marginBottom: 36,
    },
    startBtn: {
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 48,
      marginBottom: 20,
    },
    startBtnText: {
      color: t.onAccent,
      fontSize: 17,
      fontWeight: "700",
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 10,
    },
    secondaryBtn: {
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    secondaryBtnText: {
      color: t.textTertiary,
      fontSize: 13,
      fontWeight: "600",
    },
  });
