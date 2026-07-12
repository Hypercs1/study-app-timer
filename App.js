import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";

// ── Notification behavior: show alert + play sound even in foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Session structure (same logic as the web version) ──
const BREAK_1HR = { name: "Break", duration: 3, emoji: "☕", isBreak: true, tip: "Step away. Stretch, grab water, rest your eyes." };
const BREAK_2HR = { name: "Break", duration: 5, emoji: "☕", isBreak: true, tip: "Step away. Stretch, grab water, rest your eyes." };

const raw1hr = [
  { name: "Flashcard Review", duration: 10, emoji: "🃏", tip: "Retrieval only — no new material." },
  { name: "Deep Study", duration: 30, emoji: "📖", tip: "Read, understand, annotate. No card making." },
  { name: "Past Question", duration: 15, emoji: "✏️", tip: "Attempt → stuck 5 min max → check → explain why." },
  { name: "Card Making + Review Gaps", duration: 5, emoji: "✍️", tip: "Make cards from what you just studied." },
];

const raw2hr = [
  { name: "Flashcard Review", duration: 10, emoji: "🃏", tip: "Retrieval only — no new material." },
  { name: "Deep Study — Topic 1", duration: 30, emoji: "📖", tip: "Read, understand, annotate. No card making." },
  { name: "Deep Study — Topic 2", duration: 25, emoji: "📗", tip: "New topic or continuation. Stay focused." },
  { name: "Past Question", duration: 20, emoji: "✏️", tip: "Attempt → stuck 5 min max → check → explain why." },
  { name: "Card Making + Review Gaps", duration: 15, emoji: "✍️", tip: "Make cards, flag anything unclear." },
];

function buildPhases(key) {
  if (key === "1hr") {
    const result = [];
    raw1hr.forEach((p, i) => {
      result.push(p);
      if (i < raw1hr.length - 1) result.push({ ...BREAK_1HR });
    });
    return result;
  }
  const result = [];
  raw2hr.forEach((p, i) => {
    result.push(p);
    if (i === 1 || i === 2) result.push({ ...BREAK_2HR });
  });
  return result;
}

const SESSIONS = {
  "1hr": { label: "1-Hour Session", phases: buildPhases("1hr") },
  "2hr": { label: "2-Hour Session", phases: buildPhases("2hr") },
};

