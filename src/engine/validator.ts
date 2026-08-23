import { Tile, CalculationResult } from '../types/mahjong';

type MeldEntry = { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[]; concealed?: boolean };

// ----------------------------------------------------------------------
// Helper Functions & Maps
// ----------------------------------------------------------------------

const WIND_VALUE_MAP: Record<'east' | 'south' | 'west' | 'north', number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

function getDeclaredKongCount(meldMap?: Record<string, MeldEntry>): number {
  return meldMap ? Object.values(meldMap).filter(m => m.kind === 'kong').length : 0;
}

function honorNumberToChar(suitChar: string, num: number): string {
  if (suitChar === '風') {
    const map = ['東', '南', '西', '北'];
    if (num >= 5) {
      const dragonMap: Record<number, string> = { 5: '紅中', 6: '發財', 7: '白板' };
      return dragonMap[num] || String(num);
    }
    return map[num - 1] || String(num);
  }
  if (suitChar === '字') {
    const map: Record<number, string> = { 5: '紅中', 6: '發財', 7: '白板' };
    return map[num] || String(num);
  }
  return String(num);
}

function charToHonorNumber(ch: string): number | null {
  const map: Record<string, number> = {
    '東': 1, '南': 2, '西': 3, '北': 4,
    '中': 5, '發': 6, '白': 7
  };
  return map[ch] ?? null;
}

function getPrimaryNumberFromString(s: string): number {
  const numMatch = s.match(/\d+/);
  if (numMatch) return Number(numMatch[0]);
  const charMatch = s.match(/[東南西北中發白]/)?.[0];
  if (charMatch) return charToHonorNumber(charMatch) ?? 0;
  return 0;
}

function cloneCounts(src: Map<string, number>): Map<string, number> {
  return new Map(src);
}

function removeTiles(countMap: Map<string, number>, tiles: string[]): Map<string, number> | null {
  const next = cloneCounts(countMap);
  for (const tile of tiles) {
    const nextValue = (next.get(tile) || 0) - 1;
    if (nextValue < 0) return null;
    if (nextValue === 0) next.delete(tile);
    else next.set(tile, nextValue);
  }
  return next;
}

function tileLabel(tile: string): string {
  const [suit, valueStr] = tile.split('_');
  const value = Number(valueStr);
  const suitLabel = suit === 'wan' ? '萬' : suit === 'tong' ? '筒' : suit === 'sou' ? '索' : suit === 'wind' ? '風' : suit === 'dragon' ? '字' : '';
  return `${value}${suitLabel}`;
}

function meldLabel(tiles: string[]): string {
  const ordered = [...tiles].sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
  const labels = ordered.map(tileLabel);

  if (ordered.length === 3 && ordered.every(tile => tile.split('_')[1] === ordered[0].split('_')[1])) {
    return `${tileLabel(ordered[0])}x3`;
  }
  if (ordered.length === 3) return labels.join('-');
  if (ordered.length === 2) return `${tileLabel(ordered[0])}x2`;
  return labels.join('-');
}

function normalizeMeldPart(part: string): { sortKey: number; pair: boolean; token: string } {
  const suitMatch = part.match(/[萬筒索風字]/)?.[0] ?? '';
  const numbers = [...part.matchAll(/\d+/g)].map(Number);
  const firstNumber = numbers[0] ?? 0;

  const dragonChars = ['紅中', '發財', '白板'];
  const isDragon = (ch: string) => dragonChars.includes(ch);

  if (part.includes('x3')) {
    const displayNum = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, firstNumber) : String(firstNumber);
    const suffix = isDragon(displayNum) ? '' : suitMatch;
    return { sortKey: firstNumber, pair: false, token: `${displayNum}${suffix}x3` };
  }

  if (part.includes('x2')) {
    const displayNum = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, firstNumber) : String(firstNumber);
    const suffix = isDragon(displayNum) ? '' : suitMatch;
    return { sortKey: firstNumber, pair: true, token: `${displayNum}${suffix}x2` };
  }

  const normalizedNumbers = [...numbers].sort((a, b) => a - b);
  const displayParts = normalizedNumbers.map(value => {
    const ch = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, value) : String(value);
    return isDragon(ch) ? ch : `${ch}${suitMatch}`;
  });

  return {
    sortKey: normalizedNumbers[0] ?? 0,
    pair: false,
    token: displayParts.join('-')
  };
}

