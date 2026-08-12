import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { loadSessions, loadSubjects } from "../utils/storage";

const TABS = ["Day", "Week", "Month", "All"];

/**
 * Returns midnight of the given date.
 */
function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Returns the cutoff date for the given tab.
 */
function getFilterDate(tab) {
  const now = new Date();
  switch (tab) {
    case "Day":
      return getStartOfDay(now);
    case "Week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "Month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    default:
      return new Date(0); // All time
  }
}

/**
 * Formats a number of minutes as "Xh Ym" or just "Xm".
 */
function formatDuration(mins) {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Stats screen — shows study time per subject with Day/Week/Month/All tabs.
 *
 * @param {{ onGoHome: () => void }} props
 */
export default function StatsScreen({ onGoHome }) {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState("Week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadSessions(), loadSubjects()])
      .then(([sessData, subData]) => {
        setSessions(sessData);
        setSubjects(subData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build a map of subject name (lowercase) → color
  const subjectColorMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[s.name.toLowerCase()] = s.color;
    });
    return map;
  }, [subjects]);

  // Calculate stats for the active tab
  const stats = useMemo(() => {
    const cutoff = getFilterDate(activeTab);
    const filtered = sessions.filter((s) => {
      const d = new Date(s.completedAt || s.startedAt);
      return d >= cutoff;
    });

    const bySubject = {};
    let totalMins = 0;

    filtered.forEach((s) => {
      const subject = s.subject || "Unspecified";
      const mins =
        s.actualStudyMins != null ? s.actualStudyMins : s.totalStudyMins || 0;
      if (!bySubject[subject]) {
        bySubject[subject] = { name: subject, mins: 0, sessions: 0 };
      }
      bySubject[subject].mins += mins;
      bySubject[subject].sessions += 1;
      totalMins += mins;
    });

    const sorted = Object.values(bySubject).sort((a, b) => b.mins - a.mins);
    return { subjects: sorted, totalMins, totalSessions: filtered.length };
  }, [sessions, activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoHome} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Stats</Text>
        <View style={styles.spacer} />
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && <Text style={styles.emptyText}>Loading...</Text>}

        {!loading && stats.subjects.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>
              Complete some study sessions to see your stats here!
            </Text>
          </View>
        )}

        {!loading && stats.subjects.length > 0 && (
          <>
            {/* ── Total summary card ── */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total study time</Text>
              <Text style={styles.totalValue}>
                {formatDuration(stats.totalMins)}
              </Text>
              <Text style={styles.totalSub}>
                {stats.totalSessions} session
                {stats.totalSessions !== 1 ? "s" : ""}
              </Text>
            </View>

            {/* ── Per-subject breakdown ── */}
            {stats.subjects.map((s) => {
              const color =
                subjectColorMap[s.name.toLowerCase()] || "#556070";
              const pct =
                stats.totalMins > 0 ? (s.mins / stats.totalMins) * 100 : 0;

              return (
                <View key={s.name} style={styles.subjectCard}>
                  <View style={styles.subjectTop}>
                    <View
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />
                    <Text style={styles.subjectName}>{s.name}</Text>
                    <Text style={[styles.subjectTime, { color }]}>
                      {formatDuration(s.mins)}
                    </Text>
                  </View>

                  {/* Mini progress bar (proportion of total) */}
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.subjectMeta}>
                    {s.sessions} session{s.sessions !== 1 ? "s" : ""} ·{" "}
                    {Math.round(pct)}% of total
                  </Text>
                </View>
              );
            })}
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
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#131920",
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#1e2a38",
  },
  tabText: {
    color: "#556070",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#f0f6ff",
  },
  scroll: { padding: 20, paddingTop: 12 },
  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    color: "#f0f6ff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#556070",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 220,
  },
  totalCard: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    color: "#556070",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: {
    color: "#f0f6ff",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 4,
  },
  totalSub: {
    color: "#556070",
    fontSize: 12,
    marginTop: 4,
  },
  subjectCard: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  subjectTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  subjectName: {
    color: "#f0f6ff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  subjectTime: {
    fontSize: 15,
    fontWeight: "700",
  },
  barBg: {
    backgroundColor: "rgba(255,255,255,0.06)",
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  subjectMeta: {
    color: "#556070",
    fontSize: 11,
  },
});
