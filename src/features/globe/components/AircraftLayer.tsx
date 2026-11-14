"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, MeshBasicMaterial, type InstancedMesh } from "three";
import { aircraftColor } from "@/features/flights/domain/altitude";
import { EMERGENCY_COLOR, emergencyOf, findEmergencies } from "@/features/flights/domain/emergency";
import { matchesFilters } from "@/features/flights/domain/filters";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { selectAllAircraft } from "@/features/flights/store/selectors";
import { useLayersStore } from "@/features/layers/layers-store";
import { createAircraftGeometry } from "../lib/aircraft-geometry";
import type { AircraftSimulation } from "../lib/aircraft-simulation";
import type { GlobePalette } from "../lib/palette";
import { aircraftIconScale } from "../lib/view";

const HIGHLIGHT_SCALE = 1.9;
const MATRIX_SIZE = 16;

interface AircraftLayerProps {
  readonly simulation: AircraftSimulation;
  readonly palette: GlobePalette;
}

/** Draws every aircraft of the current snapshot as one instanced mesh. */
export function AircraftLayer({ simulation, palette }: AircraftLayerProps) {
  const aircraft = useFlightsStore(selectAllAircraft);
  const filters = useFlightsStore((state) => state.filters);
  const layerVisible = useLayersStore((state) => state.visible.aircraft);
  const meshRef = useRef<InstancedMesh>(null);

  // Aircraft in distress are drawn larger, like the selected one.
  const emergencyIds = useMemo(
    () => new Set(findEmergencies(aircraft).map((a) => a.icao24)),
    [aircraft],
  );

  const geometry = useMemo(() => createAircraftGeometry(), []);
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

  useEffect(() => {
    material.color.set(palette.aircraftTint);
  }, [material, palette]);

  useLayoutEffect(() => {
    simulation.load(aircraft);

    const mesh = meshRef.current;
    if (mesh === null) return;
    const color = new Color();
    simulation.entities.forEach((entity, index) => {
      const [red, green, blue] =
        emergencyOf(entity.aircraft) === null ? aircraftColor(entity.aircraft) : EMERGENCY_COLOR;
      mesh.setColorAt(index, color.setRGB(red / 255, green / 255, blue / 255, "srgb"));
    });
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }, [simulation, aircraft]);

  useLayoutEffect(() => {
    simulation.setVisibility((a) => layerVisible && matchesFilters(a, filters));
  }, [simulation, aircraft, filters, layerVisible]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (mesh === null) return;

    simulation.advance(Date.now() / 1000);

    const { selectedId, hoveredId } = useFlightsStore.getState();
    const baseScale = aircraftIconScale(camera.position.length());
    const matrices = mesh.instanceMatrix.array;

    simulation.entities.forEach((entity, index) => {
      const { upX, upY, upZ, headingX, headingY, headingZ, radius } = entity;
      const id = entity.aircraft.icao24;
      const scale = !entity.visible
        ? 0
        : id === selectedId || id === hoveredId || emergencyIds.has(id)
          ? baseScale * HIGHLIGHT_SCALE
          : baseScale;

      // Columns: right wing (heading × up), nose (heading), top (up), position.
      const offset = index * MATRIX_SIZE;
      matrices[offset] = (headingY * upZ - headingZ * upY) * scale;
      matrices[offset + 1] = (headingZ * upX - headingX * upZ) * scale;
      matrices[offset + 2] = (headingX * upY - headingY * upX) * scale;
      matrices[offset + 3] = 0;
      matrices[offset + 4] = headingX * scale;
      matrices[offset + 5] = headingY * scale;
      matrices[offset + 6] = headingZ * scale;
      matrices[offset + 7] = 0;
      matrices[offset + 8] = upX * scale;
      matrices[offset + 9] = upY * scale;
      matrices[offset + 10] = upZ * scale;
      matrices[offset + 11] = 0;
      matrices[offset + 12] = upX * radius;
      matrices[offset + 13] = upY * radius;
      matrices[offset + 14] = upZ * radius;
      matrices[offset + 15] = 1;
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (aircraft.length === 0) return null;

  return (
    <instancedMesh
      // A new snapshot may change the instance count, which requires a new mesh.
      key={aircraft.length}
      ref={meshRef}
      args={[geometry, material, aircraft.length]}
      frustumCulled={false}
    />
  );
}
