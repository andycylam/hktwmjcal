import { Tile, CalculationResult } from '../types/mahjong';

type MeldEntry = { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[]; concealed?: boolean };

function getDeclaredKongCount(meldMap?: Record<string, MeldEntry>): number {
  // Rule: only tiles that are explicitly declared as a kong meld count as a kong.
  // Four identical tiles still in hand are not a kong unless they are moved into meldMap.
  return meldMap ? Object.values(meldMap).filter(m => m.kind === 'kong').length : 0;
}

export function calculateHandFan(handTiles: Tile[], meldMap?: Record<string, MeldEntry>, huIsZimo?: boolean): CalculationResult {
  // include meld tiles when validating total tile count; flower melds do NOT count toward the 17-tile requirement
  const meldTilesAll: Tile[] = [];
  const meldTilesCounted: Tile[] = [];
  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      meldTilesAll.push(...m.tiles);
      if (m.kind !== 'flower') meldTilesCounted.push(...m.tiles);
    });
  }
  const countedTiles = [...handTiles, ...meldTilesCounted];

  // Account for kongs: some rules allow an extra tile per kong (kong consumes an extra tile).
  // IMPORTANT: a four-of-a-kind left in hand is NOT a kong unless it is declared in meldMap.
  const kongCount = getDeclaredKongCount(meldMap);

  // Count all tiles including flowers for per-type limits
  const counts = new Map<string, number>();
  const allTiles = [...handTiles, ...meldTilesAll];
  allTiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  // If the UI calls calculate only when counted total matches expected, perform winning-structure validation then.
  const shouldValidateWinning = countedTiles.length === 17 + kongCount;

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

  // For winning structure validation we expect total non-flower counted tiles to equal
  // 17 + number_of_kongs (5 melds + a pair = 17 tiles; each kong consumes an extra tile).
  const totalTilesNeeded = 17 + kongCount;

  if (countedTiles.length < totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，需滿 ${totalTilesNeeded} 張 (完成 5 組與一對，含 ${kongCount} 個槓) 才可計算。`,
      breakdown: []
    };
  }
  if (countedTiles.length > totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，超出允許的上限 ${totalTilesNeeded} 張（含 ${kongCount} 個槓）。`,
      breakdown: []
    };
  }

  // If the caller (UI) indicated strict validation (countedTiles matches UI expectations), validate winning hand structure.
  if (shouldValidateWinning) {
    // Validate winning hand structure: with existing melds, remaining tiles must be partitionable into
    // the remaining number of melds and exactly one pair. Standard rule: total melds == 5 (kongs count as one meld).
    const nonFlowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind !== 'flower') : [];
    const existingMeldCount = nonFlowerMelds.length;
    const neededMelds = 5 - existingMeldCount;

    if (neededMelds < 0) {
      return { isValid: false, totalFan: 0, reason: '成組數量超過允許的 5 組，無法計算。', breakdown: [] };
    }

    const remainingTiles = handTiles.slice(); // only handTiles were passed in (melds are in meldMap)
    const expectedRemaining = neededMelds * 3 + 2;
    if (remainingTiles.length !== expectedRemaining) {
      return { isValid: false, totalFan: 0, reason: `此手牌無法胡牌：剩餘 ${remainingTiles.length} 張，預期 ${expectedRemaining} 張以構成 ${neededMelds} 組與一對。`, breakdown: [] };
    }

    // build counts map for remaining tiles
    const remainingCounts = new Map<string, number>();
    remainingTiles.forEach(t => {
      const key = `${t.suit}_${t.value}`;
      remainingCounts.set(key, (remainingCounts.get(key) || 0) + 1);
    });

    // helper: recursively check whether counts can be reduced entirely into melds (triplets or sequences)
    const cloneCounts = (src: Map<string, number>) => new Map(src);

    function removeTiles(countMap: Map<string, number>, tiles: string[]): Map<string, number> | null {
      const next = cloneCounts(countMap);
      for (const tile of tiles) {
        const nextValue = (next.get(tile) || 0) - 1;
        if (nextValue < 0) {
          return null;
        }
        if (nextValue === 0) {
          next.delete(tile);
        } else {
          next.set(tile, nextValue);
        }
      }
      return next;
    }

    function canFormMelds(countMap: Map<string, number>, visited = new Set<string>()): boolean {
      const stateKey = [...countMap.entries()]
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tile, count]) => `${tile}:${count}`)
        .join('|');

      if (visited.has(stateKey)) return false;
      visited.add(stateKey);

      if (![...countMap.values()].some(value => value > 0)) return true;

      for (const [tile, count] of countMap.entries()) {
        if ((count || 0) <= 0) continue;

        const [suit, valStr] = tile.split('_');
        const value = Number(valStr);

        if (count >= 3) {
          const tripletNext = removeTiles(countMap, [tile, tile, tile]);
          if (tripletNext && canFormMelds(tripletNext, new Set(visited))) return true;
        }

        if (suit === 'wan' || suit === 'tong' || suit === 'sou') {
          const seqPatterns = [
            [value, value + 1, value + 2],
            [value - 2, value - 1, value]
          ];

          for (const [a, b, c] of seqPatterns) {
            if (a < 1 || b > 9 || c < 1 || c > 9) continue;
            const sequenceTiles = [`${suit}_${a}`, `${suit}_${b}`, `${suit}_${c}`];
            if (sequenceTiles.every(key => (countMap.get(key) || 0) > 0)) {
              const sequenceNext = removeTiles(countMap, sequenceTiles);
              if (sequenceNext && canFormMelds(sequenceNext, new Set(visited))) return true;
            }
          }
        }
      }

      return false;
    }

    // Try every possible pair in remainingCounts
    let winning = false;
    for (const [k, c] of remainingCounts.entries()) {
      if (c >= 2) {
        const copy = cloneCounts(remainingCounts);
        copy.set(k, c - 2);
        if (canFormMelds(copy)) { winning = true; break; }
      }
    }

    if (!winning) {
      return { isValid: false, totalFan: 0, reason: '此手牌無法胡牌：無法將剩餘牌拆解為完整的組合與一對。', breakdown: [] };
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