function canonicalizeCombination(combo: string): string {
  const parts = combo.split(', ').map(normalizeMeldPart).sort((a, b) => {
    if (a.pair && !b.pair) return 1;
    if (!a.pair && b.pair) return -1;
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;

    const aRank = a.token.includes('x3') ? 0 : a.token.includes('x2') ? 2 : 1;
    const bRank = b.token.includes('x3') ? 0 : b.token.includes('x2') ? 2 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return a.token.localeCompare(b.token, 'zh-Hant');
  });

  return parts.map(part => part.token).join(', ');
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

    if (['wan', 'tong', 'sou'].includes(suit)) {
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

function collectMeldCombinations(countMap: Map<string, number>, visited = new Set<string>(), current: string[] = []): string[][] {
  const stateKey = [...countMap.entries()]
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tile, count]) => `${tile}:${count}`)
    .join('|');

  if (visited.has(stateKey)) return [];
  visited.add(stateKey);

  if (![...countMap.values()].some(value => value > 0)) {
    return [current.slice()];
  }

  const results: string[][] = [];

  for (const [tile, count] of countMap.entries()) {
    if ((count || 0) <= 0) continue;

    const [suit, valStr] = tile.split('_');
    const value = Number(valStr);

    if (count >= 3) {
      const tripletNext = removeTiles(countMap, [tile, tile, tile]);
      if (tripletNext) {
        const grouped = collectMeldCombinations(tripletNext, new Set(visited), [...current, meldLabel([tile, tile, tile])]);
        results.push(...grouped);
      }
    }

    if (['wan', 'tong', 'sou'].includes(suit)) {
      const seqPatterns = [
        [value, value + 1, value + 2],
        [value - 2, value - 1, value]
      ];

      for (const [a, b, c] of seqPatterns) {
        if (a < 1 || b > 9 || c < 1 || c > 9) continue;
        const sequenceTiles = [`${suit}_${a}`, `${suit}_${b}`, `${suit}_${c}`];
        if (sequenceTiles.every(key => (countMap.get(key) || 0) > 0)) {
          const sequenceNext = removeTiles(countMap, sequenceTiles);
          if (sequenceNext) {
            const grouped = collectMeldCombinations(sequenceNext, new Set(visited), [...current, meldLabel(sequenceTiles)]);
            results.push(...grouped);
          }
        }
      }
    }
  }

  return results.length > 0 ? results : [];
}

function scoreHonorTriplet(
  value: number,
  seatWindNum: number | undefined,
  prevailingWindNum: number | undefined
): { fan: number; breakdown: { rule: string; fan: number }[] } {
  const honorNames: Record<number, string> = {
    1: '東', 2: '南', 3: '西', 4: '北',
    5: '中', 6: '發', 7: '白'
  };
  if (value < 1 || value > 7) return { fan: 0, breakdown: [] };

  const breakdown: { rule: string; fan: number }[] = [];
  let fan = 0;
  const name = honorNames[value];

  if (value <= 4) {
    if (value === seatWindNum) {
      fan += 1;
      breakdown.push({ rule: '正字 (座位)', fan: 1 });
    }
    if (value === prevailingWindNum) {
      fan += 1;
      breakdown.push({ rule: '正字 (場風)', fan: 1 });
    }
  }

  fan += 1;
  breakdown.push({ rule: `字牌 (${name})`, fan: 1 });

  return { fan, breakdown };
}

// ----------------------------------------------------------------------
// Wait Analysis Helper (單吊 / 卡張 / 邊張 與 聽牌數檢測)
// ----------------------------------------------------------------------

