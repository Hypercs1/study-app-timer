import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { getTheme, THEMES } from "./themes";
import { loadSettings, saveSettings } from "../utils/storage";

// Default context value so `useTheme()` is safe even outside a provider (e.g. a
// component rendered in isolation in a test) — it resolves to the dark palette.
const ThemeContext = createContext({
  theme: THEMES.dark,
  themeName: "dark",
  setThemeName: () => {},
});

/**
 * App-wide theme provider. Seeds the active theme from the persisted `theme`
 * setting on mount, and persists any change so the whole app recolors live and
 * the choice survives a relaunch.
 */
export function ThemeProvider({ children }) {
  const [themeName, setThemeNameState] = useState("dark");

  useEffect(() => {
    let active = true;
    loadSettings().then((s) => {
      if (active && s && THEMES[s.theme]) setThemeNameState(s.theme);
    });
    return () => {
      active = false;
    };
  }, []);

  const setThemeName = useCallback((name) => {
    if (!THEMES[name]) return;
    setThemeNameState(name);
    // Persist in the background; the UI updates immediately from state.
    saveSettings({ theme: name });
  }, []);

  const value = useMemo(
    () => ({ theme: getTheme(themeName), themeName, setThemeName }),
    [themeName, setThemeName]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Access the active theme palette and setter.
 * @returns {{ theme: object, themeName: string, setThemeName: (name: string) => void }}
 */
export function useTheme() {
  return useContext(ThemeContext);
}
