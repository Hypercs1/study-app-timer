import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { loadSubjects } from "../utils/storage";

/**
 * Subject picker screen — type a new subject or tap a recent one.
 *
 * @param {{ onSelectSubject: (name: string) => void, onGoHome: () => void }} props
 */
export default function SubjectPickerScreen({ onSelectSubject, onGoHome }) {
  const [text, setText] = useState("");
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadSubjects().then(setSubjects);
  }, []);

  const trimmed = text.trim();

  const filteredSubjects = trimmed
    ? subjects.filter((s) =>
        s.name.toLowerCase().includes(trimmed.toLowerCase())
      )
    : subjects;

  const handleSubmit = () => {
    if (!trimmed) return;
    onSelectSubject(trimmed);
  };

  const handlePickExisting = (subject) => {
    onSelectSubject(subject.name);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoHome} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>What are you studying?</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Text input ── */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Biology, Mathematics..."
              placeholderTextColor="#445566"
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSubmit}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* ── Next button ── */}
          <TouchableOpacity
            style={[styles.nextBtn, !trimmed && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={!trimmed}
          >
            <Text
              style={[
                styles.nextBtnText,
                !trimmed && styles.nextBtnTextDisabled,
              ]}
            >
              Next →
            </Text>
          </TouchableOpacity>

          {/* ── Previously used subjects ── */}
          {subjects.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                {trimmed ? "Matching subjects" : "Recent subjects"}
              </Text>

              {filteredSubjects.map((s) => (
                <TouchableOpacity
                  key={s.name}
                  style={styles.subjectCard}
                  onPress={() => handlePickExisting(s)}
                >
                  <View
                    style={[styles.colorDot, { backgroundColor: s.color }]}
                  />
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
              ))}

              {filteredSubjects.length === 0 && trimmed !== "" && (
                <Text style={styles.noMatch}>
                  No matching subjects — press Next to create &quot;{trimmed}
                  &quot;
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: 20, paddingTop: 20 },
  inputWrap: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  input: {
    color: "#f0f6ff",
    fontSize: 16,
    paddingVertical: 14,
  },
  nextBtn: {
    backgroundColor: "#4f8ef7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 28,
  },
  nextBtnDisabled: {
    backgroundColor: "#1e2a38",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  nextBtnTextDisabled: {
    color: "#445566",
  },
  sectionLabel: {
    color: "#556070",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  subjectCard: {
    backgroundColor: "#131920",
    borderWidth: 1.5,
    borderColor: "#1e2a38",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subjectName: {
    color: "#f0f6ff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  arrowText: {
    color: "#556070",
    fontSize: 16,
  },
  noMatch: {
    color: "#556070",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
});
