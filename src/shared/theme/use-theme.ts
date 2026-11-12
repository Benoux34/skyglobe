"use client";

import { useSyncExternalStore } from "react";
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, type Theme } from "./theme";

/** The <html> attribute is the single source of truth; CSS tokens key off it. */
const SERVER_THEME: Theme = "dark";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === "light" ? "light" : "dark";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing: the choice simply lasts for this page only.
  }
  listeners.forEach((notify) => notify());
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => SERVER_THEME);
}
