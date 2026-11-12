export const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

/** Flat two-tone map: land and borders over ocean, with a faint limb tint for volume. */
export const earthFragmentShader = /* glsl */ `
  uniform sampler2D uLandMask;
  uniform vec3 uOcean;
  uniform vec3 uLand;
  uniform vec3 uBorder;
  uniform vec3 uRim;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 mask = texture2D(uLandMask, vUv);
    float land = smoothstep(0.35, 0.65, mask.r);
    float border = smoothstep(0.2, 0.8, mask.g);

    vec3 color = mix(uOcean, uLand, land);
    color = mix(color, uBorder, border * land);

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float limb = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), 2.5);
    color = mix(color, uRim, limb * 0.55);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
