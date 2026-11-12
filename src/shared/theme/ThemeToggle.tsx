"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "./use-theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="border-line bg-surface/90 text-muted hover:text-fg pointer-events-auto grid size-10 place-items-center rounded-lg border backdrop-blur-md transition-colors"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
