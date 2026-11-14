import { shipBearing, type Mmsi, type Ship } from "@/features/ships/domain/ship";
import type { Locator } from "./aircraft-locator";
import { latLonToUnitVector, SURFACE_RADIUS, trackToTangent } from "./coordinates";
import type { PickablePoints } from "./use-point-picker";

/**
 * Where every ship of the snapshot sits on the globe. Unlike aircraft and
 * satellites, ships are not moved between snapshots: at their speed, the few
 * minutes between two snapshots are far below a pixel.
 */
export class ShipField implements PickablePoints {
  /** Scene position of every ship, xyz. */
  positions = new Float32Array(0);
  /** Unit vector along the surface towards where each ship points, xyz. */
  bearings = new Float32Array(0);

  private ships: readonly Ship[] = [];
  private enabled = new Uint8Array(0);
  private indexByMmsi = new Map<Mmsi, number>();

  get count(): number {
    return this.ships.length;
  }

  load(ships: readonly Ship[]): void {
    if (ships === this.ships) return;
    this.ships = ships;
    this.positions = new Float32Array(ships.length * 3);
    this.bearings = new Float32Array(ships.length * 3);
    this.enabled = new Uint8Array(ships.length).fill(1);
    this.indexByMmsi = new Map(ships.map((ship, index) => [ship.mmsi, index]));

    ships.forEach((ship, index) => {
      const [x, y, z] = latLonToUnitVector(ship.latitude, ship.longitude);
      this.positions.set([x * SURFACE_RADIUS, y * SURFACE_RADIUS, z * SURFACE_RADIUS], index * 3);
      // A ship that says nothing about its direction is drawn pointing north.
      this.bearings.set(
        trackToTangent(ship.latitude, ship.longitude, shipBearing(ship) ?? 0),
        index * 3,
      );
    });
  }

  setVisibility(isVisible: (ship: Ship) => boolean): void {
    this.ships.forEach((ship, index) => {
      this.enabled[index] = isVisible(ship) ? 1 : 0;
    });
  }

  /** Index of a ship in `positions`, or -1. */
  find(mmsi: Mmsi): number {
    return this.indexByMmsi.get(mmsi) ?? -1;
  }

  shipAt(index: number): Ship | null {
    return this.ships[index] ?? null;
  }

  isShown(index: number): boolean {
    return this.enabled[index] === 1;
  }
}

/** Locator that follows one ship across snapshots. */
export function shipLocator(field: ShipField, mmsi: Mmsi): Locator {
  return (target) => {
    const index = field.find(mmsi);
    if (index < 0 || !field.isShown(index)) return false;
    const offset = index * 3;
    target.set(
      field.positions[offset] ?? 0,
      field.positions[offset + 1] ?? 0,
      field.positions[offset + 2] ?? 0,
    );
    return true;
  };
}
