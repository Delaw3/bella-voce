import { getLgas, getStates } from "nigeria-state-lga-data";

const states = getStates().sort((a, b) => a.localeCompare(b));
const stateLookup = new Map(states.map((state) => [state.toLowerCase(), state]));

export function getNigeriaStates() {
  return states;
}

export function resolveStateName(input: string) {
  return stateLookup.get(input.trim().toLowerCase()) ?? null;
}

export function getNigeriaLgasByState(inputState: string) {
  const state = resolveStateName(inputState);
  if (!state) return [];
  return getLgas(state).sort((a, b) => a.localeCompare(b));
}

export function resolveLgaNameForState(inputState: string, inputLga: string) {
  const normalizedLga = inputLga.trim().toLowerCase();
  return getNigeriaLgasByState(inputState).find((item) => item.toLowerCase() === normalizedLga) ?? null;
}

export function isValidNigeriaState(state: string) {
  return Boolean(resolveStateName(state));
}

export function isValidNigeriaLgaForState(state: string, lga: string) {
  return Boolean(resolveLgaNameForState(state, lga));
}
