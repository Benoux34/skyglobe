"use client";

import { clamp } from "@/shared/lib/units";

interface RangeSliderProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: { readonly min: number; readonly max: number };
  readonly onChange: (value: { min: number; max: number }) => void;
}

/** Two-thumb slider built from a pair of stacked native range inputs. */
export function RangeSlider({ label, min, max, step, value, onChange }: RangeSliderProps) {
  const toPercent = (v: number): number => ((v - min) / (max - min)) * 100;

  return (
    <div className="relative h-5">
      <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg"
        style={{ left: `${toPercent(value.min)}%`, right: `${100 - toPercent(value.max)}%` }}
      />
      <input
        type="range"
        className="range-thumb"
        aria-label={`${label} minimum`}
        min={min}
        max={max}
        step={step}
        value={value.min}
        onChange={(event) =>
          onChange({
            min: clamp(Number(event.target.value), min, value.max - step),
            max: value.max,
          })
        }
      />
      <input
        type="range"
        className="range-thumb"
        aria-label={`${label} maximum`}
        min={min}
        max={max}
        step={step}
        value={value.max}
        onChange={(event) =>
          onChange({
            min: value.min,
            max: clamp(Number(event.target.value), value.min + step, max),
          })
        }
      />
    </div>
  );
}
