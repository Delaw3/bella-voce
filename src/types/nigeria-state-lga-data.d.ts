declare module "nigeria-state-lga-data" {
  export function getStates(): string[];
  export function getLgas(state: string): string[];
}
