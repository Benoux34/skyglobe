import { ALTITUDE_GRADIENT_CSS, MAX_ALTITUDE_FEET } from "@/features/flights/domain/altitude";
import { Panel } from "@/shared/ui/Panel";

const TICKS = [0, 15_000, 30_000, MAX_ALTITUDE_FEET] as const;

export function AltitudeLegend() {
  return (
    <Panel className="w-64 px-4 py-3" aria-label="Altitude colour legend">
      <div className="h-1.5 rounded-full" style={{ background: ALTITUDE_GRADIENT_CSS }} />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
        {TICKS.map((feet) => (
          <span key={feet}>{feet === 0 ? "0 ft" : `${feet / 1000}k`}</span>
        ))}
      </div>
    </Panel>
  );
}
