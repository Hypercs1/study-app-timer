import React, { useState, useCallback } from "react";
import ErrorBoundary from "./src/components/ErrorBoundary";
import HomeScreen from "./src/screens/HomeScreen";
import SubjectPickerScreen from "./src/screens/SubjectPickerScreen";
import SessionPickerScreen from "./src/screens/SessionPickerScreen";
import CustomSessionScreen from "./src/screens/CustomSessionScreen";
import SessionScreen from "./src/screens/SessionScreen";
import DoneScreen from "./src/screens/DoneScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StatsScreen from "./src/screens/StatsScreen";
import { SESSIONS } from "./src/constants/sessions";
import { saveSession, saveSubject } from "./src/utils/storage";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [sessionKey, setSessionKey] = useState(null);
  const [customSession, setCustomSession] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectColor, setSubjectColor] = useState(null);

  // Active session structure (preset key or custom object)
  const session = sessionKey
    ? SESSIONS[sessionKey]
    : customSession;

  // ── Navigation helpers ──

  const goHome = useCallback(() => {
    setScreen("home");
    setSelectedSubject(null);
    setSubjectColor(null);
    setSessionKey(null);
    setCustomSession(null);
    setSessionMeta(null);
  }, []);

  const startStudying = useCallback(() => {
    setScreen("subject-picker");
  }, []);

  const handleSelectSubject = useCallback(async (name) => {
    const subject = await saveSubject(name);
    setSelectedSubject(subject.name);
    setSubjectColor(subject.color);
    setScreen("session-picker");
  }, []);

  const goBackToSubjectPicker = useCallback(() => {
    setScreen("subject-picker");
    setSessionKey(null);
    setCustomSession(null);
  }, []);

  const handleStartSession = useCallback((key) => {
    setSessionKey(key);
    setCustomSession(null);
    setSessionMeta(null);
    setScreen("session");
  }, []);

  const openCustomSessionBuilder = useCallback(() => {
    setScreen("custom-session-builder");
  }, []);

  const handleStartCustomSession = useCallback((customObj) => {
    setSessionKey(null);
    setCustomSession(customObj);
    setSessionMeta(null);
    setScreen("session");
  }, []);

  const goBackToSessionPicker = useCallback(() => {
    setScreen("session-picker");
  }, []);

  // Called when all phases of a session are completed
  const handleComplete = useCallback(
    (meta) => {
      setSessionMeta({
        ...meta,
        sessionKey: sessionKey || "custom",
        subject: selectedSubject,
      });
      setScreen("done");
    },
    [sessionKey, selectedSubject]
  );

  // Called when the user quits a session early — saves partial progress
  const handlePartialQuit = useCallback(
    async (meta) => {
      if (!session) {
        goHome();
        return;
      }

      const studyPhases = session.phases.filter((p) => !p.isBreak);
      const totalStudyMins = studyPhases.reduce((a, p) => a + p.duration, 0);

      try {
        await saveSession({
          sessionType: sessionKey || "custom",
          label: session.label,
          subject: selectedSubject || "Unspecified",
          startedAt: meta.startedAt,
          phasesCompleted: meta.phasesCompleted,
          totalStudyMins,
          actualStudyMins: meta.actualStudyMins,
          completed: false,
        });
      } catch (e) {
        console.warn("Failed to save partial session:", e);
      }

      goHome();
    },
    [session, sessionKey, selectedSubject, goHome]
  );

  const viewHistory = useCallback(() => setScreen("history"), []);
  const viewStats = useCallback(() => setScreen("stats"), []);

  // ── Render ──

  return (
    <ErrorBoundary>
      {screen === "home" && (
        <HomeScreen
          onStartStudying={startStudying}
          onViewStats={viewStats}
          onViewHistory={viewHistory}
        />
      )}

      {screen === "subject-picker" && (
        <SubjectPickerScreen
          onSelectSubject={handleSelectSubject}
          onGoHome={goHome}
        />
      )}

      {screen === "session-picker" && (
        <SessionPickerScreen
          subject={selectedSubject}
          subjectColor={subjectColor}
          onStartSession={handleStartSession}
          onOpenCustomSession={openCustomSessionBuilder}
          onGoBack={goBackToSubjectPicker}
        />
      )}

      {screen === "custom-session-builder" && (
        <CustomSessionScreen
          subject={selectedSubject}
          subjectColor={subjectColor}
          onStartCustomSession={handleStartCustomSession}
          onGoBack={goBackToSessionPicker}
        />
      )}

      {screen === "session" && session && (
        <SessionScreen
          session={session}
          subject={selectedSubject}
          subjectColor={subjectColor}
          onGoHome={goHome}
          onComplete={handleComplete}
          onPartialQuit={handlePartialQuit}
        />
      )}

      {screen === "done" && session && (
        <DoneScreen
          session={session}
          sessionMeta={sessionMeta}
          onGoHome={goHome}
        />
      )}

      {screen === "history" && <HistoryScreen onGoHome={goHome} />}

      {screen === "stats" && <StatsScreen onGoHome={goHome} />}
    </ErrorBoundary>
  );
}