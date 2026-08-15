import { Tile, CalculationResult } from '../types/mahjong';

type MeldEntry = { kind: 'kong' | 'pung' | 'shang'; tiles: Tile[]; concealed?: boolean };

export function calculateHandFan(handTiles: Tile[], meldMap?: Record<string, MeldEntry>, huIsZimo?: boolean): CalculationResult {
  // include meld tiles when validating total tile count
  const meldTiles: Tile[] = [];
  if (meldMap) Object.values(meldMap).forEach(m => meldTiles.push(...m.tiles));
  const allTiles = [...handTiles, ...meldTiles];

  if (allTiles.length !== 17) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${allTiles.length} 張，需滿 17 張 (16張手牌 + 1張胡牌) 才可計算。`,
      breakdown: []
    };
  }

  const counts = new Map<string, number>();
  allTiles.forEach(t => {
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

  // honor tiles rule preserved
  const hasHonor = allTiles.some(t => t.suit === 'wind' || t.suit === 'dragon');
  if (hasHonor) {
    totalFan += 1;
    breakdown.push({ rule: '字牌 (Honor Tile)', fan: 1 });
  }

  // 自摸 (zimo) grants +1 fan
  if (huIsZimo) {
    totalFan += 1;
    breakdown.push({ rule: '自摸 (Zimo)', fan: 1 });
  }

  // 暗槓 (concealed kong) grants +1 fan each
  if (meldMap) {
    const concealedKongs = Object.values(meldMap).filter(m => m.kind === 'kong' && m.concealed).length;
    if (concealedKongs > 0) {
      totalFan += concealedKongs;
      breakdown.push({ rule: `暗槓 x${concealedKongs}`, fan: concealedKongs });
    }
  }

  return {
    isValid: true,
    totalFan,
    breakdown
  };
}
