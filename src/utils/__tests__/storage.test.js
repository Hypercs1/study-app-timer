import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  loadSubjects,
  saveSubject,
  loadSessions,
  saveSession,
} from "../storage";

// AsyncStorage is replaced with the in-memory mock in jest.setup.js.
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("settings", () => {
  it("returns defaults when nothing is stored", async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges saved fields over the defaults", async () => {
    await saveSettings({ autoAdvance: false });
    const s = await loadSettings();
    expect(s.autoAdvance).toBe(false);
    expect(s.soundPreset).toBe(DEFAULT_SETTINGS.soundPreset); // untouched field preserved
  });

  it("does not lose updates when two saves run concurrently", async () => {
    // Without per-key serialization both saves read the same defaults snapshot
    // and the second write clobbers the first. withKeyLock must persist both.
    await Promise.all([
      saveSettings({ vibrate: false }),
      saveSettings({ keepAwake: false }),
    ]);
    const s = await loadSettings();
    expect(s.vibrate).toBe(false);
    expect(s.keepAwake).toBe(false);
  });
});

describe("subjects", () => {
  it("adds a new subject with an auto-assigned color", async () => {
    const subj = await saveSubject("Biology");
    expect(subj.name).toBe("Biology");
    expect(typeof subj.color).toBe("string");
    expect(await loadSubjects()).toHaveLength(1);
  });

  it("dedupes case-insensitively and returns the existing entry", async () => {
    const first = await saveSubject("Biology");
    const again = await saveSubject("biology");
    expect(again).toEqual(first);
    expect(await loadSubjects()).toHaveLength(1);
  });

  it("persists both when two distinct subjects are added concurrently", async () => {
    await Promise.all([saveSubject("Biology"), saveSubject("Chemistry")]);
    const names = (await loadSubjects()).map((s) => s.name).sort();
    expect(names).toEqual(["Biology", "Chemistry"]);
  });
});

describe("sessions", () => {
  const base = {
    sessionType: "1hr",
    label: "1-Hour Session",
    subject: "Biology",
    startedAt: "2026-01-01T00:00:00.000Z",
    phasesCompleted: 4,
    totalStudyMins: 60,
  };

  it("prepends newest sessions first", async () => {
    await saveSession({ ...base, startedAt: "2026-01-01T00:00:00.000Z" });
    await saveSession({ ...base, startedAt: "2026-01-02T00:00:00.000Z" });
    const sessions = await loadSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].startedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("defaults actualStudyMins to totalStudyMins when omitted", async () => {
    const rec = await saveSession(base);
    expect(rec.actualStudyMins).toBe(60);
  });

  it("keeps an explicit actualStudyMins for partial sessions", async () => {
    const rec = await saveSession({
      ...base,
      actualStudyMins: 12.5,
      completed: false,
    });
    expect(rec.actualStudyMins).toBe(12.5);
    expect(rec.completed).toBe(false);
  });
});
