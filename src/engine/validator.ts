import { Tile, CalculationResult } from '../types/mahjong';

export function calculateHandFan(tiles: Tile[]): CalculationResult {
  if (tiles.length !== 17) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${tiles.length} 張，需滿 17 張 (16張手牌 + 1張胡牌) 才可計算。`,
      breakdown: []
    };
  }

  const counts = new Map<string, number>();
  tiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  for (const [key, count] of counts.entries()) {
    if (!key.startsWith('flower') && count > 4) {
      return {
        isValid: false,
        totalFan: 0,
        reason: `無效手牌：牌型 [${key}] 超過 4 張限制。`,
        breakdown: []
      };
    }
  }

  const breakdown: { rule: string; fan: number }[] = [];
  let totalFan = 1;
  breakdown.push({ rule: '底番 (Base Point)', fan: 1 });

  const hasHonor = tiles.some(t => t.suit === 'wind' || t.suit === 'dragon');
  if (hasHonor) {
    totalFan += 1;
    breakdown.push({ rule: '字牌 (Honor Tile)', fan: 1 });
  }

  return {
    isValid: true,
    totalFan,
    breakdown
  };
}
