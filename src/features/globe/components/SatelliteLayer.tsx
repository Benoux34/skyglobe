"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, type Points } from "three";
import type { SatelliteGroup } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import type { GlobePalette } from "../lib/palette";
import type { SatelliteSimulation } from "../lib/satellite-simulation";
import { satelliteFragmentShader, satelliteVertexShader } from "../shaders/satellites";

/**
 * Diameter of each dot in CSS pixels, halo included. Starlink is two thirds of
 * the catalogue and stays small; the two crewed stations are easy to spot.
 */
const POINT_SIZES: Readonly<Record<SatelliteGroup, number>> = {
  station: 17,
  navigation: 10,
  other: 8,
  starlink: 5.5,
};

interface SatelliteLayerProps {
  readonly simulation: SatelliteSimulation;
  readonly palette: GlobePalette;
}

/** Draws every satellite of the catalogue as one cloud of round dots, coloured by group. */
export function SatelliteLayer({ simulation, palette }: SatelliteLayerProps) {
  const catalog = useSatellitesStore((state) => state.catalog);
  const groups = useSatellitesStore((state) => state.groups);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => new BufferGeometry(), []);
  const uniforms = useMemo(() => ({ uPixelRatio: { value: pixelRatio } }), [pixelRatio]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    simulation.load(catalog);
    geometry.setAttribute(
      "position",
      new BufferAttribute(simulation.positions, 3).setUsage(DynamicDrawUsage),
    );
    geometry.setAttribute(
      "aSize",
      new BufferAttribute(
        Float32Array.from(catalog, (record) => POINT_SIZES[record.group]),
        1,
      ),
    );
  }, [simulation, catalog, geometry]);

  useLayoutEffect(() => {
    const colors = new Float32Array(catalog.length * 3);
    const color = new Color();
    catalog.forEach((record, index) => {
      color.set(palette.satellites[record.group]);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });
    geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  }, [catalog, palette, geometry]);

  useLayoutEffect(() => {
    simulation.setVisibility((record) => groups[record.group]);
  }, [simulation, catalog, groups]);

  useFrame(() => {
    simulation.advance(Date.now() / 1000);
    const positions = pointsRef.current?.geometry.getAttribute("position");
    if (positions !== undefined) positions.needsUpdate = true;
  });

  if (catalog.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={satelliteVertexShader}
        fragmentShader={satelliteFragmentShader}
        uniforms={uniforms}
        transparent
        // Halos overlap: writing depth would let one dot punch a hole in its neighbour.
        depthWrite={false}
      />
    </points>
  );
}