const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const studyColors = ["#4f8ef7", "#4caf6e", "#b06ce0", "#e0a030", "#30b8c8"];
const breakColor = "#778899";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [sessionKey, setSessionKey] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const targetEndRef = useRef(null);
  const intervalRef = useRef(null);
  const scheduledNotifIdRef = useRef(null);
  const soundRef = useRef(null);

  const session = sessionKey ? SESSIONS[sessionKey] : null;
  const phases = session ? session.phases : [];
  const phase = phases[phaseIndex] || null;

  // ── Request notification permission on launch ──
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Notification permission not granted — alerts may not fire when app is backgrounded.");
      }
    })();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const getColor = (idx) => {
    if (!phases[idx]) return studyColors[0];
    if (phases[idx].isBreak) return breakColor;
    const studyIdx = phases.slice(0, idx + 1).filter((p) => !p.isBreak).length - 1;
    return studyColors[studyIdx % studyColors.length];
  };
  const color = phase ? getColor(phaseIndex) : studyColors[0];

  // ── Play local alarm sound (used when app is in foreground) ──
  // To use your OWN sound file instead: drop an .mp3 into an /assets folder
  // in this project, then replace the uri line below with:
  //   require("./assets/your-sound.mp3")
  // (no need for { uri: ... } wrapping when using a local bundled file)
  const playLocalAlarm = useCallback(async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  }, []);

  // ── Schedule a native notification that fires at the exact end time, ──
  // ── even if the app is backgrounded or the screen is locked. ──
  const scheduleEndNotification = useCallback(async (phaseName, secondsFromNow) => {
    if (scheduledNotifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current).catch(() => {});
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study Timer",
        body: `"${phaseName}" complete! Time for the next phase.`,
        sound: true,
      },
      trigger: { seconds: Math.max(secondsFromNow, 1) },
    });
    scheduledNotifIdRef.current = id;
  }, []);

  const cancelScheduledNotification = useCallback(async () => {
    if (scheduledNotifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current).catch(() => {});
      scheduledNotifIdRef.current = null;
    }
  }, []);

  // ── Timestamp-based countdown loop ──
  useEffect(() => {
    if (running) {
      targetEndRef.current = Date.now() + secondsLeft * 1000;
      scheduleEndNotification(phase.name, secondsLeft);

      const tick = () => {
        const remaining = Math.round((targetEndRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          setSecondsLeft(0);
          setRunning(false);
          clearInterval(intervalRef.current);
          playLocalAlarm();
        } else {
          setSecondsLeft(remaining);
        }
      };
      intervalRef.current = setInterval(tick, 1000);
      tick();
    } else {
      cancelScheduledNotification();
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const startSession = (key) => {
    setSessionKey(key);
    setPhaseIndex(0);
    setSecondsLeft(SESSIONS[key].phases[0].duration * 60);
    setRunning(false);
    setShowTip(false);
    setScreen("session");
  };

  const goToPhase = (idx) => {
    cancelScheduledNotification();
    setPhaseIndex(idx);
    setSecondsLeft(session.phases[idx].duration * 60);
    setRunning(false);
    setShowTip(false);
  };

  const nextPhase = () => {
    if (phaseIndex + 1 < phases.length) {
      goToPhase(phaseIndex + 1);
    } else {
      setRunning(false);
      cancelScheduledNotification();
      setScreen("done");
    }
  };

  const resetPhase = () => {
    cancelScheduledNotification();
    setSecondsLeft(phase.duration * 60);
    setRunning(false);
  };

  const totalStudySecs = phases.filter((p) => !p.isBreak).reduce((a, p) => a + p.duration * 60, 0);
  const elapsedStudySecs =
    phases.slice(0, phaseIndex).filter((p) => !p.isBreak).reduce((a, p) => a + p.duration * 60, 0) +
    (phase && !phase.isBreak ? phase.duration * 60 - secondsLeft : 0);
  const progress = totalStudySecs > 0 ? Math.min(elapsedStudySecs / totalStudySecs, 1) : 0;

  // ── HOME SCREEN ──
  if (screen === "home") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.homeScroll}>
          <Text style={styles.homeEmoji}>⏱️</Text>
          <Text style={styles.homeTitle}>Study Timer</Text>
          <Text style={styles.homeSubtitle}>Pick your session to begin</Text>

          {Object.entries(SESSIONS).map(([key, s]) => {
            const studyMins = s.phases.filter((p) => !p.isBreak).reduce((a, p) => a + p.duration, 0);
            const breakMins = s.phases.filter((p) => p.isBreak).reduce((a, p) => a + p.duration, 0);
            return (
              <TouchableOpacity key={key} style={styles.sessionCard} onPress={() => startSession(key)}>
                <Text style={styles.sessionCardTitle}>{s.label}</Text>
                <Text style={styles.sessionCardMeta}>
                  {studyMins}m study · {breakMins}m breaks
                </Text>
                {s.phases.map((p, i) => (
                  <View key={i} style={styles.phaseRow}>
                    <Text style={styles.phaseEmoji}>{p.emoji}</Text>
                    <Text style={[styles.phaseRowName, p.isBreak && styles.phaseRowNameBreak]}>{p.name}</Text>
                    <Text style={[styles.phaseRowDuration, p.isBreak && styles.phaseRowDurationBreak]}>
                      {p.duration}m
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE SCREEN ──
  if (screen === "done") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Session Complete!</Text>
          <Text style={styles.doneSubtitle}>
            You got through your full {session.label}. Take a real rest before the next one.
          </Text>
          <View style={styles.doneList}>
            {phases.filter((p) => !p.isBreak).map((p, i) => (
              <View key={i} style={styles.doneRow}>
                <Text style={styles.doneCheck}>✅</Text>
                <Text style={styles.doneRowText}>{p.name}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.homeButton} onPress={() => setScreen("home")}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── SESSION SCREEN ──
  const isBreakPhase = phase?.isBreak;
  const studyPhaseCount = phases.filter((p) => !p.isBreak).length;
  const currentStudyNum = phases.slice(0, phaseIndex + 1).filter((p) => !p.isBreak).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#0d1117" }]}>
      <View style={styles.sessionTop}>
        <TouchableOpacity onPress={() => setScreen("home")} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.sessionLabel}>{session.label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressText}>
        {isBreakPhase ? "Break time" : `Study phase ${currentStudyNum} of ${studyPhaseCount}`} · {Math.round(progress * 100)}%
      </Text>

      <View style={styles.phaseHeader}>
        <Text style={styles.phaseEmojiBig}>{phase?.emoji}</Text>
        <Text style={styles.phaseName}>{phase?.name}</Text>
        <View style={[styles.durationPill, { backgroundColor: color + "33" }]}>
          <Text style={[styles.durationPillText, { color }]}>
            {isBreakPhase ? `${phase?.duration} min break` : `${phase?.duration} minutes`}
          </Text>
        </View>
      </View>

      <View style={styles.timerWrap}>
        <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
        <Text style={styles.timerStatus}>
          {running ? (isBreakPhase ? "resting" : "in progress") : "paused"}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.circleBtnSmall} onPress={resetPhase}>
          <Text style={styles.circleBtnText}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.circleBtnBig, { backgroundColor: color }]} onPress={() => setRunning((r) => !r)}>
          <Text style={styles.circleBtnBigText}>{running ? "⏸" : "▶"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtnSmall} onPress={nextPhase}>
          <Text style={styles.circleBtnText}>⏭</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.tipBtn, { borderColor: color + "66" }]} onPress={() => setShowTip((t) => !t)}>
        <Text style={[styles.tipBtnText, { color }]}>{showTip ? "Hide tip" : "💡 What should I do now?"}</Text>
      </TouchableOpacity>
      {showTip && (
        <View style={[styles.tipBox, { borderColor: color + "44" }]}>
          <Text style={styles.tipBoxText}>{phase?.tip}</Text>
        </View>
      )}

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
  container: { flex: 1, backgroundColor: "#090d14" },
  homeScroll: { alignItems: "center", padding: 24, paddingTop: 40 },
  homeEmoji: { fontSize: 48, marginBottom: 8 },
  homeTitle: { color: "#f0f6ff", fontSize: 26, fontWeight: "800" },
  homeSubtitle: { color: "#556070", fontSize: 13, marginTop: 6, marginBottom: 28 },
  sessionCard: { backgroundColor: "#131920", borderWidth: 1.5, borderColor: "#1e2a38", borderRadius: 18, padding: 20, width: "100%", marginBottom: 14 },
  sessionCardTitle: { color: "#f0f6ff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sessionCardMeta: { color: "#556070", fontSize: 12, marginBottom: 12 },
  phaseRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  phaseEmoji: { fontSize: 13, marginRight: 8 },
  phaseRowName: { color: "#9ab", fontSize: 12, flex: 1 },
  phaseRowNameBreak: { color: "#445566", fontStyle: "italic" },
  phaseRowDuration: { color: "#4f8ef7", fontSize: 12, fontWeight: "600" },
  phaseRowDurationBreak: { color: "#445566" },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  doneEmoji: { fontSize: 56, marginBottom: 16 },
  doneTitle: { color: "#f0f6ff", fontSize: 24, fontWeight: "800" },
  doneSubtitle: { color: "#556070", fontSize: 14, marginTop: 8, textAlign: "center", maxWidth: 260 },
  doneList: { backgroundColor: "#131920", borderWidth: 1.5, borderColor: "#1e2a38", borderRadius: 14, padding: 18, marginTop: 24, marginBottom: 28, width: "100%", maxWidth: 300 },
  doneRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  doneCheck: { fontSize: 15, marginRight: 10 },
  doneRowText: { color: "#9ab", fontSize: 13 },
  homeButton: { backgroundColor: "#4f8ef7", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 34 },
  homeButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sessionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12 },
  backBtn: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  backBtnText: { color: "#aab4c8", fontSize: 18 },
  sessionLabel: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  progressBarBg: { backgroundColor: "rgba(255,255,255,0.08)", height: 3, borderRadius: 4, marginHorizontal: 20, marginTop: 14 },
  progressBarFill: { height: 3, borderRadius: 4 },
  progressText: { color: "rgba(255,255,255,0.3)", fontSize: 10, textAlign: "center", marginTop: 6 },
  phaseHeader: { alignItems: "center", marginTop: 20 },
  phaseEmojiBig: { fontSize: 36, marginBottom: 6 },
  phaseName: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center", paddingHorizontal: 20 },
  durationPill: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14, marginTop: 8 },
  durationPillText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  timerWrap: { alignItems: "center", marginTop: 24, marginBottom: 16 },
  timerText: { color: "#fff", fontSize: 56, fontWeight: "800" },
  timerStatus: { color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  circleBtnSmall: { backgroundColor: "rgba(255,255,255,0.08)", width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  circleBtnText: { color: "#fff", fontSize: 18 },
  circleBtnBig: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  circleBtnBigText: { fontSize: 24 },
  tipBtn: { alignSelf: "center", borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16, marginTop: 18 },
  tipBtnText: { fontSize: 12, fontWeight: "600" },
  tipBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginHorizontal: 22, marginTop: 10 },
  tipBoxText: { color: "#e8eaf0", fontSize: 13, lineHeight: 20 },
  dotsRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 6, marginTop: 24, paddingHorizontal: 16, paddingBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" },
});