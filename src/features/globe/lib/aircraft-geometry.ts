import { Shape, ShapeGeometry } from "three";

/** Right half of an airliner silhouette, nose towards +Y, in a unit box. */
const HALF_OUTLINE: readonly (readonly [x: number, y: number])[] = [
  [0, 0.5],
  [0.055, 0.4],
  [0.07, 0.14],
  [0.5, -0.1],
  [0.5, -0.19],
  [0.07, -0.08],
  [0.055, -0.33],
  [0.2, -0.44],
  [0.2, -0.5],
  [0, -0.45],
];

/** Flat top-down aircraft icon lying in the XY plane, facing +Z. */
export function createAircraftGeometry(): ShapeGeometry {
  const mirrored = HALF_OUTLINE.slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as const);

  const shape = new Shape();
  [...HALF_OUTLINE, ...mirrored].forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return new ShapeGeometry(shape);
}
