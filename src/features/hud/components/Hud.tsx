"use client";

import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectSelectedAircraft } from "@/features/flights/store/selectors";
import {
  selectSelectedSatellite,
  useSatellitesStore,
} from "@/features/satellites/store/satellites-store";
import { selectSelectedShip, useShipsStore } from "@/features/ships/store/ships-store";
import { COMPACT_LAYOUT_QUERY, useMediaQuery } from "@/shared/lib/use-media-query";
import { DesktopHud } from "./DesktopHud";
import { LoadingState } from "./LoadingState";
import { MobileHud } from "./MobileHud";

/** Everything drawn above the globe. Only the panels themselves capture the pointer. */
export function Hud() {
  const aircraft = useFlightsStore(selectSelectedAircraft);
  const satellite = useSatellitesStore(selectSelectedSatellite);
  const ship = useShipsStore(selectSelectedShip);
  const compact = useMediaQuery(COMPACT_LAYOUT_QUERY);
  const Layout = compact ? MobileHud : DesktopHud;

  return (
    <>
      <LoadingState />
      <Layout aircraft={aircraft} satellite={satellite} ship={ship} />
    </>
  );
}
