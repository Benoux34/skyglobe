"use client";

import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectSelectedAircraft } from "@/features/flights/store/selectors";
import { COMPACT_LAYOUT_QUERY, useMediaQuery } from "@/shared/lib/use-media-query";
import { DesktopHud } from "./DesktopHud";
import { LoadingState } from "./LoadingState";
import { MobileHud } from "./MobileHud";

/** Everything drawn above the globe. Only the panels themselves capture the pointer. */
export function Hud() {
  const selected = useFlightsStore(selectSelectedAircraft);
  const compact = useMediaQuery(COMPACT_LAYOUT_QUERY);

  return (
    <>
      <LoadingState />
      {compact ? <MobileHud selected={selected} /> : <DesktopHud selected={selected} />}
    </>
  );
}
