import { useCameraStore } from "@/features/globe/store/camera-store";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { useOverheadStore } from "../store/overhead-store";

const TIMEOUT_MS = 15_000;
/** A position a few minutes old is as good as a new one: the sky is the same. */
const MAX_AGE_MS = 10 * 60_000;
/** About a kilometre: all the sky needs, and no more precise than it has to be. */
const DECIMALS = 2;

const round = (value: number): number => Number(value.toFixed(DECIMALS));

/**
 * Asks the browser where the user is, then turns the "above me" mode on. The
 * position is only used for calculations made in the browser.
 */
export function locateObserver(): void {
  const overhead = useOverheadStore.getState();
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    overhead.locationFailed("unavailable");
    return;
  }

  overhead.locating();
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const observer = { latitude: round(coords.latitude), longitude: round(coords.longitude) };
      useOverheadStore.getState().located(observer);
      // The sky is counted from the catalogue, whether or not the layer is shown.
      useSatellitesStore.getState().request();
      useCameraStore.getState().flyTo(observer.latitude, observer.longitude);
    },
    (error) => {
      useOverheadStore
        .getState()
        .locationFailed(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
    },
    { timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
  );
}
