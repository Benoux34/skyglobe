import { create } from "zustand";
import type { Replay } from "../domain/ascent";
import type { Launch, LaunchId } from "../domain/launch";

export type LaunchesStatus = "idle" | "loading" | "ready" | "error";

const NO_LAUNCHES: readonly Launch[] = [];

interface LaunchesStore {
  readonly status: LaunchesStatus;
  readonly launches: readonly Launch[];
  readonly selectedId: LaunchId | null;
  readonly replay: Replay | null;
  launchesRequested(): void;
  launchesLoaded(launches: readonly Launch[]): void;
  launchesFailed(): void;
  select(id: LaunchId | null): void;
  /** Plays the ascent of a launch ahead of time. */
  startReplay(id: LaunchId): void;
  stopReplay(): void;
}

export const useLaunchesStore = create<LaunchesStore>()((set) => ({
  status: "idle",
  launches: NO_LAUNCHES,
  selectedId: null,
  replay: null,
  launchesRequested: () => set({ status: "loading" }),
  launchesLoaded: (launches) => set({ status: "ready", launches }),
  launchesFailed: () => set({ status: "error" }),
  select: (id) => set({ selectedId: id }),
  startReplay: (id) => set({ replay: { launchId: id, startedAtMs: Date.now() } }),
  stopReplay: () => set((state) => (state.replay === null ? state : { replay: null })),
}));
