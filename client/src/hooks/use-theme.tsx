import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
  background: string;
  card: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  secondary: string;
  secondaryForeground: string;
  gradientFrom: string;
  gradientTo: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    primary: "263 70% 50%",
    accent: "263 70% 50%",
    background: "240 10% 3.9%",
    card: "240 10% 3.9%",
    foreground: "0 0% 98%",
    muted: "240 3.7% 15.9%",
    mutedForeground: "240 5% 64.9%",
    border: "240 3.7% 15.9%",
    secondary: "240 3.7% 15.9%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "263 70% 50%",
    gradientTo: "280 60% 70%",
  },
  {
    id: "ocean",
    name: "Ocean",
    primary: "190 80% 42%",
    accent: "180 70% 50%",
    background: "210 25% 5%",
    card: "210 25% 5%",
    foreground: "0 0% 98%",
    muted: "210 15% 14%",
    mutedForeground: "210 10% 60%",
    border: "210 15% 14%",
    secondary: "210 15% 14%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "190 80% 42%",
    gradientTo: "170 65% 60%",
  },
  {
    id: "ember",
    name: "Ember",
    primary: "25 90% 48%",
    accent: "40 85% 55%",
    background: "20 10% 5%",
    card: "20 10% 5%",
    foreground: "0 0% 98%",
    muted: "20 8% 14%",
    mutedForeground: "20 8% 60%",
    border: "20 8% 14%",
    secondary: "20 8% 14%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "25 90% 48%",
    gradientTo: "40 85% 60%",
  },
  {
    id: "frost",
    name: "Frost",
    primary: "210 60% 55%",
    accent: "220 20% 65%",
    background: "215 15% 6%",
    card: "215 15% 6%",
    foreground: "0 0% 96%",
    muted: "215 10% 14%",
    mutedForeground: "215 8% 58%",
    border: "215 10% 14%",
    secondary: "215 10% 14%",
    secondaryForeground: "0 0% 96%",
    gradientFrom: "210 60% 55%",
    gradientTo: "200 30% 75%",
  },
  {
    id: "neon",
    name: "Neon",
    primary: "330 85% 55%",
    accent: "90 80% 50%",
    background: "0 0% 3%",
    card: "0 0% 3%",
    foreground: "0 0% 98%",
    muted: "0 0% 12%",
    mutedForeground: "0 0% 55%",
    border: "0 0% 12%",
    secondary: "0 0% 12%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "330 85% 55%",
    gradientTo: "350 75% 70%",
  },
  {
    id: "ruby",
    name: "Ruby",
    primary: "0 72% 51%",
    accent: "350 80% 55%",
    background: "0 10% 4%",
    card: "0 10% 4%",
    foreground: "0 0% 98%",
    muted: "0 5% 14%",
    mutedForeground: "0 5% 60%",
    border: "0 5% 14%",
    secondary: "0 5% 14%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "0 72% 51%",
    gradientTo: "20 85% 60%",
  },
  {
    id: "emerald",
    name: "Emerald",
    primary: "160 84% 39%",
    accent: "142 72% 45%",
    background: "160 15% 4%",
    card: "160 15% 4%",
    foreground: "0 0% 98%",
    muted: "160 8% 13%",
    mutedForeground: "160 5% 58%",
    border: "160 8% 13%",
    secondary: "160 8% 13%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "160 84% 39%",
    gradientTo: "142 72% 55%",
  },
  {
    id: "gold",
    name: "Gold",
    primary: "45 93% 47%",
    accent: "38 92% 50%",
    background: "30 10% 4%",
    card: "30 10% 4%",
    foreground: "0 0% 98%",
    muted: "30 6% 13%",
    mutedForeground: "30 5% 58%",
    border: "30 6% 13%",
    secondary: "30 6% 13%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "45 93% 47%",
    gradientTo: "38 80% 60%",
  },
  {
    id: "sakura",
    name: "Sakura",
    primary: "330 60% 65%",
    accent: "340 55% 70%",
    background: "330 8% 4%",
    card: "330 8% 4%",
    foreground: "0 0% 98%",
    muted: "330 5% 13%",
    mutedForeground: "330 5% 58%",
    border: "330 5% 13%",
    secondary: "330 5% 13%",
    secondaryForeground: "0 0% 98%",
    gradientFrom: "330 60% 65%",
    gradientTo: "350 50% 75%",
  },
  {
    id: "slate",
    name: "Slate",
    primary: "215 20% 55%",
    accent: "220 15% 50%",
    background: "220 12% 5%",
    card: "220 12% 5%",
    foreground: "0 0% 96%",
    muted: "220 8% 13%",
    mutedForeground: "220 6% 55%",
    border: "220 8% 13%",
    secondary: "220 8% 13%",
    secondaryForeground: "0 0% 96%",
    gradientFrom: "215 20% 55%",
    gradientTo: "210 15% 70%",
  },
];

interface ThemeContextValue {
  currentTheme: ThemePreset;
  setTheme: (id: string) => void;
  themes: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--card-foreground", theme.foreground);
  root.style.setProperty("--popover", theme.card);
  root.style.setProperty("--popover-foreground", theme.foreground);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", "210 40% 98%");
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--secondary-foreground", theme.secondaryForeground);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--muted-foreground", theme.mutedForeground);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-foreground", "210 40% 98%");
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--input", theme.border);
  root.style.setProperty("--ring", theme.mutedForeground);
  root.style.setProperty("--theme-gradient-from", theme.gradientFrom);
  root.style.setProperty("--theme-gradient-to", theme.gradientTo);
}

const STORAGE_KEY = "vault-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = THEME_PRESETS.find(t => t.id === saved);
        if (found) return found;
      }
    }
    return THEME_PRESETS[0];
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = useCallback((id: string) => {
    const theme = THEME_PRESETS.find(t => t.id === id);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
