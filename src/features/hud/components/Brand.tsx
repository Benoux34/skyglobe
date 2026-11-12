import { Plane } from "lucide-react";

interface BrandProps {
  /** Drops the tagline where space is short. */
  readonly compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid size-9 place-items-center rounded-lg bg-fg">
        <Plane className="size-5 -rotate-45 text-background" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="leading-tight">
        <h1 className="text-base font-semibold tracking-tight text-fg">SkyGlobe</h1>
        {!compact && <p className="text-xs text-muted">Live air traffic</p>}
      </div>
    </div>
  );
}
