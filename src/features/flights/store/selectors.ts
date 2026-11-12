import type { Aircraft, Icao24 } from "../domain/aircraft";
import { findEmergencies } from "../domain/emergency";
import type { FlightDetails } from "../domain/flight-details";
import { matchesFilters, type FlightFilters } from "../domain/filters";
import { computeStats, countByCountry, type CountryCount, type FlightStats } from "../domain/stats";
import type { FlightsStore } from "./flights-store";

const NO_AIRCRAFT: readonly Aircraft[] = [];

/** Caches the result for the latest arguments so derived data keeps a stable identity. */
function memoizeLatest<Args extends readonly unknown[], Result>(
  compute: (...args: Args) => Result,
): (...args: Args) => Result {
  let last: { args: Args; result: Result } | null = null;
  return (...args) => {
    if (last !== null && last.args.every((arg, index) => Object.is(arg, args[index]))) {
      return last.result;
    }
    last = { args, result: compute(...args) };
    return last.result;
  };
}

const filterAircraft = memoizeLatest(
  (aircraft: readonly Aircraft[], filters: FlightFilters): readonly Aircraft[] =>
    aircraft.filter((a) => matchesFilters(a, filters)),
);
const indexById = memoizeLatest(
  (aircraft: readonly Aircraft[]): ReadonlyMap<Icao24, Aircraft> =>
    new Map(aircraft.map((a) => [a.icao24, a])),
);
const emergenciesOf = memoizeLatest(findEmergencies);
const statsOf = memoizeLatest(computeStats);
const countriesOf = memoizeLatest(countByCountry);

export const selectAllAircraft = (state: FlightsStore): readonly Aircraft[] =>
  state.snapshot?.aircraft ?? NO_AIRCRAFT;

export const selectVisibleAircraft = (state: FlightsStore): readonly Aircraft[] =>
  filterAircraft(selectAllAircraft(state), state.filters);

/** Aircraft squawking a distress code, among those the filters let through. */
export const selectEmergencyAircraft = (state: FlightsStore): readonly Aircraft[] =>
  emergenciesOf(selectVisibleAircraft(state));

export const selectVisibleStats = (state: FlightsStore): FlightStats =>
  statsOf(selectVisibleAircraft(state));

export const selectCountries = (state: FlightsStore): readonly CountryCount[] =>
  countriesOf(selectAllAircraft(state));

const aircraftById = (state: FlightsStore, id: Icao24 | null): Aircraft | null =>
  id === null ? null : (indexById(selectAllAircraft(state)).get(id) ?? null);

export const selectSelectedAircraft = (state: FlightsStore): Aircraft | null =>
  aircraftById(state, state.selectedId);

export const selectHoveredAircraft = (state: FlightsStore): Aircraft | null =>
  aircraftById(state, state.hoveredId);

/** The loaded details, only while it belongs to the aircraft currently selected. */
export const selectSelectedFlightDetails = (state: FlightsStore): FlightDetails | null =>
  state.details.status === "ready" && state.details.icao24 === state.selectedId
    ? state.details.details
    : null;