function detectWaitPattern(
  remainingCounts: Map<string, number>,
  huTile: Tile
): { isDukDuk: boolean; isFakeDuk: boolean } {
  const huKey = `${huTile.suit}_${huTile.value}`;
  const [huSuit, huValStr] = huKey.split('_');
  const huVal = Number(huValStr);

  // 1. 還原胡牌前 16 張牌 (countsBeforeHu)
  const countsBeforeHu = cloneCounts(remainingCounts);
  const currentHuCount = countsBeforeHu.get(huKey) || 0;
  if (currentHuCount > 0) {
    if (currentHuCount === 1) countsBeforeHu.delete(huKey);
    else countsBeforeHu.set(huKey, currentHuCount - 1);
  }

  // 2. 結構檢測 (Structural Analysis)
  let isDanDiaoStructure = false;
  let isKaZhangStructure = false;
  let isBianZhangStructure = false;

  // A) 單吊
  if ((countsBeforeHu.get(huKey) || 0) === 1) {
    const testCopy = cloneCounts(countsBeforeHu);
    testCopy.delete(huKey);
    if (canFormMelds(testCopy)) {
      isDanDiaoStructure = true;
    }
  }

  // B) 卡張 & 邊張
  if (['wan', 'tong', 'sou'].includes(huSuit)) {
    // 卡張 (胡 2~8 萬/筒/索)
    if (huVal >= 2 && huVal <= 8) {
      const leftKey = `${huSuit}_${huVal - 1}`;
      const rightKey = `${huSuit}_${huVal + 1}`;

      if ((countsBeforeHu.get(leftKey) || 0) >= 1 && (countsBeforeHu.get(rightKey) || 0) >= 1) {
        const testCopy = cloneCounts(countsBeforeHu);
        testCopy.set(leftKey, testCopy.get(leftKey)! - 1);
        testCopy.set(rightKey, testCopy.get(rightKey)! - 1);

        for (const [k, c] of testCopy.entries()) {
          if (c >= 2) {
            const temp = cloneCounts(testCopy);
            temp.set(k, c - 2);
            if (canFormMelds(temp)) {
              isKaZhangStructure = true;
              break;
            }
          }
        }
      }
    }

    // 邊張 (胡 3 聽 1-2 或 胡 7 聽 8-9)
    if (huVal === 3 || huVal === 7) {
      const keyA = `${huSuit}_${huVal === 3 ? 1 : 8}`;
      const keyB = `${huSuit}_${huVal === 3 ? 2 : 9}`;

      if ((countsBeforeHu.get(keyA) || 0) >= 1 && (countsBeforeHu.get(keyB) || 0) >= 1) {
        const testCopy = cloneCounts(countsBeforeHu);
        testCopy.set(keyA, testCopy.get(keyA)! - 1);
        testCopy.set(keyB, testCopy.get(keyB)! - 1);

        for (const [k, c] of testCopy.entries()) {
          if (c >= 2) {
            const temp = cloneCounts(testCopy);
            temp.set(k, c - 2);
            if (canFormMelds(temp)) {
              isBianZhangStructure = true;
              break;
            }
          }
        }
      }
    }
  }

  const hasStructure = isDanDiaoStructure || isKaZhangStructure || isBianZhangStructure;
  if (!hasStructure) return { isDukDuk: false, isFakeDuk: false };

  // 3. 全局聽牌數檢測 (Wait Count Check - 含提前剪枝優化)
  const allPossibleTileKeys: string[] = [];
  ['wan', 'tong', 'sou'].forEach(s => {
    for (let i = 1; i <= 9; i++) allPossibleTileKeys.push(`${s}_${i}`);
  });
  for (let i = 1; i <= 4; i++) allPossibleTileKeys.push(`wind_${i}`);
  for (let i = 5; i <= 7; i++) allPossibleTileKeys.push(`dragon_${i}`);

  const winningTileKeys: string[] = [];

  for (const candKey of allPossibleTileKeys) {
    if ((countsBeforeHu.get(candKey) || 0) >= 4) continue;

    const testCounts = cloneCounts(countsBeforeHu);
    testCounts.set(candKey, (testCounts.get(candKey) || 0) + 1);

    let testWinning = false;
    for (const [k, c] of testCounts.entries()) {
      if (c >= 2) {
        const temp = cloneCounts(testCounts);
        temp.set(k, c - 2);
        if (canFormMelds(temp)) {
          testWinning = true;
          break;
        }
      }
    }

    if (testWinning) {
      winningTileKeys.push(candKey);
      // 效能優化：一旦檢測到多於 1 種牌可以食糊，代表絕對不是精準獨聽，可立即剪枝跳出
      if (winningTileKeys.length > 1) break;
    }
  }

  const isTrueSingleWait = winningTileKeys.length === 1 && winningTileKeys[0] === huKey;

  return {
    isDukDuk: hasStructure && isTrueSingleWait,
    isFakeDuk: hasStructure && !isTrueSingleWait
  };
}

