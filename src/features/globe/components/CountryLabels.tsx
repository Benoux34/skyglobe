"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useRef } from "react";
import { Vector3 } from "three";
import { loadCountryLabels } from "../lib/country-labels";

/**
 * Smallest country named at a given zoom, in steradians per squared distance to
 * the surface: names appear as the camera gets closer instead of piling up.
 */
const AREA_PER_ZOOM = 0.0022;
/** Names fade out before the limb, where they would be squeezed and unreadable. */
const LIMB_MARGIN = 0.18;

const LAYER_CLASSES = "pointer-events-none absolute inset-0 overflow-hidden";
const TAG_CLASSES =
  "absolute top-0 left-0 text-[10px] font-medium tracking-[0.14em] whitespace-nowrap text-muted uppercase select-none";

interface Tag {
  readonly element: HTMLDivElement;
  shown: boolean;
}

/** Country names laid over the canvas, under the aircraft tags. */
export function CountryLabels() {
  const labels = use(loadCountryLabels());
  const canvas = useThree((state) => state.gl.domElement);
  const tagsRef = useRef<readonly Tag[]>([]);
  const anchorRef = useRef(new Vector3());

  useEffect(() => {
    const layer = document.createElement("div");
    layer.className = LAYER_CLASSES;
    tagsRef.current = labels.map((label) => {
      const element = document.createElement("div");
      element.className = TAG_CLASSES;
      element.textContent = label.name;
      element.style.visibility = "hidden";
      layer.appendChild(element);
      return { element, shown: false };
    });
    // Right after the canvas, so every other overlay is drawn above the names.
    canvas.after(layer);
    return () => {
      layer.remove();
      tagsRef.current = [];
    };
  }, [canvas, labels]);

  useFrame(({ camera, size }) => {
    const tags = tagsRef.current;
    const anchor = anchorRef.current;
    const { x: cameraX, y: cameraY, z: cameraZ } = camera.position;
    const altitude = camera.position.length() - 1;
    const minArea = AREA_PER_ZOOM * altitude * altitude;
    const minFacing = 1 + LIMB_MARGIN * altitude;

    labels.forEach((label, index) => {
      const tag = tags[index];
      if (tag === undefined) return;

      const [x, y, z] = label.position;
      const shown = label.area >= minArea && x * cameraX + y * cameraY + z * cameraZ > minFacing;
      if (shown !== tag.shown) {
        tag.shown = shown;
        tag.element.style.visibility = shown ? "visible" : "hidden";
      }
      if (!shown) return;

      anchor.set(x, y, z).project(camera);
      const left = (anchor.x * 0.5 + 0.5) * size.width;
      const top = (0.5 - anchor.y * 0.5) * size.height;
      tag.element.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`;
    });
  });

  return null;
}
