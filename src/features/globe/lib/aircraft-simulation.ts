import type { Aircraft, Icao24 } from "@/features/flights/domain/aircraft";
import {
  altitudeToRadius,
  EARTH_RADIUS_METRES,
  latLonToUnitVector,
  trackToTangent,
} from "./coordinates";

/** Positions are never extrapolated further than this from their last report. */
const MAX_EXTRAPOLATION_SECONDS = 30 * 60;

/**
 * One aircraft in scene space. `up*` is the unit vector from the Earth's
 * centre to the aircraft, `heading*` the unit tangent it flies along.
 */
export interface SimulatedAircraft {
  readonly aircraft: Aircraft;
  /** Distance from the Earth's centre, in Earth radii. */
  readonly radius: number;
  visible: boolean;
  upX: number;
  upY: number;
  upZ: number;
  headingX: number;
  headingY: number;
  headingZ: number;
}

interface Kinematics {
  readonly entity: SimulatedAircraft;
  readonly up0: readonly [number, number, number];
  readonly heading0: readonly [number, number, number];
  /** Radians per second along the great circle. */
  readonly angularSpeed: number;
  readonly positionTime: number;
}

function toKinematics(aircraft: Aircraft): Kinematics {
  const up0 = latLonToUnitVector(aircraft.latitude, aircraft.longitude);
  const heading0 = trackToTangent(aircraft.latitude, aircraft.longitude, aircraft.track ?? 0);
  const moving = !aircraft.onGround && aircraft.track !== null && aircraft.velocity !== null;

  return {
    entity: {
      aircraft,
      radius: altitudeToRadius(aircraft.altitude),
      visible: true,
      upX: up0[0],
      upY: up0[1],
      upZ: up0[2],
      headingX: heading0[0],
      headingY: heading0[1],
      headingZ: heading0[2],
    },
    up0,
    heading0,
    angularSpeed: moving ? (aircraft.velocity ?? 0) / EARTH_RADIUS_METRES : 0,
    positionTime: aircraft.positionTime,
  };
}

/**
 * Dead-reckoning model of every aircraft in a snapshot: between two snapshots
 * each aircraft keeps flying along its great circle at its last known speed.
 * Framework-free on purpose; the React layer only reads `entities`.
 */
export class AircraftSimulation {
  private kinematics: Kinematics[] = [];
  private index = new Map<Icao24, SimulatedAircraft>();
  private currentEntities: readonly SimulatedAircraft[] = [];

  get entities(): readonly SimulatedAircraft[] {
    return this.currentEntities;
  }

  load(aircraft: readonly Aircraft[]): void {
    this.kinematics = aircraft.map(toKinematics);
    this.currentEntities = this.kinematics.map((k) => k.entity);
    this.index = new Map(this.currentEntities.map((e) => [e.aircraft.icao24, e]));
  }

  setVisibility(isVisible: (aircraft: Aircraft) => boolean): void {
    for (const entity of this.currentEntities) entity.visible = isVisible(entity.aircraft);
  }

  find(icao24: Icao24): SimulatedAircraft | null {
    return this.index.get(icao24) ?? null;
  }

  /** Moves every aircraft to its estimated position at `unixSeconds`. */
  advance(unixSeconds: number): void {
    for (const { entity, up0, heading0, angularSpeed, positionTime } of this.kinematics) {
      if (angularSpeed === 0) continue;
      const elapsed = Math.min(MAX_EXTRAPOLATION_SECONDS, Math.max(0, unixSeconds - positionTime));
      const angle = angularSpeed * elapsed;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      entity.upX = up0[0] * cos + heading0[0] * sin;
      entity.upY = up0[1] * cos + heading0[1] * sin;
      entity.upZ = up0[2] * cos + heading0[2] * sin;
      entity.headingX = heading0[0] * cos - up0[0] * sin;
      entity.headingY = heading0[1] * cos - up0[1] * sin;
      entity.headingZ = heading0[2] * cos - up0[2] * sin;
    }
  }
}
