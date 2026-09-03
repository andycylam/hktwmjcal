export const SUIT = {
  CHARACTER: 'character' as const,
  DOT: 'dot' as const,
  BAMBOO: 'bamboo' as const,
  WIND: 'wind' as const,
  DRAGON: 'dragon' as const,
  FLOWER: 'flower' as const,
} as const;

export type Suit = typeof SUIT[keyof typeof SUIT];

export const MELD = {
  KONG: 'kong' as const,
  PUNG: 'pung' as const,
  CHOW: 'chow' as const,
  FLOWER: 'flower' as const,
} as const;

export type MeldKind = typeof MELD[keyof typeof MELD];

export interface Tile {
  id: string;
  suit: Suit;
  value: number;
  label: string;
}

export interface CalculationResult {
  isValid: boolean;
  totalFan: number;
  reason?: string;
  breakdown: { rule: string; fan: number }[];
  possibleCombinations?: string[];
}

export type Wind = 'east' | 'south' | 'west' | 'north';

export interface GameContext {
  prevailingWind?: Wind;
  seatWind?: Wind;
}
