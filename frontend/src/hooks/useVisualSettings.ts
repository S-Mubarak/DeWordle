import { useState, useEffect } from "react";

export interface VisualSettings {
  theme: "light" | "dark" | "system";
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";
}

const DEFAULT_SETTINGS: VisualSettings = {
  theme: "system",
  highContrast: false,
  fontSize: "medium",
};

const STORAGE_KEY = "dewordle_visual_settings";

export function useVisualSettings() {
  const [settings, setSettings] = useState<VisualSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // localStorage unavailable
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage unavailable
    }
  }, [settings]);

  function updateSetting<K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return { settings, updateSetting, resetSettings };
}