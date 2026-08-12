import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { SESSIONS } from "../constants/sessions";

/**
 * Session picker screen — shows subject badge and session type cards.
 *
 * @param {{ subject: string, subjectColor: string, onStartSession: (key: string) => void, onGoBack: () => void }} props
 */
export default function SessionPickerScreen({
  subject,
  subjectColor,
  onStartSession,
  onOpenCustomSession,
  onGoBack,
}) {
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick a session</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Subject indicator ── */}
        <View style={styles.subjectBadge}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: subjectColor || "#4f8ef7" },
            ]}
          />
          <Text style={styles.subjectText}>{subject}</Text>
        </View>

        {/* ── Session cards ── */}
        {Object.entries(SESSIONS).map(([key, s]) => {
          const studyMins = s.phases
            .filter((p) => !p.isBreak)
            .reduce((a, p) => a + p.duration, 0);
          const breakMins = s.phases
            .filter((p) => p.isBreak)
            .reduce((a, p) => a + p.duration, 0);

          return (
            <TouchableOpacity
              key={key}
              style={styles.card}
              onPress={() => onStartSession(key)}
            >
              <Text style={styles.cardTitle}>{s.label}</Text>
              <Text style={styles.cardMeta}>
                {studyMins}m study · {breakMins}m breaks
              </Text>
              {s.phases.map((p, i) => (
                <View key={i} style={styles.phaseRow}>
                  <Text style={styles.phaseEmoji}>{p.emoji}</Text>
                  <Text
                    style={[
                      styles.phaseRowName,
                      p.isBreak && styles.phaseRowNameBreak,
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.phaseRowDuration,
                      p.isBreak && styles.phaseRowDurationBreak,
                    ]}
                  >
                    {p.duration}m
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          );
        })}

        {/* ── Custom Session Card ── */}
        <TouchableOpacity
          style={[styles.card, styles.customCard]}
          onPress={onOpenCustomSession}
        >
          <View style={styles.customCardHeader}>
            <Text style={styles.customCardEmoji}>🎨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Custom Session</Text>
              <Text style={styles.cardMeta}>
                Choose your own time, tasks & breaks
              </Text>
            </View>
            <Text style={styles.customArrow}>→</Text>
          </View>
        </TouchableOpacity>
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
  scroll: { alignItems: "center", padding: 24, paddingTop: 12 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  subjectText: {
    color: "#f0f6ff",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    marginBottom: 14,
  },
  cardTitle: {
    color: "#f0f6ff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: { color: "#556070", fontSize: 12, marginBottom: 12 },
  phaseRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  phaseEmoji: { fontSize: 13, marginRight: 8 },
  phaseRowName: { color: "#9ab", fontSize: 12, flex: 1 },
  phaseRowNameBreak: { color: "#445566", fontStyle: "italic" },
  phaseRowDuration: { color: "#4f8ef7", fontSize: 12, fontWeight: "600" },
  phaseRowDurationBreak: { color: "#445566" },
  customCard: {
    borderColor: "rgba(79, 142, 247, 0.4)",
    backgroundColor: "#131b26",
  },
  customCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  customCardEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  customArrow: {
    color: "#4f8ef7",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
  },
});
