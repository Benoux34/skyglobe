import {
  createOrbit,
  satelliteStateAt,
  type Orbit,
  type Vec3Km,
} from "@/features/satellites/domain/orbit";
import type { SatelliteId, SatelliteRecord } from "@/features/satellites/domain/satellite";
import type { Locator } from "./aircraft-locator";
import { EARTH_RADIUS_METRES, type Vec3 } from "./coordinates";

const KM_TO_SCENE = 1000 / EARTH_RADIUS_METRES;
/** Each satellite gets an exact position about this often; in between it moves in a straight line. */
const REFRESH_EVERY_FRAMES = 90;
const MIN_REFRESH_PER_FRAME = 64;

/**
 * Earth-fixed kilometres to scene units. The scene has Y through the North
 * Pole and longitude 0 on +X, with east towards −Z. Altitudes are to scale.
 */
export function earthFixedToScene(position: Vec3Km): Vec3 {
  return [position.x * KM_TO_SCENE, position.z * KM_TO_SCENE, -position.y * KM_TO_SCENE];
}

/**
 * Moves every satellite of the catalogue. Solving the orbital model for
 * thousands of satellites on every frame would be too slow, so each frame
 * solves a slice of the catalogue and extrapolates the rest from their last
 * known velocity: over a second or two the error is far below a pixel.
 */
export class SatelliteSimulation {
  /** Scene position of every satellite, xyz. Satellites that are not drawn sit at the centre. */
  positions = new Float32Array(0);

  private records: readonly SatelliteRecord[] = [];
  /** `undefined` until first needed, `null` when the elements are unusable. */
  private orbits: (Orbit | null | undefined)[] = [];
  private base = new Float32Array(0);
  private velocity = new Float32Array(0);
  private refreshedAt = new Float64Array(0);
  private placed = new Uint8Array(0);
  private enabled = new Uint8Array(0);
  private indexById = new Map<SatelliteId, number>();
  private cursor = 0;

  get count(): number {
    return this.records.length;
  }

  load(records: readonly SatelliteRecord[]): void {
    if (records === this.records) return;
    const count = records.length;
    this.records = records;
    this.orbits = new Array<Orbit | null | undefined>(count).fill(undefined);
    this.positions = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    this.velocity = new Float32Array(count * 3);
    this.refreshedAt = new Float64Array(count);
    this.placed = new Uint8Array(count);
    this.enabled = new Uint8Array(count).fill(1);
    this.indexById = new Map(records.map((record, index) => [record.id, index]));
    this.cursor = 0;
  }

  setVisibility(isVisible: (record: SatelliteRecord) => boolean): void {
    this.records.forEach((record, index) => {
      this.enabled[index] = isVisible(record) ? 1 : 0;
    });
  }

  /** Index of a satellite in `positions`, or -1. */
  find(id: SatelliteId): number {
    return this.indexById.get(id) ?? -1;
  }

  recordAt(index: number): SatelliteRecord | null {
    return this.records[index] ?? null;
  }

  /** Whether the satellite is drawn: enabled, and placed by the orbital model. */
  isShown(index: number): boolean {
    return this.placed[index] === 1 && this.enabled[index] === 1;
  }

  advance(nowSeconds: number, budget?: number): void {
    const count = this.records.length;
    if (count === 0) return;

    const refreshes = Math.min(
      count,
      budget ?? Math.max(MIN_REFRESH_PER_FRAME, Math.ceil(count / REFRESH_EVERY_FRAMES)),
    );
    for (let step = 0; step < refreshes; step++) {
      this.refresh(this.cursor, nowSeconds);
      this.cursor = (this.cursor + 1) % count;
    }

    const { positions, base, velocity, refreshedAt } = this;
    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      if (!this.isShown(index)) {
        positions[offset] = 0;
        positions[offset + 1] = 0;
        positions[offset + 2] = 0;
        continue;
      }
      const elapsed = nowSeconds - (refreshedAt[index] ?? nowSeconds);
      positions[offset] = (base[offset] ?? 0) + (velocity[offset] ?? 0) * elapsed;
      positions[offset + 1] = (base[offset + 1] ?? 0) + (velocity[offset + 1] ?? 0) * elapsed;
      positions[offset + 2] = (base[offset + 2] ?? 0) + (velocity[offset + 2] ?? 0) * elapsed;
    }
  }

  private refresh(index: number, nowSeconds: number): void {
    const record = this.records[index];
    if (record === undefined) return;

    let orbit = this.orbits[index];
    if (orbit === undefined) {
      orbit = createOrbit(record);
      this.orbits[index] = orbit;
    }
    const state = orbit === null ? null : satelliteStateAt(orbit, new Date(nowSeconds * 1000));
    if (state === null) {
      this.placed[index] = 0;
      return;
    }

    const offset = index * 3;
    const [x, y, z] = earthFixedToScene(state.position);
    const [velocityX, velocityY, velocityZ] = earthFixedToScene(state.groundVelocity);
    this.base[offset] = x;
    this.base[offset + 1] = y;
    this.base[offset + 2] = z;
    this.velocity[offset] = velocityX;
    this.velocity[offset + 1] = velocityY;
    this.velocity[offset + 2] = velocityZ;
    this.refreshedAt[index] = nowSeconds;
    this.placed[index] = 1;
  }
}

/** Locator that tracks the simulated position of one satellite. */
export function satelliteLocator(simulation: SatelliteSimulation, id: SatelliteId): Locator {
  return (target) => {
    const index = simulation.find(id);
    if (index < 0 || !simulation.isShown(index)) return false;
    const offset = index * 3;
    target.set(
      simulation.positions[offset] ?? 0,
      simulation.positions[offset + 1] ?? 0,
      simulation.positions[offset + 2] ?? 0,
    );
    return true;
  };
}
