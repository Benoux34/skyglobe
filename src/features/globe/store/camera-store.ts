import { create } from "zustand";
import { latLonToUnitVector, type Vec3 } from "../lib/coordinates";

export interface FlyToRequest {
  /** Point of the globe to bring under the camera, as a unit vector. */
  readonly direction: Vec3;
  /** Monotonic id so that asking for the same place twice still triggers. */
  readonly requestId: number;
}

interface CameraStore {
  readonly flyToRequest: FlyToRequest | null;
  /** Asks the camera to fly above a fixed place. */
  flyTo(latitude: number, longitude: number): void;
}

export const useCameraStore = create<CameraStore>()((set) => ({
  flyToRequest: null,
  flyTo: (latitude, longitude) =>
    set((state) => ({
      flyToRequest: {
        direction: latLonToUnitVector(latitude, longitude),
        requestId: (state.flyToRequest?.requestId ?? 0) + 1,
      },
    })),
}));
