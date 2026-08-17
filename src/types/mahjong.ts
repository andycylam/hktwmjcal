export type Suit = 'wan' | 'tong' | 'sou' | 'wind' | 'dragon' | 'flower';

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
