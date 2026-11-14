export const satelliteVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;

  uniform float uPixelRatio;

  varying vec3 vColor;

  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Constant size on screen, whatever the distance: sizes are in CSS pixels.
    gl_PointSize = aSize * uPixelRatio;
  }
`;

/** A solid round core inside a faint halo, so each satellite reads as a small light. */
export const satelliteFragmentShader = /* glsl */ `
  varying vec3 vColor;

  const float CORE_RADIUS = 0.42;
  const float HALO_OPACITY = 0.3;

  void main() {
    // 0 at the centre of the point, 1 on its edge.
    float distanceToCentre = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(CORE_RADIUS - 0.12, CORE_RADIUS + 0.06, distanceToCentre);
    float halo = HALO_OPACITY * (1.0 - smoothstep(CORE_RADIUS, 1.0, distanceToCentre));
    float alpha = max(core, halo);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }
`;
