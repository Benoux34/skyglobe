import { geoEquirectangular, geoPath } from "d3-geo";
import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace } from "three";
import { feature, mesh } from "topojson-client";
import { loadWorld } from "./world-map";

const WIDTH = 4096;
const HEIGHT = 2048;
const BORDER_WIDTH_PX = 1.5;

/**
 * Rasterises Natural Earth outlines into a data texture:
 * red channel = land, green channel = country borders.
 * The shader colours it, so switching theme never redraws the map.
 */
async function createLandTexture(): Promise<CanvasTexture> {
  const world = await loadWorld();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2D canvas is not available.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // The outlines are spherical polygons: some cross the antimeridian and Antarctica
  // encloses a pole. d3-geo clips them correctly; drawing raw coordinates would not.
  const projection = geoEquirectangular().fitSize([WIDTH, HEIGHT], { type: "Sphere" });
  const path = geoPath(projection, context);

  context.fillStyle = "#ff0000";
  context.beginPath();
  path(feature(world, world.objects.land));
  context.fill();

  // "lighter" adds green on top of red instead of replacing it.
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = "#00ff00";
  context.lineWidth = BORDER_WIDTH_PX;
  context.lineJoin = "round";
  context.beginPath();
  path(mesh(world, world.objects.countries, (a, b) => a !== b));
  context.stroke();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  return texture;
}

let cached: Promise<CanvasTexture> | null = null;

/** Shared promise, suitable for React's `use()`. */
export function loadLandTexture(): Promise<CanvasTexture> {
  cached ??= createLandTexture();
  return cached;
}
