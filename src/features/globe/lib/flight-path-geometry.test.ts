import { describe, expect, it } from "vitest";
import { latLonToUnitVector, SURFACE_RADIUS } from "./coordinates";
import { trackPositions, writeArc } from "./flight-path-geometry";

describe("writeArc", () => {
  it("follows the great circle and interpolates the radius", () => {
    const out = new Float32Array(3 * 3);
    writeArc(out, [1.02, 0, 0], [0, 0, -1]);

    const midpoint = latLonToUnitVector(0, 45);
    expect([...out.slice(0, 3)]).toEqual([expect.closeTo(1.02), 0, 0]);
    expect(out[3]).toBeCloseTo(midpoint[0] * 1.01, 5);
    expect(out[4]).toBeCloseTo(0, 5);
    expect(out[5]).toBeCloseTo(midpoint[2] * 1.01, 5);
    expect(out[8]).toBeCloseTo(-1, 5);
  });

  it("does not divide by zero when both ends coincide", () => {
    const out = new Float32Array(2 * 3);
    writeArc(out, [1, 0, 0], [1, 0, 0]);
    expect([...out]).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

describe("trackPositions", () => {
  it("lifts waypoints to their altitude and keeps ground points off the surface", () => {
    const [ground, cruise] = trackPositions([
      [0, 0, 0, null],
      [60, 0, 0, 10_000],
    ]);
    expect(ground?.[0]).toBeCloseTo(SURFACE_RADIUS, 9);
    expect(cruise?.[0]).toBeGreaterThan(1.01);
  });
});
