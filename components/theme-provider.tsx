"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AppearancePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "kubera-appearance";

type ThemeContextValue = {
  /** User preference: follow OS, or force light/dark */
  preference: AppearancePreference;
  /** Effective theme applied to the document */
  theme: ResolvedTheme;
  setPreference: (preference: AppearancePreference) => void;
  /** Cycles system → light → dark → system */
  cyclePreference: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  theme: "light",
  setPreference: () => {},
  cyclePreference: () => {},
});

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(
  preference: AppearancePreference,
): ResolvedTheme {
  return preference === "system" ? systemTheme() : preference;
}

function readStoredPreference(): AppearancePreference {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  // Migrate legacy kubera-theme
  const legacy = localStorage.getItem("kubera-theme");
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pref = readStoredPreference();
    setPreferenceState(pref);
    setTheme(resolve(pref));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const applied = resolve(preference);
    setTheme(applied);
    document.documentElement.classList.toggle("dark", applied === "dark");
    localStorage.setItem(STORAGE_KEY, preference);
    localStorage.removeItem("kubera-theme");
  }, [preference, ready]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
  }, []);

  const cyclePreference = useCallback(() => {
    setPreferenceState((p) =>
      p === "system" ? "light" : p === "light" ? "dark" : "system",
    );
  }, []);

  return (
    <ThemeContext.Provider
      value={{ preference, theme, setPreference, cyclePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
