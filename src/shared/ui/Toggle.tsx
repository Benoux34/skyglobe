"use client";

interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-fg">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
          checked ? "bg-fg" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full transition-transform ${
            checked ? "bg-background translate-x-4" : "bg-muted"
          }`}
        />
      </button>
    </label>
  );
}
