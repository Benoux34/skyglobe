import type { ComponentPropsWithoutRef } from "react";

/** Flat surface used by every floating HUD element. */
export function Panel({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={`border-line bg-surface/90 pointer-events-auto rounded-xl border backdrop-blur-md ${className}`}
      {...props}
    />
  );
}
