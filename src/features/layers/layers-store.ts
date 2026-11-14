import { create } from "zustand";

/** Kinds of objects the globe can show, each switched on and off on its own. */
export type LayerId = "aircraft" | "ships" | "satellites" | "launches";

export interface LayerInfo {
  readonly id: LayerId;
  readonly label: string;
}

export const LAYERS: readonly LayerInfo[] = [
  { id: "aircraft", label: "Aircraft" },
  { id: "ships", label: "Ships" },
  { id: "satellites", label: "Satellites" },
  { id: "launches", label: "Rocket launches" },
];

interface LayersStore {
  readonly visible: Readonly<Record<LayerId, boolean>>;
  setVisible(layer: LayerId, visible: boolean): void;
}

export const useLayersStore = create<LayersStore>()((set) => ({
  // Tens of thousands of ships and satellites would bury the aircraft, so both start hidden.
  visible: { aircraft: true, ships: false, satellites: false, launches: true },
  setVisible: (layer, visible) =>
    set((state) => ({ visible: { ...state.visible, [layer]: visible } })),
}));
