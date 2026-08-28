export type Suit = 'character' | 'dot' | 'bamboo' | 'wind' | 'dragon' | 'flower';

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
