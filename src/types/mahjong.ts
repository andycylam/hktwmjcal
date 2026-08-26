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
  /**
    * 最終採用作計番的暗牌拆解組合
    */
  selectedCombination?: string;
}
