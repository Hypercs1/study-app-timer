import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
  Switch,
} from "react-native";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { studyColors, breakColor } from "../constants/sessions";
import { formatTime } from "../utils/formatTime";
import { phaseElapsedSecs, minsFromSecs } from "../utils/studyTime";
import { useTimer } from "../hooks/useTimer";
import { useNotifications } from "../hooks/useNotifications";
import { useAlarmSound } from "../hooks/useAlarmSound";
import { loadSettings, saveSettings } from "../utils/storage";

// Tag for the imperative keep-awake lock (held only while the timer runs).
const KEEP_AWAKE_TAG = "study-session";
// Vibration pattern for the phase-complete alarm (mirrors the notification channel).
const ALARM_VIBRATION = [0, 500, 250, 500];

/**
 * Session screen — timer, controls, progress, and tips.
 * Owns its own timer/notification/sound lifecycle; cleans up on unmount.
 *
 * @param {{ session: Object, onGoHome: () => void, onComplete: (meta: Object) => void }} props
 */
export default function SessionScreen({ session, subject, subjectColor, onGoHome, onComplete, onPartialQuit }) {
  const phases = session.phases;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const phase = phases[phaseIndex] || null;

  // Auto-advance: when on, a finished phase immediately starts the next one.
  // Seeded from saved settings but toggleable live during the session.
  const [autoAdvance, setAutoAdvance] = useState(true);
  // Which bundled alarm sound plays for background/locked notifications.
  const [soundPreset, setSoundPreset] = useState("classic");
  // Honor the user's Settings toggles (seeded on; overwritten once settings load).
  const [vibrate, setVibrate] = useState(true);
  const [keepAwake, setKeepAwake] = useState(true);

  // Track when the user first presses play (for session history)
  const startedAtRef = useRef(null);

  // Accumulates actual study seconds across all phases
  // (only counts time actually elapsed, not skipped time)
  const actualStudySecsRef = useRef(0);

  const { scheduleChain, cancelAll } = useNotifications();
  const { playAlarm } = useAlarmSound();

  // handlePhaseComplete (defined below) depends on goToPhase/finishSession,
  // which in turn need the timer's controls — so route the timer's onComplete
  // through a ref to break the definition-order cycle.
  const onCompleteRef = useRef(() => {});
  const fireComplete = useCallback(() => onCompleteRef.current?.(), []);

  const { secondsLeft, running, setRunning, loadDuration, stop, restart } =
    useTimer({ onComplete: fireComplete });

  // Mirror live remaining time into a ref so the scheduling effect can read it
  // without depending on `secondsLeft` (which would reschedule every tick).
  const secondsLeftRef = useRef(0);
  secondsLeftRef.current = secondsLeft;

  // Mirror the vibrate setting into a ref so the haptic helpers below stay
  // stable (they never need to be recreated when the setting flips).
  const vibrateRef = useRef(true);
  vibrateRef.current = vibrate;

  // Haptic helpers — no-ops when the user turned Vibration off in Settings.
  const impact = useCallback(() => {
    if (vibrateRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);
  const selection = useCallback(() => {
    if (vibrateRef.current) Haptics.selectionAsync();
  }, []);

  // Load saved prefs (auto-advance default + chosen sound) once on mount.
  useEffect(() => {
    loadSettings().then((s) => {
      setAutoAdvance(s.autoAdvance !== false);
      setSoundPreset(s.soundPreset || "classic");
      setVibrate(s.vibrate !== false);
      setKeepAwake(s.keepAwake !== false);
    });
  }, []);

  // Hold a keep-awake lock only while the timer is actively running, and only
  // if the user left the setting on. Released on pause, toggle-off, or unmount.
  useEffect(() => {
    if (running && keepAwake) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      };
    }
  }, [running, keepAwake]);

  // Load first phase duration on mount
  useEffect(() => {
    loadDuration(phases[0].duration * 60);
  }, [loadDuration, phases]);

  // Build the notification chain. The current phase always fires at its end;
  // when auto-advance is on we also pre-schedule every subsequent phase
  // boundary at cumulative offsets, so alarms still fire while the app is
  // backgrounded (JS timers are frozen in the background).
  const buildChainItems = useCallback(() => {
    const current = phases[phaseIndex];
    if (!current) return [];

    const bodyFor = (completed, idx) => {
      const upNext = phases[idx + 1];
      return upNext
        ? `"${completed.name}" done. Up next: ${upNext.emoji} ${upNext.name}.`
        : `"${completed.name}" done — session complete! 🎉`;
    };

    let offset = secondsLeftRef.current;
    const items = [
      {
        seconds: offset,
        title: "Study Timer ⏰",
        body: bodyFor(current, phaseIndex),
      },
    ];

    if (autoAdvance) {
      for (let i = phaseIndex + 1; i < phases.length; i++) {
        offset += phases[i].duration * 60;
        items.push({
          seconds: offset,
          title: "Study Timer ⏰",
          body: bodyFor(phases[i], i),
        });
      }
    }
    return items;
  }, [phases, phaseIndex, autoAdvance]);

  // ── (Re)schedule or cancel the notification chain ──
  // Re-runs when the timer starts/stops, the phase changes, auto-advance is
  // toggled, or the chosen sound changes.
  useEffect(() => {
    if (running) {
      scheduleChain(buildChainItems(), soundPreset);
    } else {
      cancelAll();
    }
  }, [running, phaseIndex, autoAdvance, soundPreset, buildChainItems, scheduleChain, cancelAll]);

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
    (idx, autoStart = false) => {
      // Accumulate actual study time from the current phase before switching
      // (0 for breaks; only real elapsed time, not the full phase length).
      actualStudySecsRef.current += phaseElapsedSecs(phase, secondsLeft);

      setPhaseIndex(idx);
      setShowTip(false);

      if (autoStart) {
        // Roll straight into the next phase; the scheduling effect reschedules
        // the notification chain off the new phaseIndex.
        restart(phases[idx].duration * 60);
      } else {
        cancelAll();
        loadDuration(phases[idx].duration * 60);
      }
    },
    [cancelAll, loadDuration, restart, phases, phase, secondsLeft]
  );

  // Finish the whole session (last phase done, or the final phase was skipped).
  const finishSession = useCallback(() => {
    actualStudySecsRef.current += phaseElapsedSecs(phase, secondsLeft);

    stop();
    cancelAll();

    const actualStudyMins = minsFromSecs(actualStudySecsRef.current);
    onComplete({ startedAt: startedAtRef.current, actualStudyMins });
  }, [phase, secondsLeft, stop, cancelAll, onComplete]);

  const nextPhase = useCallback(() => {
    if (phaseIndex + 1 < phases.length) {
      goToPhase(phaseIndex + 1);
    } else {
      finishSession();
    }
  }, [phaseIndex, phases.length, goToPhase, finishSession]);

  // Called by the timer when a phase hits 0. Always sounds the alarm; when
  // auto-advance is on, roll into the next phase (or finish the session).
  const handlePhaseComplete = useCallback(() => {
    playAlarm(soundPreset);
    if (vibrateRef.current) Vibration.vibrate(ALARM_VIBRATION);
    if (!autoAdvance) return;
    if (phaseIndex + 1 < phases.length) {
      goToPhase(phaseIndex + 1, true);
    } else {
      finishSession();
    }
  }, [playAlarm, soundPreset, autoAdvance, phaseIndex, phases.length, goToPhase, finishSession]);

  // Keep the timer's completion callback pointing at the latest closure.
  onCompleteRef.current = handlePhaseComplete;

  const resetPhase = useCallback(() => {
    cancelAll();
    loadDuration(phase.duration * 60);
  }, [cancelAll, loadDuration, phase]);

  // ── Handlers with haptics & confirmation ──
  const handlePlayPause = useCallback(() => {
    impact();
    // Record the start time on the very first play press
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    setRunning((r) => !r);
  }, [impact, setRunning]);

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
              impact();
              nextPhase();
            },
          },
        ]
      );
    } else {
      impact();
      nextPhase();
    }
  }, [impact, running, nextPhase]);

  const handleReset = useCallback(() => {
    impact();
    resetPhase();
  }, [impact, resetPhase]);

  // Flip auto-advance live and persist the new default for next time.
  const toggleAutoAdvance = useCallback(() => {
    selection();
    setAutoAdvance((prev) => {
      const next = !prev;
      saveSettings({ autoAdvance: next });
      return next;
    });
  }, [selection]);

  const handleGoHome = useCallback(() => {
    const doLeave = () => {
      stop();
      cancelAll();

      // Calculate actual study time for partial save. Use the same
      // accumulated-elapsed basis as finishSession, so quitting credits exactly
      // what a normal finish would for the same elapsed time — phases skipped
      // early are not credited their full nominal length.
      if (startedAtRef.current && onPartialQuit) {
        const actualStudyMins = minsFromSecs(
          actualStudySecsRef.current + phaseElapsedSecs(phase, secondsLeft)
        );

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
  }, [running, stop, cancelAll, onGoHome, onPartialQuit, phases, phaseIndex, phase, secondsLeft]);

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

      {/* ── Auto-advance toggle ── */}
      <View style={styles.autoAdvanceRow}>
        <View style={styles.autoAdvanceTextWrap}>
          <Text style={styles.autoAdvanceLabel}>Auto-advance phases</Text>
          <Text style={styles.autoAdvanceHint}>
            {autoAdvance
              ? "Next phase starts automatically"
              : "Pauses at the end of each phase"}
          </Text>
        </View>
        <Switch
          value={autoAdvance}
          onValueChange={toggleAutoAdvance}
          trackColor={{ false: "#1e2a38", true: color }}
          thumbColor="#fff"
        />
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
  autoAdvanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "center",
    backgroundColor: "#131920",
    borderWidth: 1,
    borderColor: "#1e2a38",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 20,
    width: "86%",
  },
  autoAdvanceTextWrap: { flex: 1, paddingRight: 12 },
  autoAdvanceLabel: { color: "#f0f6ff", fontSize: 14, fontWeight: "700" },
  autoAdvanceHint: { color: "#556070", fontSize: 11, marginTop: 2 },
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
