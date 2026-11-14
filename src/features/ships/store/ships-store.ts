import { create } from "zustand";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { useLayersStore } from "@/features/layers/layers-store";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import type { Mmsi, Ship, ShipCategory, ShipsSnapshot } from "../domain/ship";

export type ShipsStatus = "idle" | "loading" | "ready" | "error";

const NO_SHIPS: readonly Ship[] = [];

interface ShipsState {
  readonly status: ShipsStatus;
  /** True once something other than the layer needs the ships: the search. */
  readonly requested: boolean;
  /** Why the ships could not be loaded, when `status` is "error". */
  readonly failure: string | null;
  readonly ships: readonly Ship[];
  /** Unix time (seconds) the snapshot was written. */
  readonly time: number | null;
  readonly categories: Readonly<Record<ShipCategory, boolean>>;
  readonly selectedId: Mmsi | null;
  readonly hoveredId: Mmsi | null;
}

interface ShipsActions {
  /** Asks for the ships to be loaded even while the layer is hidden. */
  request(): void;
  snapshotRequested(): void;
  snapshotLoaded(snapshot: ShipsSnapshot): void;
  snapshotFailed(failure: string): void;
  setCategoryVisible(category: ShipCategory, visible: boolean): void;
  select(id: Mmsi | null): void;
  hover(id: Mmsi | null): void;
}

export type ShipsStore = ShipsState & ShipsActions;

const indexByMmsi = (() => {
  let source: readonly Ship[] = NO_SHIPS;
  let index: ReadonlyMap<Mmsi, Ship> = new Map();
  return (ships: readonly Ship[]): ReadonlyMap<Mmsi, Ship> => {
    if (ships !== source) {
      source = ships;
      index = new Map(ships.map((ship) => [ship.mmsi, ship]));
    }
    return index;
  };
})();

const shipById = (ships: readonly Ship[], id: Mmsi | null): Ship | null =>
  id === null ? null : (indexByMmsi(ships).get(id) ?? null);

export const useShipsStore = create<ShipsStore>()((set) => ({
  status: "idle",
  requested: false,
  failure: null,
  ships: NO_SHIPS,
  time: null,
  categories: { cargo: true, tanker: true, passenger: true, fishing: true, other: true },
  selectedId: null,
  hoveredId: null,

  request: () => set((state) => (state.requested ? state : { requested: true })),

  // A refresh keeps showing the ships already on the globe.
  snapshotRequested: () =>
    set((state) => (state.status === "ready" ? state : { status: "loading", failure: null })),
  snapshotLoaded: (snapshot) =>
    set((state) => ({
      status: "ready",
      failure: null,
      ships: snapshot.ships,
      time: snapshot.time,
      // A ship that went silent has left the snapshot and cannot stay selected.
      selectedId: shipById(snapshot.ships, state.selectedId) === null ? null : state.selectedId,
      hoveredId: shipById(snapshot.ships, state.hoveredId) === null ? null : state.hoveredId,
    })),
  snapshotFailed: (failure) =>
    set((state) => (state.status === "ready" ? state : { status: "error", failure })),

  setCategoryVisible: (category, visible) =>
    set((state) => {
      const selected = shipById(state.ships, state.selectedId);
      return {
        categories: { ...state.categories, [category]: visible },
        // A ship that is no longer drawn cannot stay selected.
        selectedId: !visible && selected?.category === category ? null : state.selectedId,
      };
    }),

  select: (id) => {
    // One details panel at a time: picking a ship releases the aircraft and the satellite.
    if (id !== null) {
      useFlightsStore.getState().select(null);
      useSatellitesStore.getState().select(null);
    }
    set({ selectedId: id });
  },
  hover: (id) => set((state) => (state.hoveredId === id ? state : { hoveredId: id })),
}));

const releaseShip = (): void => {
  if (useShipsStore.getState().selectedId !== null) useShipsStore.setState({ selectedId: null });
};

// ...and picking an aircraft or a satellite releases the ship.
useFlightsStore.subscribe((flights) => {
  if (flights.selectedId !== null) releaseShip();
});
useSatellitesStore.subscribe((satellites) => {
  if (satellites.selectedId !== null) releaseShip();
});

// Hiding the layer closes the details of a ship that is no longer drawn.
useLayersStore.subscribe((layers) => {
  if (!layers.visible.ships) releaseShip();
});

export const selectSelectedShip = (state: ShipsStore): Ship | null =>
  shipById(state.ships, state.selectedId);

export const selectHoveredShip = (state: ShipsStore): Ship | null =>
  shipById(state.ships, state.hoveredId);
