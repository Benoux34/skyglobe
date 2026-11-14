import { create } from "zustand";
import { useFlightsStore } from "@/features/flights/store/flights-store";
import { useLayersStore } from "@/features/layers/layers-store";
import type { SatelliteGroup, SatelliteId, SatelliteRecord } from "../domain/satellite";

export type CatalogStatus = "idle" | "loading" | "ready" | "error";

const NO_SATELLITES: readonly SatelliteRecord[] = [];

interface SatellitesState {
  readonly status: CatalogStatus;
  /** True once something other than the layer needs the catalogue: the search, the sky above the user. */
  readonly requested: boolean;
  readonly catalog: readonly SatelliteRecord[];
  readonly groups: Readonly<Record<SatelliteGroup, boolean>>;
  readonly selectedId: SatelliteId | null;
  readonly hoveredId: SatelliteId | null;
}

interface SatellitesActions {
  /** Asks for the catalogue to be loaded even while the layer is hidden. */
  request(): void;
  catalogRequested(): void;
  catalogLoaded(catalog: readonly SatelliteRecord[]): void;
  catalogFailed(): void;
  setGroupVisible(group: SatelliteGroup, visible: boolean): void;
  select(id: SatelliteId | null): void;
  hover(id: SatelliteId | null): void;
}

export type SatellitesStore = SatellitesState & SatellitesActions;

export const useSatellitesStore = create<SatellitesStore>()((set) => ({
  status: "idle",
  requested: false,
  catalog: NO_SATELLITES,
  groups: { station: true, starlink: true, navigation: true, other: true },
  selectedId: null,
  hoveredId: null,

  request: () => set((state) => (state.requested ? state : { requested: true })),
  catalogRequested: () => set({ status: "loading" }),
  catalogLoaded: (catalog) => set({ status: "ready", catalog }),
  catalogFailed: () => set({ status: "error" }),

  setGroupVisible: (group, visible) =>
    set((state) => {
      const selected = state.catalog.find((record) => record.id === state.selectedId);
      return {
        groups: { ...state.groups, [group]: visible },
        // A satellite that is no longer drawn cannot stay selected.
        selectedId: !visible && selected?.group === group ? null : state.selectedId,
      };
    }),

  select: (id) => {
    // One details panel at a time: picking a satellite releases the aircraft.
    if (id !== null) useFlightsStore.getState().select(null);
    set({ selectedId: id });
  },
  hover: (id) => set((state) => (state.hoveredId === id ? state : { hoveredId: id })),
}));

// ...and picking an aircraft releases the satellite.
useFlightsStore.subscribe((flights) => {
  if (flights.selectedId !== null && useSatellitesStore.getState().selectedId !== null) {
    useSatellitesStore.setState({ selectedId: null });
  }
});

// Hiding the layer closes the details of a satellite that is no longer drawn.
useLayersStore.subscribe((layers) => {
  if (!layers.visible.satellites && useSatellitesStore.getState().selectedId !== null) {
    useSatellitesStore.setState({ selectedId: null });
  }
});

const indexById = (() => {
  let source: readonly SatelliteRecord[] = NO_SATELLITES;
  let index: ReadonlyMap<SatelliteId, SatelliteRecord> = new Map();
  return (catalog: readonly SatelliteRecord[]): ReadonlyMap<SatelliteId, SatelliteRecord> => {
    if (catalog !== source) {
      source = catalog;
      index = new Map(catalog.map((record) => [record.id, record]));
    }
    return index;
  };
})();

const satelliteById = (state: SatellitesStore, id: SatelliteId | null): SatelliteRecord | null =>
  id === null ? null : (indexById(state.catalog).get(id) ?? null);

export const selectSelectedSatellite = (state: SatellitesStore): SatelliteRecord | null =>
  satelliteById(state, state.selectedId);

export const selectHoveredSatellite = (state: SatellitesStore): SatelliteRecord | null =>
  satelliteById(state, state.hoveredId);
