import { create } from "zustand";
import type { Icao24 } from "../domain/aircraft";
import { DEFAULT_FILTERS, type FlightFilters } from "../domain/filters";
import type { FlightDetails } from "../domain/flight-details";
import type { FlightsSnapshot } from "../domain/snapshot";

export interface FocusRequest {
  readonly icao24: Icao24;
  /** Monotonic id so that focusing the same aircraft twice still triggers. */
  readonly requestId: number;
}

/** Details of one aircraft; `icao24` tells which, so stale answers are never shown. */
export type FlightDetailsState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly icao24: Icao24 }
  | { readonly status: "ready"; readonly icao24: Icao24; readonly details: FlightDetails }
  | { readonly status: "error"; readonly icao24: Icao24 };

const IDLE_DETAILS: FlightDetailsState = { status: "idle" };

interface FlightsState {
  readonly snapshot: FlightsSnapshot | null;
  /** Message of the most recent failed refresh, cleared by the next success. */
  readonly error: string | null;
  readonly filters: FlightFilters;
  readonly selectedId: Icao24 | null;
  readonly hoveredId: Icao24 | null;
  readonly focusRequest: FocusRequest | null;
  /** Aircraft the camera keeps centred; always the selected one, or `null`. */
  readonly followingId: Icao24 | null;
  readonly details: FlightDetailsState;
}

interface FlightsActions {
  snapshotReceived(snapshot: FlightsSnapshot): void;
  refreshFailed(message: string): void;
  updateFilters(patch: Partial<FlightFilters>): void;
  resetFilters(): void;
  select(icao24: Icao24 | null): void;
  /** Selects the aircraft and asks the camera to fly to it. */
  selectAndFocus(icao24: Icao24): void;
  hover(icao24: Icao24 | null): void;
  /** Starts or stops keeping the camera on the selected aircraft. */
  toggleFollow(): void;
  stopFollowing(): void;
  detailsRequested(icao24: Icao24): void;
  detailsLoaded(icao24: Icao24, details: FlightDetails): void;
  detailsFailed(icao24: Icao24): void;
  detailsCleared(): void;
}

const nextFocusRequest = (previous: FocusRequest | null, icao24: Icao24): FocusRequest => ({
  icao24,
  requestId: (previous?.requestId ?? 0) + 1,
});

export type FlightsStore = FlightsState & FlightsActions;

export const useFlightsStore = create<FlightsStore>()((set) => ({
  snapshot: null,
  error: null,
  filters: DEFAULT_FILTERS,
  selectedId: null,
  hoveredId: null,
  focusRequest: null,
  followingId: null,
  details: IDLE_DETAILS,

  snapshotReceived: (snapshot) =>
    set((state) => {
      const stillPresent = (id: Icao24 | null): Icao24 | null =>
        id !== null && snapshot.aircraft.some((a) => a.icao24 === id) ? id : null;
      return {
        snapshot,
        error: null,
        selectedId: stillPresent(state.selectedId),
        hoveredId: stillPresent(state.hoveredId),
        followingId: stillPresent(state.followingId),
      };
    }),

  refreshFailed: (message) => set({ error: message }),

  updateFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  select: (icao24) =>
    set((state) => ({
      selectedId: icao24,
      followingId: state.followingId === icao24 ? icao24 : null,
    })),
  selectAndFocus: (icao24) =>
    set((state) => ({
      selectedId: icao24,
      followingId: state.followingId === icao24 ? icao24 : null,
      focusRequest: nextFocusRequest(state.focusRequest, icao24),
    })),
  hover: (icao24) => set((state) => (state.hoveredId === icao24 ? state : { hoveredId: icao24 })),

  toggleFollow: () =>
    set((state) => {
      if (state.followingId !== null) return { followingId: null };
      if (state.selectedId === null) return state;
      return {
        followingId: state.selectedId,
        // Fly in first; the camera then stays on the aircraft.
        focusRequest: nextFocusRequest(state.focusRequest, state.selectedId),
      };
    }),
  stopFollowing: () => set((state) => (state.followingId === null ? state : { followingId: null })),

  // A refresh for the aircraft already on screen keeps the current details visible meanwhile.
  detailsRequested: (icao24) =>
    set((state) =>
      state.details.status === "ready" && state.details.icao24 === icao24
        ? state
        : { details: { status: "loading", icao24 } },
    ),
  detailsLoaded: (icao24, details) => set({ details: { status: "ready", icao24, details } }),
  detailsFailed: (icao24) => set({ details: { status: "error", icao24 } }),
  detailsCleared: () => set({ details: IDLE_DETAILS }),
}));
