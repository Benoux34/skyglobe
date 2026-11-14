import { create } from "zustand";
import { latLonToUnitVector, type Vec3 } from "../lib/coordinates";

export interface FlyToRequest {
  /** Point of the globe to bring under the camera, as a unit vector. */
  readonly direction: Vec3;
  /**
   * How far from the Earth's centre the camera should end, in Earth radii.
   * `null` zooms in to the usual close-up, never out.
   */
  readonly distance: number | null;
  /** Monotonic id so that asking for the same place twice still triggers. */
  readonly requestId: number;
}

interface CameraStore {
  readonly flyToRequest: FlyToRequest | null;
  /** Asks the camera to fly above a fixed place. */
  flyTo(latitude: number, longitude: number, distance?: number): void;
}

export const useCameraStore = create<CameraStore>()((set) => ({
  flyToRequest: null,
  flyTo: (latitude, longitude, distance) =>
    set((state) => ({
      flyToRequest: {
        direction: latLonToUnitVector(latitude, longitude),
        distance: distance ?? null,
        requestId: (state.flyToRequest?.requestId ?? 0) + 1,
      },
    })),
}));
