import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";

const PRESET_TAGS = [
  { name: "Deep Study", emoji: "📖", isBreak: false, tip: "Focused, deep work session." },
  { name: "Past Questions", emoji: "✏️", isBreak: false, tip: "Attempt practice questions." },
  { name: "Flashcards", emoji: "🃏", isBreak: false, tip: "Active recall review." },
  { name: "Card Making", emoji: "✍️", isBreak: false, tip: "Create new review cards." },
  { name: "Short Break", emoji: "☕", isBreak: true, tip: "Rest, stretch, grab water." },
  { name: "Long Break", emoji: "🛌", isBreak: true, tip: "Extended rest period." },
];

const TIME_PILLS = [15, 30, 45, 60, 90, 120];

/**
 * Custom Session Configurator Screen
 *
 * Allows user to:
 * 1. Choose overall session duration (in minutes).
 * 2. Add preset or custom tags (study tasks or breaks).
 * 3. Use sliders/+/- buttons to assign time per tag without exceeding total session duration.
 */
export default function CustomSessionScreen({
  subject,
  subjectColor,
  onStartCustomSession,
  onGoBack,
}) {
  const [totalMins, setTotalMins] = useState(30);
  const [customTotalInput, setCustomTotalInput] = useState("30");
  const [tasks, setTasks] = useState([
    {
      id: "1",
      name: "Deep Study",
      emoji: "📖",
      isBreak: false,
      duration: 30,
      tip: "Focused, deep work session.",
    },
  ]);

  const [customTagName, setCustomTagName] = useState("");
  const [isCustomBreak, setIsCustomBreak] = useState(false);

  // Total allocated duration across all tasks
  const allocatedMins = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  }, [tasks]);

  const remainingMins = useMemo(() => {
    return Math.max(0, totalMins - allocatedMins);
  }, [totalMins, allocatedMins]);

  // Handle changing total session duration
  const handleSetTotalMins = useCallback(
    (mins) => {
      const validMins = Math.max(1, Math.min(480, mins || 1));
      setTotalMins(validMins);
      setCustomTotalInput(String(validMins));

      // Scale or cap task durations if new total is smaller than current allocated
      setTasks((prevTasks) => {
        if (prevTasks.length === 0) return prevTasks;
        const currentTotal = prevTasks.reduce((s, t) => s + t.duration, 0);
        if (currentTotal <= validMins) return prevTasks;

        // Proportional scale down
        let leftover = validMins;
        return prevTasks.map((t, idx) => {
          if (idx === prevTasks.length - 1) {
            return { ...t, duration: Math.max(1, leftover) };
          }
          const scaled = Math.max(1, Math.floor((t.duration / currentTotal) * validMins));
          leftover -= scaled;
          return { ...t, duration: scaled };
        });
      });
    },
    []
  );

  // Add a task (preset or custom)
  const handleAddTask = useCallback(
    (preset) => {
      const taskName = preset ? preset.name : customTagName.trim();
      if (!taskName) return;

      const isBreak = preset ? preset.isBreak : isCustomBreak;
      const emoji = preset ? preset.emoji : isBreak ? "☕" : "🎯";
      const tip = preset ? preset.tip : isBreak ? "Take a rest." : "Focused work.";

      setTasks((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: String(Date.now()),
              name: taskName,
              emoji,
              isBreak,
              duration: totalMins,
              tip,
            },
          ];
        }

        // Available space or default 5 mins
        const available = Math.max(0, totalMins - prev.reduce((s, t) => s + t.duration, 0));
        const newDuration = available > 0 ? available : 5;

        // If no available space, reduce the last task's time to make room for new task
        let updatedPrev = [...prev];
        if (available <= 0 && updatedPrev.length > 0) {
          const lastIndex = updatedPrev.length - 1;
          const lastTask = updatedPrev[lastIndex];
          if (lastTask.duration > newDuration) {
            updatedPrev[lastIndex] = {
              ...lastTask,
              duration: lastTask.duration - newDuration,
            };
          }
        }

        return [
          ...updatedPrev,
          {
            id: String(Date.now()),
            name: taskName,
            emoji,
            isBreak,
            duration: newDuration,
            tip,
          },
        ];
      });

      if (!preset) {
        setCustomTagName("");
      }
    },
    [customTagName, isCustomBreak, totalMins]
  );

  // Remove a task
  const handleRemoveTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update a single task's duration from slider or button
  const handleTaskDurationChange = useCallback(
    (id, newDuration) => {
      setTasks((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target) return prev;

        const otherTotal = prev
          .filter((t) => t.id !== id)
          .reduce((sum, t) => sum + t.duration, 0);

        // Cap at totalMins - otherTotal
        const maxAllowed = Math.max(1, totalMins - otherTotal);
        const clamped = Math.max(1, Math.min(maxAllowed, Math.round(newDuration)));

        return prev.map((t) => (t.id === id ? { ...t, duration: clamped } : t));
      });
    },
    [totalMins]
  );

  // Start the custom session
  const handleStart = useCallback(() => {
    if (tasks.length === 0) {
      Alert.alert("No Tasks", "Please add at least one study task or break to your session.");
      return;
    }

    const phases = tasks.map((t) => ({
      name: t.name,
      duration: t.duration,
      emoji: t.emoji,
      isBreak: t.isBreak,
      tip: t.tip,
    }));

    const sessionObj = {
      label: `Custom Session (${totalMins}m)`,
      phases,
    };

    onStartCustomSession(sessionObj);
  }, [tasks, totalMins, onStartCustomSession]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Custom Session</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Subject Indicator ── */}
        <View style={styles.subjectBadge}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: subjectColor || "#4f8ef7" },
            ]}
          />
          <Text style={styles.subjectText}>{subject}</Text>
        </View>

        {/* ── Section 1: Total Duration ── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>1. Set Total Time</Text>
          <View style={styles.pillRow}>
            {TIME_PILLS.map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.timePill,
                  totalMins === mins && styles.timePillActive,
                ]}
                onPress={() => handleSetTotalMins(mins)}
              >
                <Text
                  style={[
                    styles.timePillText,
                    totalMins === mins && styles.timePillTextActive,
                  ]}
                >
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customInputRow}>
            <Text style={styles.inputLabel}>Or type minutes:</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={customTotalInput}
              onChangeText={(val) => {
                setCustomTotalInput(val);
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  handleSetTotalMins(parsed);
                }
              }}
            />
            <Text style={styles.unitText}>mins</Text>
          </View>
        </View>

        {/* ── Section 2: Add Tasks / Tags ── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>2. Add Tasks & Breaks</Text>

          <Text style={styles.subLabel}>Quick Presets:</Text>
          <View style={styles.tagGrid}>
            {PRESET_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.name}
                style={[
                  styles.presetTag,
                  tag.isBreak && styles.presetTagBreak,
                ]}
                onPress={() => handleAddTask(tag)}
              >
                <Text style={styles.presetTagEmoji}>{tag.emoji}</Text>
                <Text style={styles.presetTagText}>{tag.name}</Text>
                <Text style={styles.addPlus}>+</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.subLabel, { marginTop: 14 }]}>Or Create Custom Tag:</Text>
          <View style={styles.customTagRow}>
            <TextInput
              style={[styles.textInput, { flex: 1, marginRight: 8 }]}
              placeholder="e.g. Solve 5 problems"
              placeholderTextColor="#556070"
              value={customTagName}
              onChangeText={setCustomTagName}
            />
            <TouchableOpacity
              style={[
                styles.typeToggle,
                isCustomBreak && styles.typeToggleBreak,
              ]}
              onPress={() => setIsCustomBreak((b) => !b)}
            >
              <Text style={styles.typeToggleText}>
                {isCustomBreak ? "☕ Break" : "📖 Study"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCustomBtn}
              onPress={() => handleAddTask(null)}
            >
              <Text style={styles.addCustomBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 3: Time Allocation (Sliders) ── */}
        <View style={styles.card}>
          <View style={styles.allocationHeader}>
            <Text style={styles.cardHeader}>3. Adjust Task Durations</Text>
            <Text
              style={[
                styles.allocationSummary,
                allocatedMins === totalMins ? styles.allocPerfect : styles.allocWarn,
              ]}
            >
              {allocatedMins}m / {totalMins}m
            </Text>
          </View>

          {remainingMins > 0 && (
            <Text style={styles.remainingHint}>
              💡 You have {remainingMins}m remaining to assign.
            </Text>
          )}

          {tasks.length === 0 ? (
            <Text style={styles.emptyTasksText}>No tasks added yet. Tap a tag above to add one!</Text>
          ) : (
            tasks.map((t, idx) => (
              <View key={t.id} style={styles.taskItem}>
                <View style={styles.taskTopRow}>
                  <Text style={styles.taskEmoji}>{t.emoji}</Text>
                  <Text style={styles.taskName}>{t.name}</Text>
                  <Text style={[styles.taskDurationText, t.isBreak && styles.breakText]}>
                    {t.duration}m
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveTask(t.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Slider + Stepper Controls */}
                <View style={styles.sliderRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleTaskDurationChange(t.id, t.duration - 1)}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>

                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={totalMins}
                    step={1}
                    value={t.duration}
                    minimumTrackTintColor={t.isBreak ? "#778899" : "#4f8ef7"}
                    maximumTrackTintColor="#1e2a38"
                    thumbTintColor={t.isBreak ? "#aab4c8" : "#4f8ef7"}
                    onValueChange={(val) => handleTaskDurationChange(t.id, val)}
                  />

                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleTaskDurationChange(t.id, t.duration + 1)}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Start Button ── */}
        <TouchableOpacity
          style={[styles.startBtn, tasks.length === 0 && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={tasks.length === 0}
        >
          <Text style={styles.startBtnText}>Start Custom Session ({totalMins}m) ▶</Text>
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
  scroll: { padding: 20, paddingTop: 10 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  subjectText: { color: "#f0f6ff", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    color: "#f0f6ff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  timePill: {
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  timePillActive: {
    backgroundColor: "#4f8ef7",
    borderColor: "#4f8ef7",
  },
  timePillText: { color: "#9ab", fontSize: 13, fontWeight: "600" },
  timePillTextActive: { color: "#fff" },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  inputLabel: { color: "#556070", fontSize: 13, marginRight: 10 },
  textInput: {
    color: "#f0f6ff",
    fontSize: 14,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitText: { color: "#556070", fontSize: 13, marginLeft: 8 },
  subLabel: { color: "#9ab", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetTagBreak: {
    borderColor: "rgba(119, 136, 153, 0.4)",
  },
  presetTagEmoji: { fontSize: 13, marginRight: 6 },
  presetTagText: { color: "#f0f6ff", fontSize: 12, fontWeight: "500", marginRight: 6 },
  addPlus: { color: "#4f8ef7", fontSize: 14, fontWeight: "700" },
  customTagRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeToggle: {
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  typeToggleBreak: {
    borderColor: "#778899",
  },
  typeToggleText: { color: "#9ab", fontSize: 12 },
  addCustomBtn: {
    backgroundColor: "#4f8ef7",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addCustomBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  allocationSummary: { fontSize: 13, fontWeight: "700" },
  allocPerfect: { color: "#4caf6e" },
  allocWarn: { color: "#e0a030" },
  remainingHint: { color: "#4f8ef7", fontSize: 12, marginBottom: 10 },
  emptyTasksText: { color: "#556070", fontSize: 13, fontStyle: "italic", textAlign: "center", marginVertical: 12 },
  taskItem: {
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  taskEmoji: { fontSize: 15, marginRight: 8 },
  taskName: { color: "#f0f6ff", fontSize: 14, fontWeight: "600", flex: 1 },
  taskDurationText: { color: "#4f8ef7", fontSize: 14, fontWeight: "700", marginRight: 10 },
  breakText: { color: "#778899" },
  deleteBtn: { padding: 4 },
  deleteText: { color: "#e06070", fontSize: 14, fontWeight: "700" },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBtn: {
    backgroundColor: "#1e2a38",
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#f0f6ff", fontSize: 16, fontWeight: "700" },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  startBtn: {
    backgroundColor: "#4f8ef7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  startBtnDisabled: {
    backgroundColor: "#1e2a38",
    opacity: 0.5,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
