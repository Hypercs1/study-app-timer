import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import {
  loadSessions,
  clearSessions,
  deleteSession,
  updateSession,
  loadSubjects,
} from "../utils/storage";
import { useTheme } from "../theme/ThemeContext";

/**
 * Simple hook that runs a callback every time the component mounts.
 * Mimics React Navigation's useFocusEffect for our manual routing.
 */
function useOnMount(callback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(callback, []);
}

/**
 * Groups an array of session records by day label.
 * Returns an array of { label: string, sessions: Array } objects.
 */
function groupByDay(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = [];
  const map = new Map();

  for (const s of sessions) {
    const d = new Date(s.completedAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label;

    if (dayStart.getTime() === today.getTime()) {
      label = "Today";
    } else if (dayStart.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = dayStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year:
          dayStart.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }

    if (!map.has(label)) {
      const group = { label, sessions: [] };
      map.set(label, group);
      groups.push(group);
    }
    map.get(label).sessions.push(s);
  }

  return groups;
}

/**
 * Formats an ISO timestamp to a time string like "3:45 PM".
 */
function formatTimeOfDay(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * History screen — shows all completed sessions grouped by day.
 * Each session card shows its subject (with color dot) and
 * supports inline edit (subject) and delete.
 *
 * @param {{ onGoHome: () => void }} props
 */
export default function HistoryScreen({ onGoHome }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // Load sessions + subjects on mount
  useOnMount(() => {
    Promise.all([loadSessions(), loadSubjects()])
      .then(([sessData, subData]) => {
        setSessions(sessData);
        setSubjects(subData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  });

  // Build a map of subject name (lowercase) → color
  const subjectColorMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[s.name.toLowerCase()] = s.color;
    });
    return map;
  }, [subjects]);

  // ── Delete a single session ──
  const handleDelete = useCallback((id) => {
    Alert.alert(
      "Delete Session?",
      "This will permanently remove this session record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
          },
        },
      ]
    );
  }, []);

  // ── Inline edit: start ──
  const handleStartEdit = useCallback((session) => {
    setEditingId(session.id);
    setEditText(session.subject || "");
  }, []);

  // ── Inline edit: save ──
  const handleSaveEdit = useCallback(async () => {
    if (editingId && editText.trim()) {
      await updateSession(editingId, { subject: editText.trim() });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingId ? { ...s, subject: editText.trim() } : s
        )
      );
    }
    setEditingId(null);
    setEditText("");
  }, [editingId, editText]);

  // ── Inline edit: cancel ──
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  // ── Clear all history ──
  const handleClear = useCallback(() => {
    Alert.alert(
      "Clear History?",
      "This will permanently delete all your session records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearSessions();
            setSessions([]);
          },
        },
      ]
    );
  }, []);

  const groups = groupByDay(sessions);

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
        <Text style={styles.headerTitle}>📋 History</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && <Text style={styles.emptyText}>Loading...</Text>}

        {!loading && sessions.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Complete a study session to see it here!
            </Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.label} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{group.label}</Text>

            {group.sessions.map((s) => {
              const color =
                subjectColorMap[(s.subject || "").toLowerCase()] || theme.textMuted;
              const isEditing = editingId === s.id;

              return (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />

                    {isEditing ? (
                      /* ── Edit mode ── */
                      <View style={styles.editRow}>
                        <TextInput
                          style={styles.editInput}
                          value={editText}
                          onChangeText={setEditText}
                          onSubmitEditing={handleSaveEdit}
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={handleSaveEdit}
                          style={styles.editAction}
                          accessibilityRole="button"
                          accessibilityLabel="Save name"
                        >
                          <Text style={styles.editSave}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleCancelEdit}
                          style={styles.editAction}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel editing"
                        >
                          <Text style={styles.editCancel}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* ── Display mode ── */
                      <>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardSubject, { color }]}>
                            {s.subject || "No subject"}
                          </Text>
                          <Text style={styles.cardTitle}>{s.label}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleStartEdit(s)}
                          style={styles.iconBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Edit subject"
                        >
                          <Text style={styles.iconText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(s.id)}
                          style={styles.iconBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Delete session"
                        >
                          <Text style={styles.iconText}>🗑️</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {!isEditing && (
                    <>
                      <Text style={styles.cardMeta}>
                        {s.phasesCompleted} phase
                        {s.phasesCompleted !== 1 ? "s" : ""} ·{" "}
                        {s.actualStudyMins != null
                          ? `${Math.round(s.actualStudyMins)}m studied`
                          : `${s.totalStudyMins}m study`}
                        {s.completed === false && " · left early"}
                      </Text>
                      <Text style={styles.cardTime}>
                        {formatTimeOfDay(s.completedAt)}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {sessions.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>Clear History</Text>
          </TouchableOpacity>
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
    scroll: { padding: 20, paddingTop: 8 },
    emptyWrap: { alignItems: "center", marginTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: {
      color: t.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 6,
    },
    emptyText: {
      color: t.textMuted,
      fontSize: 13,
      textAlign: "center",
      maxWidth: 220,
    },
    dayGroup: { marginBottom: 20 },
    dayLabel: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    card: {
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    cardSubject: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 2,
    },
    cardTitle: { color: t.textPrimary, fontSize: 15, fontWeight: "700" },
    cardMeta: { color: t.textTertiary, fontSize: 12, marginBottom: 2, marginLeft: 20 },
    cardTime: { color: t.textMuted, fontSize: 11, marginLeft: 20 },
    iconBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    iconText: { fontSize: 14 },
    editRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    editInput: {
      flex: 1,
      color: t.textPrimary,
      fontSize: 14,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    editAction: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    editSave: { color: t.success, fontSize: 18, fontWeight: "700" },
    editCancel: { color: t.danger, fontSize: 18, fontWeight: "700" },
    clearBtn: {
      alignSelf: "center",
      borderWidth: 1,
      borderColor: t.danger,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 20,
      marginTop: 12,
      marginBottom: 32,
    },
    clearBtnText: {
      color: t.danger,
      fontSize: 12,
      fontWeight: "600",
    },
  });
