import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "./generateId";

const STORAGE_KEY = "@study_timer/sessions";
const SUBJECTS_KEY = "@study_timer/subjects";

// ── Preset colors for auto-assigning to new subjects ──
const SUBJECT_COLORS = [
  "#4f8ef7", // blue
  "#4caf6e", // green
  "#b06ce0", // purple
  "#e0a030", // amber
  "#30b8c8", // teal
  "#e06070", // coral
  "#7c8cf7", // indigo
  "#e07830", // orange
  "#50c090", // mint
  "#c06098", // pink
];

// ────────────────────────────────────────────
//  Subjects
// ────────────────────────────────────────────

/**
 * Load all saved subjects from local storage.
 * @returns {Promise<Array<{ name: string, color: string }>>}
 */
export async function loadSubjects() {
  try {
    const raw = await AsyncStorage.getItem(SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a subject. If it already exists (case-insensitive), returns the
 * existing entry. Otherwise creates a new entry with an auto-assigned color.
 *
 * @param {string} name - Subject name
 * @returns {Promise<{ name: string, color: string }>}
 */
export async function saveSubject(name) {
  const trimmed = name.trim();
  if (!trimmed) return { name: "Unspecified", color: SUBJECT_COLORS[0] };

  const subjects = await loadSubjects();
  const existing = subjects.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing;

  const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
  const newSubject = { name: trimmed, color };
  await AsyncStorage.setItem(
    SUBJECTS_KEY,
    JSON.stringify([...subjects, newSubject])
  );
  return newSubject;
}

/**
 * Update the color assigned to a subject.
 *
 * @param {string} name - Subject name (case-insensitive match)
 * @param {string} color - New hex color
 */
export async function updateSubjectColor(name, color) {
  const subjects = await loadSubjects();
  const updated = subjects.map((s) =>
    s.name.toLowerCase() === name.toLowerCase() ? { ...s, color } : s
  );
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(updated));
}

// ────────────────────────────────────────────
//  Sessions
// ────────────────────────────────────────────

/**
 * Save a completed or partial session record to local storage.
 * Prepends to the existing array so newest sessions come first.
 * Also ensures the subject is saved to the subjects list.
 *
 * @param {Object} params
 * @param {string} params.sessionType      - "1hr" or "2hr"
 * @param {string} params.label            - e.g. "1-Hour Session"
 * @param {string} params.subject          - e.g. "Biology"
 * @param {string} params.startedAt        - ISO timestamp
 * @param {number} params.phasesCompleted  - number of study phases completed
 * @param {number} params.totalStudyMins   - total study minutes in the template
 * @param {number} [params.actualStudyMins] - actual minutes studied (for partial sessions)
 * @param {boolean} [params.completed=true] - whether the session was fully completed
 */
export async function saveSession({
  sessionType,
  label,
  subject,
  startedAt,
  phasesCompleted,
  totalStudyMins,
  actualStudyMins,
  completed = true,
}) {
  const record = {
    id: generateId(),
    sessionType,
    label,
    subject: subject || "Unspecified",
    startedAt,
    completedAt: new Date().toISOString(),
    phasesCompleted,
    totalStudyMins,
    actualStudyMins: actualStudyMins != null ? actualStudyMins : totalStudyMins,
    completed,
  };

  // Ensure the subject exists in our subjects list
  await saveSubject(record.subject);

  const existing = await loadSessions();
  const updated = [record, ...existing];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return record;
}

/**
 * Load all saved session records from local storage.
 * Returns newest first. Returns [] if nothing is stored.
 *
 * @returns {Promise<Array>} Array of session records
 */
export async function loadSessions() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load sessions:", e);
    return [];
  }
}

/**
 * Delete a single session record by id.
 *
 * @param {string} id - The session id to delete
 */
export async function deleteSession(id) {
  const sessions = await loadSessions();
  const updated = sessions.filter((s) => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Update fields on a single session record.
 *
 * @param {string} id - The session id to update
 * @param {Object} updates - Fields to merge into the record
 */
export async function updateSession(id, updates) {
  const sessions = await loadSessions();
  const updated = sessions.map((s) =>
    s.id === id ? { ...s, ...updates } : s
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Delete all saved session records.
 */
export async function clearSessions() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ────────────────────────────────────────────
//  Settings
// ────────────────────────────────────────────

const SETTINGS_KEY = "@study_timer/settings";

export const DEFAULT_SETTINGS = {
  soundPreset: "classic",
  vibrate: true,
  keepAwake: true,
  theme: "dark",
};

/**
 * Load user settings from local storage.
 */
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to local storage.
 */
export async function saveSettings(settings) {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("Failed to save settings", e);
    return DEFAULT_SETTINGS;
  }
}
