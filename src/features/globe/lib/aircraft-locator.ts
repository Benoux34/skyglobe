import type { Vector3 } from "three";
import type { Icao24 } from "@/features/flights/domain/aircraft";
import type { AircraftSimulation } from "./aircraft-simulation";

/** Writes an anchor's world position into `target`; returns whether it is currently shown. */
export type Locator = (target: Vector3) => boolean;

/** Locator that tracks the simulated position of one aircraft. */
export function aircraftLocator(simulation: AircraftSimulation, icao24: Icao24): Locator {
  return (target) => {
    const entity = simulation.find(icao24);
    if (entity === null || !entity.visible) return false;
    target.set(entity.upX, entity.upY, entity.upZ).multiplyScalar(entity.radius);
    return true;
  };
}
