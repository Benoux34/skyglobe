"use client";

import { Layers } from "lucide-react";
import { GLOBE_PALETTES } from "@/features/globe/lib/palette";
import { LAYERS, useLayersStore } from "@/features/layers/layers-store";
import { countByGroup, SATELLITE_GROUPS } from "@/features/satellites/domain/satellite";
import { useSatellitesStore } from "@/features/satellites/store/satellites-store";
import { countByCategory, SHIP_CATEGORIES } from "@/features/ships/domain/ship";
import { useShipsStore } from "@/features/ships/store/ships-store";
import { formatInteger } from "@/shared/lib/format";
import { useTheme } from "@/shared/theme/use-theme";
import { Panel } from "@/shared/ui/Panel";
import { Toggle } from "@/shared/ui/Toggle";

/** Switches for what the globe shows: aircraft, ships, satellites, rocket launches. */
export function LayersPanel() {
  const visible = useLayersStore((state) => state.visible);
  const setVisible = useLayersStore((state) => state.setVisible);

  return (
    <Panel className="space-y-3.5 p-4" aria-label="Layers">
      <h2 className="flex items-center gap-2.5 text-sm font-medium text-fg">
        <Layers className="size-4 text-muted" aria-hidden />
        Layers
      </h2>
      {LAYERS.map((layer) => (
        <div key={layer.id} className="space-y-3">
          <Toggle
            label={layer.label}
            checked={visible[layer.id]}
            onChange={(checked) => setVisible(layer.id, checked)}
          />
          {layer.id === "ships" && visible.ships && <ShipCategories />}
          {layer.id === "satellites" && visible.satellites && <SatelliteGroups />}
        </div>
      ))}
    </Panel>
  );
}

function ShipCategories() {
  const status = useShipsStore((state) => state.status);
  const failure = useShipsStore((state) => state.failure);
  const ships = useShipsStore((state) => state.ships);
  const categories = useShipsStore((state) => state.categories);
  const setCategoryVisible = useShipsStore((state) => state.setCategoryVisible);
  const colors = GLOBE_PALETTES[useTheme()].ships;

  if (status === "error") {
    return <p className="text-xs text-muted">{failure ?? "Ship data could not be loaded."}</p>;
  }
  if (status !== "ready") {
    return <p className="text-xs text-muted">Loading the ships…</p>;
  }

  return (
    <FilterChips
      items={SHIP_CATEGORIES}
      enabled={categories}
      counts={countByCategory(ships)}
      colors={colors}
      onToggle={setCategoryVisible}
    />
  );
}

function SatelliteGroups() {
  const status = useSatellitesStore((state) => state.status);
  const catalog = useSatellitesStore((state) => state.catalog);
  const groups = useSatellitesStore((state) => state.groups);
  const setGroupVisible = useSatellitesStore((state) => state.setGroupVisible);
  const colors = GLOBE_PALETTES[useTheme()].satellites;

  if (status === "error") {
    return <p className="text-xs text-muted">Satellite data could not be loaded.</p>;
  }
  if (status !== "ready") {
    return <p className="text-xs text-muted">Loading the satellite catalogue…</p>;
  }

  return (
    <FilterChips
      items={SATELLITE_GROUPS}
      enabled={groups}
      counts={countByGroup(catalog)}
      colors={colors}
      onToggle={setGroupVisible}
    />
  );
}

interface FilterChipsProps<Id extends string> {
  readonly items: readonly { readonly id: Id; readonly label: string }[];
  readonly enabled: Readonly<Record<Id, boolean>>;
  readonly counts: Readonly<Record<Id, number>>;
  readonly colors: Readonly<Record<Id, string>>;
  readonly onToggle: (id: Id, enabled: boolean) => void;
}

/** One switch per family of a layer, with its colour on the globe and how many it holds. */
function FilterChips<Id extends string>({
  items,
  enabled,
  counts,
  colors,
  onToggle,
}: FilterChipsProps<Id>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={enabled[item.id]}
          onClick={() => onToggle(item.id, !enabled[item.id])}
          className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-fg aria-pressed:bg-inset aria-pressed:text-fg"
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: colors[item.id], opacity: enabled[item.id] ? 1 : 0.35 }}
          />
          {item.label}
          <span className="font-mono tabular-nums opacity-70">
            {formatInteger(counts[item.id])}
          </span>
        </button>
      ))}
    </div>
  );
}
