"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import type { Locator } from "../lib/aircraft-locator";
import { isHiddenByEarth } from "../lib/view";

type LabelTone = "default" | "emphasized" | "alert";

const TONE_CLASSES: Readonly<Record<LabelTone, string>> = {
  default: "border-line bg-surface text-fg",
  emphasized: "border-fg bg-fg text-background font-semibold",
  alert: "border-alert bg-alert text-white font-semibold",
};

const TAG_CLASSES =
  "pointer-events-none absolute top-0 left-0 rounded-md border px-1.5 py-0.5 font-mono text-xs whitespace-nowrap";

/** Pixels the tag sits above its anchor, so it does not cover the aircraft. */
const TAG_LIFT = 24;

interface GlobeLabelProps {
  readonly text: string;
  readonly tone?: LabelTone;
  /** Called every frame to place the label and decide whether it is shown. */
  readonly locate: Locator;
}

/**
 * Text tag that follows a point of the globe and hides when the Earth is in the way.
 * It is a plain DOM element laid over the canvas and moved every frame.
 */
export function GlobeLabel({ text, tone = "default", locate }: GlobeLabelProps) {
  const overlay = useThree((state) => state.gl.domElement.parentElement);
  const tagRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef(new Vector3());

  useEffect(() => {
    if (overlay === null) return;
    const tag = document.createElement("div");
    tag.className = `${TAG_CLASSES} ${TONE_CLASSES[tone]}`;
    tag.textContent = text;
    tag.style.visibility = "hidden";
    overlay.appendChild(tag);
    tagRef.current = tag;
    return () => {
      tag.remove();
      tagRef.current = null;
    };
  }, [overlay, text, tone]);

  useFrame(({ camera, size }) => {
    const tag = tagRef.current;
    if (tag === null) return;

    const anchor = anchorRef.current;
    const shown = locate(anchor) && !isHiddenByEarth(anchor.x, anchor.y, anchor.z, camera.position);
    tag.style.visibility = shown ? "visible" : "hidden";
    if (!shown) return;

    anchor.project(camera);
    const x = (anchor.x * 0.5 + 0.5) * size.width;
    const y = (0.5 - anchor.y * 0.5) * size.height;
    tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-50% - ${TAG_LIFT}px))`;
  });

  return null;
}
