import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { saveSession } from "../utils/storage";

/**
 * Done screen — shown after completing all phases of a session.
 * Saves the session (with subject) to local storage on mount.
 *
 * @param {{ session: Object, sessionMeta: Object, onGoHome: () => void }} props
 */
export default function DoneScreen({ session, sessionMeta, onGoHome }) {
  const phases = session?.phases || [];
  const [saved, setSaved] = useState(false);
  const didSaveRef = useRef(false);

  // Save session to local storage (runs once on mount)
  useEffect(() => {
    if (didSaveRef.current) return;
    didSaveRef.current = true;

    const studyPhases = phases.filter((p) => !p.isBreak);
    const totalStudyMins = studyPhases.reduce((a, p) => a + p.duration, 0);

    saveSession({
      sessionType: sessionMeta?.sessionKey || "unknown",
      label: session.label,
      subject: sessionMeta?.subject || "Unspecified",
      startedAt: sessionMeta?.startedAt || new Date().toISOString(),
      phasesCompleted: studyPhases.length,
      totalStudyMins,
      actualStudyMins: sessionMeta?.actualStudyMins != null ? sessionMeta.actualStudyMins : totalStudyMins,
      completed: true,
    })
      .then(() => setSaved(true))
      .catch((e) => console.warn("Failed to save session:", e));
  }, [session, sessionMeta, phases]);

  const subjectName = sessionMeta?.subject;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Session Complete!</Text>

        {subjectName && (
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectText}>{subjectName}</Text>
          </View>
        )}

        <Text style={styles.subtitle}>
          You finished your full {session.label}. Take a real rest before the
          next one.
        </Text>

        <View style={styles.list}>
          {phases
            .filter((p) => !p.isBreak)
            .map((p, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.check}>✅</Text>
                <Text style={styles.rowText}>{p.name}</Text>
              </View>
            ))}
        </View>

        {saved && (
          <Text style={styles.savedText}>✅ Saved to history</Text>
        )}

        <TouchableOpacity style={styles.homeButton} onPress={onGoHome}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
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
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: "#f0f6ff", fontSize: 24, fontWeight: "800" },
  subjectBadge: {
    backgroundColor: "#131920",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  subjectText: {
    color: "#4f8ef7",
    fontSize: 13,
    fontWeight: "700",
  },
  subtitle: {
    color: "#556070",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 260,
  },
  list: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    marginBottom: 28,
    width: "100%",
    maxWidth: 300,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  check: { fontSize: 15, marginRight: 10 },
  rowText: { color: "#9ab", fontSize: 13 },
  savedText: {
    color: "#4caf6e",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
  },
  homeButton: {
    backgroundColor: "#4f8ef7",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 34,
  },
  homeButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
