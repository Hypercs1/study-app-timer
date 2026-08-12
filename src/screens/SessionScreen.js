import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { studyColors, breakColor } from "../constants/sessions";
import { formatTime } from "../utils/formatTime";
import { useTimer } from "../hooks/useTimer";
import { useNotifications } from "../hooks/useNotifications";
import { useAlarmSound } from "../hooks/useAlarmSound";

/**
 * Session screen — timer, controls, progress, and tips.
 * Owns its own timer/notification/sound lifecycle; cleans up on unmount.
 *
 * @param {{ session: Object, onGoHome: () => void, onComplete: (meta: Object) => void }} props
 */
export default function SessionScreen({ session, subject, subjectColor, onGoHome, onComplete, onPartialQuit }) {
  // Keep screen awake during the entire session
  useKeepAwake();

  const phases = session.phases;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const phase = phases[phaseIndex] || null;

  // Track when the user first presses play (for session history)
  const startedAtRef = useRef(null);

  // Accumulates actual study seconds across all phases
  // (only counts time actually elapsed, not skipped time)
  const actualStudySecsRef = useRef(0);

  const { scheduleEndNotification, cancelScheduledNotification } =
    useNotifications();
  const { playAlarm } = useAlarmSound();

  // ── Timer ──
  const handlePhaseComplete = useCallback(() => {
    playAlarm();
  }, [playAlarm]);

  const { secondsLeft, running, setRunning, loadDuration, stop } = useTimer({
    onComplete: handlePhaseComplete,
  });

  // Load first phase duration on mount
  useEffect(() => {
    loadDuration(phases[0].duration * 60);
  }, [loadDuration, phases]);

  // ── Schedule / cancel notification when running state changes ──
  useEffect(() => {
    if (running && phase) {
      scheduleEndNotification(phase.name, secondsLeft);
    } else {
      cancelScheduledNotification();
    }
    // Only fire when running toggles — secondsLeft and phase are current at toggle time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ── Memoized color calculation (avoids re-computing every second) ──
  const color = useMemo(() => {
    if (!phase) return studyColors[0];
    if (phase.isBreak) return breakColor;
    const studyIdx =
      phases.slice(0, phaseIndex + 1).filter((p) => !p.isBreak).length - 1;
    return studyColors[studyIdx % studyColors.length];
  }, [phase, phaseIndex, phases]);

  // ── Memoized progress calculation ──
  const totalStudySecs = useMemo(
    () =>
      phases
        .filter((p) => !p.isBreak)
        .reduce((a, p) => a + p.duration * 60, 0),
    [phases]
  );

  const elapsedStudySecs =
    phases
      .slice(0, phaseIndex)
      .filter((p) => !p.isBreak)
      .reduce((a, p) => a + p.duration * 60, 0) +
    (phase && !phase.isBreak ? phase.duration * 60 - secondsLeft : 0);

  const progress =
    totalStudySecs > 0 ? Math.min(elapsedStudySecs / totalStudySecs, 1) : 0;

  const isBreakPhase = phase?.isBreak;
  const studyPhaseCount = phases.filter((p) => !p.isBreak).length;
  const currentStudyNum = phases
    .slice(0, phaseIndex + 1)
    .filter((p) => !p.isBreak).length;

  // ── Phase navigation ──
  const goToPhase = useCallback(
    (idx) => {
      // Accumulate actual study time from the current phase before switching
      if (phase && !phase.isBreak) {
        const spent = phase.duration * 60 - secondsLeft;
        actualStudySecsRef.current += Math.max(0, spent);
      }

      cancelScheduledNotification();
      setPhaseIndex(idx);
      loadDuration(phases[idx].duration * 60);
      setShowTip(false);
    },
    [cancelScheduledNotification, loadDuration, phases, phase, secondsLeft]
  );

  const nextPhase = useCallback(() => {
    if (phaseIndex + 1 < phases.length) {
      goToPhase(phaseIndex + 1);
    } else {
      // Accumulate the last phase's actual time
      if (phase && !phase.isBreak) {
        const spent = phase.duration * 60 - secondsLeft;
        actualStudySecsRef.current += Math.max(0, spent);
      }

      stop();
      cancelScheduledNotification();

      const actualStudyMins =
        Math.round((actualStudySecsRef.current / 60) * 10) / 10;
      onComplete({ startedAt: startedAtRef.current, actualStudyMins });
    }
  }, [phaseIndex, phases.length, goToPhase, stop, cancelScheduledNotification, onComplete, phase, secondsLeft]);

  const resetPhase = useCallback(() => {
    cancelScheduledNotification();
    loadDuration(phase.duration * 60);
  }, [cancelScheduledNotification, loadDuration, phase]);

  // ── Handlers with haptics & confirmation ──
  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Record the start time on the very first play press
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    setRunning((r) => !r);
  }, [setRunning]);

  const handleSkip = useCallback(() => {
    if (running) {
      Alert.alert(
        "Skip Phase?",
        "Are you sure you want to skip to the next phase?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Skip",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              nextPhase();
            },
          },
        ]
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      nextPhase();
    }
  }, [running, nextPhase]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetPhase();
  }, [resetPhase]);

  const handleGoHome = useCallback(() => {
    const doLeave = () => {
      stop();
      cancelScheduledNotification();

      // Calculate actual study time for partial save
      if (startedAtRef.current && onPartialQuit) {
        const completedStudyMins = phases
          .slice(0, phaseIndex)
          .filter((p) => !p.isBreak)
          .reduce((a, p) => a + p.duration, 0);

        const currentPhaseMins =
          phase && !phase.isBreak
            ? Math.max(0, (phase.duration * 60 - secondsLeft) / 60)
            : 0;

        const actualStudyMins =
          Math.round((completedStudyMins + currentPhaseMins) * 10) / 10;

        const completedStudyPhases = phases
          .slice(0, phaseIndex)
          .filter((p) => !p.isBreak).length;

        if (actualStudyMins > 0) {
          onPartialQuit({
            startedAt: startedAtRef.current,
            actualStudyMins,
            phasesCompleted: completedStudyPhases,
          });
          return;
        }
      }

      onGoHome();
    };

    if (running) {
      Alert.alert(
        "Leave Session?",
        "Your timer is still running. Your progress will be saved.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: doLeave,
          },
        ]
      );
    } else {
      doLeave();
    }
  }, [running, stop, cancelScheduledNotification, onGoHome, onPartialQuit, phases, phaseIndex, phase, secondsLeft]);

  // ── Memoized dynamic styles ──
  const progressFillStyle = useMemo(
    () => [
      styles.progressBarFill,
      { width: `${progress * 100}%`, backgroundColor: color },
    ],
    [progress, color]
  );

  const pillStyle = useMemo(
    () => [styles.durationPill, { backgroundColor: color + "33" }],
    [color]
  );

  const pillTextStyle = useMemo(
    () => [styles.durationPillText, { color }],
    [color]
  );

  const playBtnStyle = useMemo(
    () => [styles.circleBtnBig, { backgroundColor: color }],
    [color]
  );

  const tipBtnStyle = useMemo(
    () => [styles.tipBtn, { borderColor: color + "66" }],
    [color]
  );

  const tipBtnTextStyle = useMemo(
    () => [styles.tipBtnText, { color }],
    [color]
  );

  const tipBoxStyle = useMemo(
    () => [styles.tipBox, { borderColor: color + "44" }],
    [color]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.sessionTop}>
        <TouchableOpacity onPress={handleGoHome} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.sessionLabel}>{session.label}</Text>
        <View style={styles.spacer} />
      </View>

      {/* ── Subject badge ── */}
      {subject && (
        <View style={styles.subjectBadge}>
          <View style={[styles.subjectDot, { backgroundColor: subjectColor || "#4f8ef7" }]} />
          <Text style={styles.subjectBadgeText}>{subject}</Text>
        </View>
      )}

      {/* ── Progress bar ── */}
      <View style={styles.progressBarBg}>
        <View style={progressFillStyle} />
      </View>
      <Text style={styles.progressText}>
        {isBreakPhase
          ? "Break time"
          : `Study phase ${currentStudyNum} of ${studyPhaseCount}`}{" "}
        · {Math.round(progress * 100)}%
      </Text>

      {/* ── Phase info ── */}
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseEmojiBig}>{phase?.emoji}</Text>
        <Text style={styles.phaseName}>{phase?.name}</Text>
        <View style={pillStyle}>
          <Text style={pillTextStyle}>
            {isBreakPhase
              ? `${phase?.duration} min break`
              : `${phase?.duration} minutes`}
          </Text>
        </View>
      </View>

      {/* ── Timer display ── */}
      <View style={styles.timerWrap}>
        <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.timerStatus}>
          {running
            ? isBreakPhase
              ? "resting"
              : "in progress"
            : "paused"}
        </Text>
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.circleBtnSmall} onPress={handleReset}>
          <Text style={styles.circleBtnText}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={playBtnStyle} onPress={handlePlayPause}>
          <Text style={styles.circleBtnBigText}>
            {running ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtnSmall} onPress={handleSkip}>
          <Text style={styles.circleBtnText}>⏭</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tip ── */}
      <TouchableOpacity
        style={tipBtnStyle}
        onPress={() => setShowTip((t) => !t)}
      >
        <Text style={tipBtnTextStyle}>
          {showTip ? "Hide tip" : "💡 What should I do now?"}
        </Text>
      </TouchableOpacity>
      {showTip && (
        <View style={tipBoxStyle}>
          <Text style={styles.tipBoxText}>{phase?.tip}</Text>
        </View>
      )}

      {/* ── Phase dots ── */}
      <View style={styles.dotsRow}>
        {phases.map((p, i) => (
          <TouchableOpacity key={i} onPress={() => goToPhase(i)}>
            <View
              style={[
                styles.dot,
                i === phaseIndex && { width: 24, backgroundColor: color },
                i < phaseIndex && { backgroundColor: color + "55" },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtnText: { color: "#aab4c8", fontSize: 18 },
  sessionLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  spacer: { width: 40 },
  progressBarBg: {
    backgroundColor: "rgba(255,255,255,0.08)",
    height: 3,
    borderRadius: 4,
    marginHorizontal: 20,
    marginTop: 14,
  },
  progressBarFill: { height: 3, borderRadius: 4 },
  progressText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },
  phaseHeader: { alignItems: "center", marginTop: 20 },
  phaseEmojiBig: { fontSize: 36, marginBottom: 6 },
  phaseName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  durationPill: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  durationPillText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  timerWrap: { alignItems: "center", marginTop: 24, marginBottom: 16 },
  timerText: { color: "#fff", fontSize: 56, fontWeight: "800" },
  timerStatus: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    marginTop: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  circleBtnSmall: {
    backgroundColor: "rgba(255,255,255,0.08)",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnText: { color: "#fff", fontSize: 18 },
  circleBtnBig: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnBigText: { fontSize: 24 },
  tipBtn: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  tipBtnText: { fontSize: 12, fontWeight: "600" },
  tipBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 22,
    marginTop: 10,
  },
  tipBoxText: { color: "#e8eaf0", fontSize: 13, lineHeight: 20 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#131920",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectBadgeText: {
    color: "#9ab",
    fontSize: 11,
    fontWeight: "600",
  },
});
