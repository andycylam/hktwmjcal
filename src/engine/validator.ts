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
  const suitLabel = suit === 'character' ? '萬' : suit === 'dot' ? '筒' : suit === 'bamboo' ? '索' : suit === 'wind' ? '風' : suit === 'dragon' ? '字' : '';
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

    if (['character', 'dot', 'bamboo'].includes(suit)) {
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

    if (['character', 'dot', 'bamboo'].includes(suit)) {
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

function isMatchFlowerSeat(flowerValue: number, seatWindNum: number | undefined): boolean {
  // 將 1-8 號花牌轉換成 1, 2, 3, 4 號座位
  // (1,5 -> 1 | 2,6 -> 2 | 3,7 -> 3 | 4,8 -> 4)
  const normalizedFlower = ((flowerValue - 1) % 4) + 1;
  
  return normalizedFlower === seatWindNum;
}

function scoreFlower(
  value: number,
  seatWindNum: number | undefined
): { fan: number; breakdown: { rule: string; fan: number }[] } {
  const flowerNames: Record<number, string> = {
    1: '梅', 2: '蘭', 3: '菊', 4: '竹',
    5: '春', 6: '夏', 7: '秋', 8: '冬'
  };
  if (value < 1 || value > 8) return { fan: 0, breakdown: [] };

  const breakdown: { rule: string; fan: number }[] = [];
  let fan = 0;
  const name = flowerNames[value];

  if (isMatchFlowerSeat(value, seatWindNum)) {
    fan += 1;
    breakdown.push({ rule: `正花 (${name})`, fan: 1 });
  }

  fan += 1;
  breakdown.push({ rule: `花牌 (${name})`, fan: 1 });

  return { fan, breakdown };
}

// ----------------------------------------------------------------------
// Wait Analysis Helper (單吊 / 卡窿 / 偏章 與 聽牌數檢測)
// ----------------------------------------------------------------------

type DukDukType = 'danDiu' | 'kaLung' | 'pinZoeng' | null;

function detectWaitPattern(
  remainingCounts: Map<string, number>,
  huTile: Tile
): { isDukDuk: boolean; isFakeDuk: boolean; dukDukType: DukDukType } {
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
  let isDanDiuStructure = false;
  let isKaLungStructure = false;
  let isPinZoengStructure = false;

  // A) 單吊
  if ((countsBeforeHu.get(huKey) || 0) === 1) {
    const testCopy = cloneCounts(countsBeforeHu);
    testCopy.delete(huKey);
    if (canFormMelds(testCopy)) {
      isDanDiuStructure = true;
    }
  }

  // B) 卡窿 & 偏章
  if (['character', 'dot', 'bamboo'].includes(huSuit)) {
    // 卡窿 (胡 2~8 萬/筒/索)
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
              isKaLungStructure = true;
              break;
            }
          }
        }
      }
    }

    // 偏章 (胡 3 聽 1-2 或 胡 7 聽 8-9)
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
              isPinZoengStructure = true;
              break;
            }
          }
        }
      }
    }
  }

  // 確定優先次序（若多重符合，以 單吊 > 卡窿 > 偏章 順序標記類型）
  let dukDukType: DukDukType = null;
  if (isDanDiuStructure) dukDukType = 'danDiu';
  else if (isKaLungStructure) dukDukType = 'kaLung';
  else if (isPinZoengStructure) dukDukType = 'pinZoeng';

  if (!dukDukType) return { isDukDuk: false, isFakeDuk: false, dukDukType: null };

  // 3. 全局聽牌數檢測
  const allPossibleTileKeys: string[] = [];
  ['character', 'dot', 'bamboo'].forEach(s => {
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
      if (winningTileKeys.length > 1) break;
    }
  }

  const isTrueSingleWait = winningTileKeys.length === 1 && winningTileKeys[0] === huKey;

  return {
    isDukDuk: isTrueSingleWait,
    isFakeDuk: !isTrueSingleWait,
    dukDukType
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
  const flowerMelds: MeldEntry[] = [];

  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      if (m.kind === 'shang' || !m.tiles.length) return;
      const suit = m.tiles[0].suit;
      if (suit === 'wind') windMelds.push(m);
      if (suit === 'dragon') dragonMelds.push(m);
      if (suit === 'flower') flowerMelds.push(m);
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
  const remainingCounts = new Map<string, number>();
  let possibleCombinations: string[] | undefined;

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
  }

  // ----------------------------------------------------------------------
  // Fan Scoring Calculations
  // ----------------------------------------------------------------------
  const breakdown: { rule: string; fan: number }[] = [];
  let totalFan = 0;
  
  let isDukDuk = false;
  let isFakeDuk = false;
  let dukDukType: DukDukType = null;
  
  const seatWindNum = seatWind ? WIND_VALUE_MAP[seatWind] : undefined;
  const prevailingWindNum = prevailingWind ? WIND_VALUE_MAP[prevailingWind] : undefined;

  // 收集所有花牌的 value
  const allFlowerTiles = flowerMelds.flatMap(meld => meld.tiles);
  const allFlowerValues = new Set(allFlowerTiles.map(tile => tile.value));

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

  // 4. 槓
  if (meldMap) {
    const kongs = Object.values(meldMap).filter(m => m.kind === 'kong').length;
    if (kongs > 0) {
      totalFan += kongs;
      breakdown.push({ rule: `槓 x${kongs}`, fan: kongs*2 });
    }
  }

  // 5. 獨獨 / 假獨
  if (huTile) {
    const waitResult = detectWaitPattern(remainingCounts, huTile);
    isDukDuk = waitResult.isDukDuk;
    isFakeDuk = waitResult.isFakeDuk;
    dukDukType = waitResult.dukDukType;
  }
  const typeNameMap: Record<string, string> = {
    danDiu: '單吊',
    kaLung: '卡窿',
    pinZoeng: '偏章'
  };
  if (isDukDuk && dukDukType) {
    const typeLabel = typeNameMap[dukDukType];
    totalFan += 2;
    breakdown.push({ rule: `獨獨 (${typeLabel})`, fan: 2 });
  } else if (isFakeDuk && dukDukType) {
    const typeLabel = typeNameMap[dukDukType];
    totalFan += 1;
    breakdown.push({ rule: `假獨 (${typeLabel})`, fan: 1 });
  }


  // 17. 無花, 21. 一台花, 154. 八仙過海
  if (allFlowerTiles.length === 0) {
    totalFan += 1;
    breakdown.push({ rule: '無花', fan: 1 });
  }
  else {
    const hasFirstGroup = [1, 2, 3, 4].every(val => allFlowerValues.has(val));  // 一台花 (1-4)
    const hasSecondGroup = [5, 6, 7, 8].every(val => allFlowerValues.has(val)); // 一台花 (5-8)

    // 處理「八仙過海」與「一台花」邏輯
    if (hasFirstGroup && hasSecondGroup) {
      // 八仙過海 (40番)：不計一台花，亦不計任何單張正花
      totalFan += 40;
      breakdown.push({ rule: '八仙過海', fan: 40 });
    } else {
      // 中了第一組一台花 (1-4)
      if (hasFirstGroup) {
        totalFan += 10;
        breakdown.push({ rule: '一台花 (梅/蘭/竹/菊)', fan: 10 });
      }

      // 中了第二組一台花 (5-8)
      if (hasSecondGroup) {
        totalFan += 10;
        breakdown.push({ rule: '一台花 (春/夏/秋/冬)', fan: 10 });
      }

      // 處理「單張正花」：精準過濾掉已組成「一台花」的花牌
      for (const meld of flowerMelds) {
        for (const tile of meld.tiles) {
          const flowerVal = tile.value;

          // 關鍵過濾邏輯：
          // - 如果已中第一組一台花，跳過 1, 2, 3, 4 號花的單張計數
          if (hasFirstGroup && flowerVal >= 1 && flowerVal <= 4) continue;
          // - 如果已中第二組一台花，跳過 5, 6, 7, 8 號花的單張計數
          if (hasSecondGroup && flowerVal >= 5 && flowerVal <= 8) continue;

          // 只有「未湊成一台花」的組別，才會計算單張正花
          const result = scoreFlower(flowerVal, seatWindNum);
          if (result.fan > 0) {
            totalFan += result.fan;
            breakdown.push(...result.breakdown);
          }
        }
      }
    }
  }
  return {
    isValid: true,
    totalFan,
    breakdown,
    possibleCombinations
  };
}
