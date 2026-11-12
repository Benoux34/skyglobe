"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Vector3 } from "three";

interface GlobeLabelProps {
  readonly text: string;
  readonly emphasized?: boolean;
  /**
   * Writes the anchor's world position into `target` and returns whether the
   * label should currently be shown. Called every frame.
   */
  readonly locate: (target: Vector3) => boolean;
}

/** Text tag that follows a point of the globe and hides when the Earth is in the way. */
export function GlobeLabel({ text, emphasized = false, locate }: GlobeLabelProps) {
  const groupRef = useRef<Group>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  useFrame(({ camera }) => {
    const group = groupRef.current;
    const tag = tagRef.current;
    if (group === null || tag === null) return;

    const { position } = group;
    // Horizon test: the point is visible when it lies on the camera's side of the limb.
    const shown = locate(position) && position.dot(camera.position) > position.length();
    tag.style.visibility = shown ? "visible" : "hidden";
  });

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={tagRef}
          style={{ visibility: "hidden" }}
          className={`-translate-y-6 rounded-md border px-1.5 py-0.5 font-mono text-xs whitespace-nowrap ${
            emphasized
              ? "border-fg bg-fg text-background font-semibold"
              : "border-line bg-surface text-fg"
          }`}
        >
          {text}
        </div>
      </Html>
    </group>
  );
}
