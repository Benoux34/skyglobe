import { describe, expect, it } from "vitest";
import type { SatelliteRecord } from "@/features/satellites/domain/satellite";
import { SatelliteSimulation } from "./satellite-simulation";

const ISS: SatelliteRecord = {
  id: 25544,
  name: "ISS",
  group: "station",
  line1: "1 25544U 98067A   26316.43260916  .00008000  00000+0  15000-3 0  9990",
  line2: "2 25544  51.6324 286.4897 0007327  17.4200 100.0000 15.50000000500000",
};
const BROKEN: SatelliteRecord = {
  id: 1,
  name: "BROKEN",
  group: "other",
  line1: "1 garbage",
  line2: "2 garbage",
};

const NOW = Date.UTC(2026, 10, 12, 12) / 1000;
const radiusOf = (simulation: SatelliteSimulation, index: number): number =>
  Math.hypot(...simulation.positions.subarray(index * 3, index * 3 + 3));

describe("SatelliteSimulation", () => {
  it("places satellites at their true altitude", () => {
    const simulation = new SatelliteSimulation();
    simulation.load([ISS]);
    simulation.advance(NOW);

    expect(simulation.find(25544)).toBe(0);
    expect(simulation.isShown(0)).toBe(true);
    // About 420 km above a 6,371 km sphere.
    expect(radiusOf(simulation, 0)).toBeGreaterThan(1.058);
    expect(radiusOf(simulation, 0)).toBeLessThan(1.07);
  });

  it("keeps satellites moving between two exact positions", () => {
    const simulation = new SatelliteSimulation();
    simulation.load([ISS]);
    simulation.advance(NOW);
    const before = Array.from(simulation.positions);

    // No refresh allowed: the position can only come from extrapolation.
    simulation.advance(NOW + 10, 0);
    const moved = Math.hypot(
      ...Array.from(simulation.positions, (value, index) => value - (before[index] ?? 0)),
    );

    // Roughly 7.3 km/s over the ground for 10 s, in Earth radii.
    expect(moved).toBeGreaterThan(0.009);
    expect(moved).toBeLessThan(0.013);
  });

  it("parks hidden and unusable satellites at the centre", () => {
    const simulation = new SatelliteSimulation();
    simulation.load([ISS, BROKEN]);
    simulation.advance(NOW);
    expect(simulation.isShown(1)).toBe(false);
    expect(radiusOf(simulation, 1)).toBe(0);

    simulation.setVisibility((record) => record.group !== "station");
    simulation.advance(NOW + 1);
    expect(simulation.isShown(0)).toBe(false);
    expect(radiusOf(simulation, 0)).toBe(0);
    expect(simulation.find(999)).toBe(-1);
  });
});
