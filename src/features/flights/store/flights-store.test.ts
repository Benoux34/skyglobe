import { beforeEach, describe, expect, it } from "vitest";
import { useFlightsStore } from "./flights-store";

const store = () => useFlightsStore.getState();

describe("follow mode", () => {
  beforeEach(() => {
    useFlightsStore.setState({ selectedId: null, followingId: null, focusRequest: null });
  });

  it("does nothing without a selection", () => {
    store().toggleFollow();
    expect(store().followingId).toBeNull();
  });

  it("follows the selected aircraft, flies to it, and toggles off", () => {
    store().select("abc123");
    store().toggleFollow();
    expect(store().followingId).toBe("abc123");
    expect(store().focusRequest?.icao24).toBe("abc123");

    store().toggleFollow();
    expect(store().followingId).toBeNull();
  });

  it("stops when another aircraft is selected or the selection is cleared", () => {
    store().select("abc123");
    store().toggleFollow();
    store().selectAndFocus("def456");
    expect(store().followingId).toBeNull();

    store().toggleFollow();
    store().select("def456");
    expect(store().followingId).toBe("def456");
    store().select(null);
    expect(store().followingId).toBeNull();
  });
});
