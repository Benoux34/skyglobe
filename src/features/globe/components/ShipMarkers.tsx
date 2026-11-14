"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Group } from "three";
import { shipDisplayName } from "@/features/ships/domain/ship";
import {
  selectHoveredShip,
  selectSelectedShip,
  useShipsStore,
} from "@/features/ships/store/ships-store";
import type { GlobePalette } from "../lib/palette";
import { shipLocator, type ShipField } from "../lib/ship-field";
import { GlobeLabel } from "./GlobeLabel";

/** Ring radius as a fraction of its distance to the camera: a constant size on screen. */
const RING_SCREEN_SIZE = 0.016;

interface ShipMarkersProps {
  readonly field: ShipField;
  readonly palette: GlobePalette;
}

/** Ring and name of the selected ship, plus a name tag for the hovered one. */
export function ShipMarkers({ field, palette }: ShipMarkersProps) {
  const selected = useShipsStore(selectSelectedShip);
  const hovered = useShipsStore(selectHoveredShip);
  const ringRef = useRef<Group>(null);

  useFrame(({ camera }) => {
    const ring = ringRef.current;
    if (ring === null) return;
    ring.visible = selected !== null && shipLocator(field, selected.mmsi)(ring.position);
    if (ring.visible) {
      ring.scale.setScalar(camera.position.distanceTo(ring.position) * RING_SCREEN_SIZE);
      ring.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <>
      <group ref={ringRef} visible={false}>
        <mesh>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={palette.ink} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>

      {selected !== null && (
        <GlobeLabel
          text={shipDisplayName(selected)}
          tone="emphasized"
          locate={shipLocator(field, selected.mmsi)}
        />
      )}
      {hovered !== null && hovered.mmsi !== selected?.mmsi && (
        <GlobeLabel text={shipDisplayName(hovered)} locate={shipLocator(field, hovered.mmsi)} />
      )}
    </>
  );
}
