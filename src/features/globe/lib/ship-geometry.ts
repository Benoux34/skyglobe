import { Shape, ShapeGeometry } from "three";

/** Hull seen from above, bow towards +Y, in a unit box. */
const OUTLINE: readonly (readonly [x: number, y: number])[] = [
  [0, 0.5],
  [0.19, 0.14],
  [0.19, -0.4],
  [0.11, -0.5],
  [-0.11, -0.5],
  [-0.19, -0.4],
  [-0.19, 0.14],
];

/** Flat top-down ship icon lying in the XY plane, facing +Z. */
export function createShipGeometry(): ShapeGeometry {
  const shape = new Shape();
  OUTLINE.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return new ShapeGeometry(shape);
}
