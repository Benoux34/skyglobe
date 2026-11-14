import { useFlightsStore } from "@/features/flights/store/flights-store";
import type { Icao24 } from "@/features/flights/domain/aircraft";
import { EARTH_RADIUS_METRES } from "@/features/globe/lib/coordinates";
import { useCameraStore } from "@/features/globe/store/camera-store";
import type { Launch } from "@/features/launches/domain/launch";
import { useLaunchesStore } from "@/features/launches/store/launches-store";
import { useLayersStore } from "@/features/layers/layers-store";
import { createOrbit, satelliteStateAt } from "@/features/satellites/domain/orbit";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import type { Ship } from "@/features/ships/domain/ship";
import { useShipsStore } from "@/features/ships/store/ships-store";

/** How far behind a satellite the camera stops, in Earth radii, so that it stays in view. */
const SATELLITE_VIEWING_MARGIN = 1.4;

/*
 * "Reveal" = make sure something is drawn, select it and bring the camera to
 * it. Used wherever a list names something that may be hidden or off screen:
 * search results, the sky above the user.
 */

export function revealAircraft(icao24: Icao24): void {
  useLayersStore.getState().setVisible("aircraft", true);
  useFlightsStore.getState().selectAndFocus(icao24);
}

export function revealShip(ship: Ship): void {
  useLayersStore.getState().setVisible("ships", true);
  const ships = useShipsStore.getState();
  ships.setCategoryVisible(ship.category, true);
  ships.select(ship.mmsi);
  useCameraStore.getState().flyTo(ship.latitude, ship.longitude);
}

export function revealSatellite(satellite: SatelliteRecord): void {
  useLayersStore.getState().setVisible("satellites", true);
  const satellites = useSatellitesStore.getState();
  satellites.setGroupVisible(satellite.group, true);
  satellites.select(satellite.id);

  const orbit = createOrbit(satellite);
  const state = orbit === null ? null : satelliteStateAt(orbit, new Date());
  if (state === null) return;
  const radius = 1 + (state.altitudeKm * 1000) / EARTH_RADIUS_METRES;
  useCameraStore
    .getState()
    .flyTo(state.latitude, state.longitude, radius + SATELLITE_VIEWING_MARGIN);
}

export function revealLaunch(launch: Launch): void {
  useLayersStore.getState().setVisible("launches", true);
  useLaunchesStore.getState().select(launch.id);
  if (launch.pad !== null) {
    useCameraStore.getState().flyTo(launch.pad.latitude, launch.pad.longitude);
  }
}
