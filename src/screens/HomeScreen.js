import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

/**
 * Home screen — simple landing page with Start, Stats, and History buttons.
 *
 * @param {{ onStartStudying: () => void, onViewStats: () => void, onViewHistory: () => void }} props
 */
export default function HomeScreen({ onStartStudying, onViewStats, onViewHistory }) {
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090d14" },
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { color: "#f0f6ff", fontSize: 28, fontWeight: "800" },
  subtitle: {
    color: "#556070",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 260,
    marginBottom: 36,
  },
  startBtn: {
    backgroundColor: "#4f8ef7",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 20,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  secondaryBtnText: {
    color: "#9ab",
    fontSize: 14,
    fontWeight: "600",
  },
});
