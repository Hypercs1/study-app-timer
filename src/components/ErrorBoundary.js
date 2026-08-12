import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

/**
 * Error boundary that catches render errors and shows a recovery UI
 * instead of a white screen crash.
 */
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app encountered an unexpected error.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d14",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: "#f0f6ff", fontSize: 22, fontWeight: "800" },
  subtitle: {
    color: "#556070",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 260,
  },
  button: {
    backgroundColor: "#4f8ef7",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 34,
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
