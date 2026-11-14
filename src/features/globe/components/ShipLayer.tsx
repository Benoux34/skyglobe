"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, MeshBasicMaterial, type InstancedMesh } from "three";
import type { Mmsi } from "@/features/ships/domain/ship";
import { useShipsStore } from "@/features/ships/store/ships-store";
import { SURFACE_RADIUS } from "../lib/coordinates";
import type { GlobePalette } from "../lib/palette";
import type { ShipField } from "../lib/ship-field";
import { createShipGeometry } from "../lib/ship-geometry";
import { shipIconScale } from "../lib/view";

const HIGHLIGHT_SCALE = 1.9;
const MATRIX_SIZE = 16;
/** Icons are resized once the zoom has changed their size by this fraction. */
const RESIZE_THRESHOLD = 0.01;

/** What the icons were last laid out for. */
interface Layout {
  readonly scale: number;
  readonly selectedId: Mmsi | null;
  readonly hoveredId: Mmsi | null;
}

interface ShipLayerProps {
  readonly field: ShipField;
  readonly palette: GlobePalette;
}

/** Draws every ship of the snapshot as one instanced mesh of small hulls, coloured by category. */
export function ShipLayer({ field, palette }: ShipLayerProps) {
  const ships = useShipsStore((state) => state.ships);
  const categories = useShipsStore((state) => state.categories);
  const meshRef = useRef<InstancedMesh>(null);
  /** `null` asks the next frame to lay the icons out again. */
  const layoutRef = useRef<Layout | null>(null);

  const geometry = useMemo(() => createShipGeometry(), []);
  const material = useMemo(
    () => new MeshBasicMaterial({ side: DoubleSide, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useLayoutEffect(() => {
    field.load(ships);
    layoutRef.current = null;

    const mesh = meshRef.current;
    if (mesh === null) return;
    const color = new Color();
    ships.forEach((ship, index) => {
      mesh.setColorAt(index, color.set(palette.ships[ship.category]));
    });
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }, [field, ships, palette]);

  useLayoutEffect(() => {
    field.setVisibility((ship) => categories[ship.category]);
    layoutRef.current = null;
  }, [field, ships, categories]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    // Ships stay where they are between snapshots: the icons only need a new
    // layout when the zoom, the selection or the hovered ship changes.
    const { selectedId, hoveredId } = useShipsStore.getState();
    const baseScale = shipIconScale(camera.position.length());
    const layout = layoutRef.current;
    if (
      layout !== null &&
      layout.selectedId === selectedId &&
      layout.hoveredId === hoveredId &&
      Math.abs(baseScale - layout.scale) <= layout.scale * RESIZE_THRESHOLD
    ) {
      return;
    }
    layoutRef.current = { scale: baseScale, selectedId, hoveredId };

    const selectedIndex = selectedId === null ? -1 : field.find(selectedId);
    const hoveredIndex = hoveredId === null ? -1 : field.find(hoveredId);
    const { positions, bearings } = field;
    const matrices = mesh.instanceMatrix.array;
    const count = Math.min(field.count, mesh.count);

    for (let index = 0; index < count; index++) {
      const source = index * 3;
      const x = positions[source] ?? 0;
      const y = positions[source + 1] ?? 0;
      const z = positions[source + 2] ?? 0;
      const upX = x / SURFACE_RADIUS;
      const upY = y / SURFACE_RADIUS;
      const upZ = z / SURFACE_RADIUS;
      const bowX = bearings[source] ?? 0;
      const bowY = bearings[source + 1] ?? 0;
      const bowZ = bearings[source + 2] ?? 0;
      const scale = !field.isShown(index)
        ? 0
        : index === selectedIndex || index === hoveredIndex
          ? baseScale * HIGHLIGHT_SCALE
          : baseScale;

      // Columns: starboard (bow × up), bow, top (up), position.
      const offset = index * MATRIX_SIZE;
      matrices[offset] = (bowY * upZ - bowZ * upY) * scale;
      matrices[offset + 1] = (bowZ * upX - bowX * upZ) * scale;
      matrices[offset + 2] = (bowX * upY - bowY * upX) * scale;
      matrices[offset + 3] = 0;
      matrices[offset + 4] = bowX * scale;
      matrices[offset + 5] = bowY * scale;
      matrices[offset + 6] = bowZ * scale;
      matrices[offset + 7] = 0;
      matrices[offset + 8] = upX * scale;
      matrices[offset + 9] = upY * scale;
      matrices[offset + 10] = upZ * scale;
      matrices[offset + 11] = 0;
      matrices[offset + 12] = x;
      matrices[offset + 13] = y;
      matrices[offset + 14] = z;
      matrices[offset + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (ships.length === 0) return null;

  return (
    <instancedMesh
      // A new snapshot may change the instance count, which requires a new mesh.
      key={ships.length}
      ref={meshRef}
      args={[geometry, material, ships.length]}
      frustumCulled={false}
    />
  );
}