// ----------------------------------------------------------------------
// Main Function: calculateHandFan
// ----------------------------------------------------------------------

export function calculateHandFan(
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>,
  huIsZimo?: boolean,
  huTile?: Tile,
  gameContext?: { prevailingWind?: 'east' | 'south' | 'west' | 'north'; seatWind?: 'east' | 'south' | 'west' | 'north' }
): CalculationResult {
  const meldTilesAll: Tile[] = [];
  const meldTilesCounted: Tile[] = [];
  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      meldTilesAll.push(...m.tiles);
      if (m.kind !== 'flower') meldTilesCounted.push(...m.tiles);
    });
  }
  const countedTiles = [...handTiles, ...meldTilesCounted];

  const prevailingWind = gameContext?.prevailingWind;
  const seatWind = gameContext?.seatWind;
  const kongCount = getDeclaredKongCount(meldMap);

  const counts = new Map<string, number>();
  const allTiles = [...handTiles, ...meldTilesAll];
  allTiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const windMelds: MeldEntry[] = [];
  const dragonMelds: MeldEntry[] = [];

  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      if (m.kind === 'flower' || m.kind === 'shang' || !m.tiles.length) return;
      const suit = m.tiles[0].suit;
      if (suit === 'wind') windMelds.push(m);
      if (suit === 'dragon') dragonMelds.push(m);
    });
  }

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

  let possibleCombinations: string[] | undefined;
  let isDukDuk = false;
  let isFakeDuk = false;

  if (shouldValidateWinning) {
    const nonFlowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind !== 'flower') : [];
    const existingMeldCount = nonFlowerMelds.length;
    const neededMelds = 5 - existingMeldCount;

    if (neededMelds < 0) {
      return { isValid: false, totalFan: 0, reason: '成組數量超過允許的 5 組，無法計算。', breakdown: [] };
    }

    const remainingTiles = handTiles.slice();
    const expectedRemaining = neededMelds * 3 + 2;
    if (remainingTiles.length !== expectedRemaining) {
      return { isValid: false, totalFan: 0, reason: `此手牌無法胡牌：剩餘 ${remainingTiles.length} 張，預期 ${expectedRemaining} 張以構成 ${neededMelds} 組與一對。`, breakdown: [] };
    }

    const remainingCounts = new Map<string, number>();
    remainingTiles.forEach(t => {
      const key = `${t.suit}_${t.value}`;
      remainingCounts.set(key, (remainingCounts.get(key) || 0) + 1);
    });

    let winning = false;
    const validCombinations: string[] = [];
    for (const [k, c] of remainingCounts.entries()) {
      if (c >= 2) {
        const copy = cloneCounts(remainingCounts);
        copy.set(k, c - 2);
        if (canFormMelds(copy)) {
          winning = true;
          const pairLabel = tileLabel(k) + 'x2';
          const decomposition = collectMeldCombinations(copy)
            .map(melds => {
              const meldParts = [...melds].sort((a, b) => getPrimaryNumberFromString(a) - getPrimaryNumberFromString(b));
              return [...meldParts, pairLabel].sort((a, b) => {
                const aIsPair = a.includes('x2');
                const bIsPair = b.includes('x2');
                if (aIsPair && !bIsPair) return 1;
                if (!aIsPair && bIsPair) return -1;
                return getPrimaryNumberFromString(a) - getPrimaryNumberFromString(b);
              }).join(', ');
            });
          validCombinations.push(...decomposition);
        }
      }
    }

    possibleCombinations = [...new Set(validCombinations.map(canonicalizeCombination))].sort((a, b) => {
      const aKey = a.split(', ').map(part => getPrimaryNumberFromString(part)).join('|');
      const bKey = b.split(', ').map(part => getPrimaryNumberFromString(part)).join('|');
      const aNums = aKey.split('|').map(Number);
      const bNums = bKey.split('|').map(Number);
      for (let i = 0; i < Math.max(aNums.length, bNums.length); i++) {
        const an = aNums[i] || 0;
        const bn = bNums[i] || 0;
        if (an !== bn) return an - bn;
      }
      return 0;
    });

    if (!winning) {
      return { isValid: false, totalFan: 0, reason: '此手牌無法胡牌：無法將剩餘牌拆解為完整的組合與一對。', breakdown: [] };
    }

    // 進行獨獨 / 假獨檢測
    if (huTile) {
      const waitResult = detectWaitPattern(remainingCounts, huTile);
      isDukDuk = waitResult.isDukDuk;
      isFakeDuk = waitResult.isFakeDuk;
    }
  }

  // ----------------------------------------------------------------------
  // Fan Scoring Calculations
  // ----------------------------------------------------------------------
  const breakdown: { rule: string; fan: number }[] = [];
  let totalFan = 0;

  const seatWindNum = seatWind ? WIND_VALUE_MAP[seatWind] : undefined;
  const prevailingWindNum = prevailingWind ? WIND_VALUE_MAP[prevailingWind] : undefined;

  // 1. 計算露牌中的字牌番數
  const honorMelds = [...windMelds, ...dragonMelds];
  for (const meld of honorMelds) {
    const value = meld.tiles[0].value;
    const result = scoreHonorTriplet(value, seatWindNum, prevailingWindNum);
    totalFan += result.fan;
    breakdown.push(...result.breakdown);
  }

  // 2. 計算暗牌解構中的字牌番數
  if (possibleCombinations && possibleCombinations.length > 0) {
    let bestExtraFan = 0;
    let bestBreakdownToAdd: { rule: string; fan: number }[] = [];

    for (const combo of possibleCombinations) {
      const comboBreakdown: { rule: string; fan: number }[] = [];
      const parts = combo.split(', ');

      for (const part of parts) {
        if (!part.includes('x3')) continue;

        const primaryNum = getPrimaryNumberFromString(part);
        const windCharMatch = part.match(/[東南西北]/)?.[0];
        const dragonCharMatch = part.match(/[中發白]/)?.[0];

        let val = primaryNum;
        if (windCharMatch) val = charToHonorNumber(windCharMatch) || val;
        else if (dragonCharMatch) val = charToHonorNumber(dragonCharMatch) || val;

        if (val >= 1 && val <= 7) {
          const result = scoreHonorTriplet(val, seatWindNum, prevailingWindNum);
          comboBreakdown.push(...result.breakdown);
        }
      }

      const comboTotal = comboBreakdown.reduce((sum, e) => sum + e.fan, 0);
      if (comboTotal > bestExtraFan) {
        bestExtraFan = comboTotal;
        bestBreakdownToAdd = comboBreakdown;
      }
    }

    if (bestExtraFan > 0) {
      totalFan += bestExtraFan;
      breakdown.push(...bestBreakdownToAdd);
    }
  }

  // 3. 自摸
  if (huIsZimo) {
    totalFan += 1;
    breakdown.push({ rule: '自摸 (Zimo)', fan: 1 });
  }

  // 4. 暗槓
  if (meldMap) {
    const concealedKongs = Object.values(meldMap).filter(m => m.kind === 'kong' && m.concealed).length;
    if (concealedKongs > 0) {
      totalFan += concealedKongs;
      breakdown.push({ rule: `暗槓 x${concealedKongs}`, fan: concealedKongs });
    }
  }

  // 5. 獨獨 / 假獨（真獨獨 +1 番；假獨獨 0 番僅於 Breakdown 中顯示/記錄）
  if (isDukDuk) {
    totalFan += 2;
    breakdown.push({ rule: '獨獨 (單釣/卡窿/偏章)', fan: 2 });
  } else if (isFakeDuk) {
    totalFan += 1;
    breakdown.push({ rule: '假獨 (單釣/卡窿/偏章)', fan: 1 });
  }

  return {
    isValid: true,
    totalFan,
    breakdown,
    possibleCombinations
  };
}