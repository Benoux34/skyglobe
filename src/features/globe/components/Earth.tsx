"use client";

import { use, useEffect, useMemo } from "react";
import { Color } from "three";
import { loadLandTexture } from "../lib/land-texture";
import type { GlobePalette } from "../lib/palette";
import { earthFragmentShader, earthVertexShader } from "../shaders/earth";

interface EarthProps {
  readonly palette: GlobePalette;
}

export function Earth({ palette }: EarthProps) {
  const landMask = use(loadLandTexture());

  const uniforms = useMemo(
    () => ({
      uLandMask: { value: landMask },
      uOcean: { value: new Color() },
      uLand: { value: new Color() },
      uBorder: { value: new Color() },
      uRim: { value: new Color() },
    }),
    [landMask],
  );

  useEffect(() => {
    uniforms.uOcean.value.set(palette.ocean);
    uniforms.uLand.value.set(palette.land);
    uniforms.uBorder.value.set(palette.border);
    uniforms.uRim.value.set(palette.rim);
  }, [uniforms, palette]);

  return (
    <mesh>
      <sphereGeometry args={[1, 128, 96]} />
      <shaderMaterial
        vertexShader={earthVertexShader}
        fragmentShader={earthFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
