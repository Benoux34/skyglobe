import { create } from "zustand";
import type { Launch, LaunchId } from "../domain/launch";

export type LaunchesStatus = "idle" | "loading" | "ready" | "error";

const NO_LAUNCHES: readonly Launch[] = [];

interface LaunchesStore {
  readonly status: LaunchesStatus;
  readonly launches: readonly Launch[];
  readonly selectedId: LaunchId | null;
  launchesRequested(): void;
  launchesLoaded(launches: readonly Launch[]): void;
  launchesFailed(): void;
  select(id: LaunchId | null): void;
}

export const useLaunchesStore = create<LaunchesStore>()((set) => ({
  status: "idle",
  launches: NO_LAUNCHES,
  selectedId: null,
  launchesRequested: () => set({ status: "loading" }),
  launchesLoaded: (launches) => set({ status: "ready", launches }),
  launchesFailed: () => set({ status: "error" }),
  select: (id) => set({ selectedId: id }),
}));
