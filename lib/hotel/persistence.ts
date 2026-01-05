import type {
  Country,
  FxRates,
  GlobalSettings,
  HotelOption,
  Language,
  Program,
} from "./types";

export type PersistedState = {
  version: 1;
  global: GlobalSettings;
  programs: Program[];
  hotels: HotelOption[];
  countries?: Country[];
  fxRates?: FxRates;
  language?: Language;
};

const STORAGE_KEY = "hotel-calculator:v1";

export function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write failures (quota/private mode)
  }
}
