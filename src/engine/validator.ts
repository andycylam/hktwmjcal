import { Tile, CalculationResult } from '../types/mahjong';
import { evaluateLikGooSpecialPatterns } from './likgoo.helper';
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

interface FanResult {
  rule: string;
  fan: number;
}

class FanCalculator {
  totalFan = 0;
  breakdown: FanResult[] = [];

  add(rule: string, fan: number) {
    if (fan <= 0) return;
    this.totalFan += fan;
    this.breakdown.push({ rule, fan });
  }

  addMany(items: FanResult[]) {
    for (const item of items) {
      this.add(item.rule, item.fan);
    }
  }

  clone(): FanCalculator {
    const copy = new FanCalculator();
    copy.totalFan = this.totalFan;
    copy.breakdown = [...this.breakdown];
    return copy;
  }
}

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

function hasHonorTiles(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
  const hasInHand = handTiles.some(t => t.suit === 'wind' || t.suit === 'dragon');
  if (hasInHand) return true;

  if (meldMap) {
    for (const meld of Object.values(meldMap)) {
      if (meld.tiles.length === 0) continue;
      const firstTileSuit = meld.tiles[0].suit;
      if (firstTileSuit === 'wind' || firstTileSuit === 'dragon') {
        return true;
      }
    }
  }

  return false;
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

function hasNonFlowerMelds(meldMap?: Record<string, MeldEntry>): boolean {
  if (!meldMap) return false;

  for (const key in meldMap) {
    if (meldMap[key].kind !== 'flower') {
      return true;
    }
  }

  return false;
}

function isFullFlush(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
  const relevantTiles: Tile[] = [...handTiles];

  if (meldMap) {
    Object.values(meldMap).forEach(meld => {
      if (meld.kind !== 'flower') {
        relevantTiles.push(...meld.tiles);
      }
    });
  }

  if (relevantTiles.length === 0) return false;

  const hasHonorTiles = relevantTiles.some(t => t.suit === 'wind' || t.suit === 'dragon');
  if (hasHonorTiles) return false;

  const firstSuit = relevantTiles[0].suit;
  if (!['character', 'dot', 'bamboo'].includes(firstSuit)) {
    return false;
  }

  return relevantTiles.every(t => t.suit === firstSuit);
}

// ----------------------------------------------------------------------
// Wait Analysis Helper
// ----------------------------------------------------------------------

type DukDukType = 'danDiu' | 'kaLung' | 'pinZoeng' | null;

function detectWaitPattern(
  remainingCounts: Map<string, number>,
  huTile: Tile
): { isDukDuk: boolean; isFakeDuk: boolean; dukDukType: DukDukType } {
  const huKey = `${huTile.suit}_${huTile.value}`;
  const [huSuit, huValStr] = huKey.split('_');
  const huVal = Number(huValStr);

  const countsBeforeHu = cloneCounts(remainingCounts);
  const currentHuCount = countsBeforeHu.get(huKey) || 0;
  if (currentHuCount > 0) {
    if (currentHuCount === 1) countsBeforeHu.delete(huKey);
    else countsBeforeHu.set(huKey, currentHuCount - 1);
  }

  let isDanDiuStructure = false;
  let isKaLungStructure = false;
  let isPinZoengStructure = false;

  const canFormWithPair = (counts: Map<string, number>): boolean => {
    for (const [k, c] of counts.entries()) {
      if (c >= 2) {
        const temp = cloneCounts(counts);
        temp.set(k, c - 2);
        if (canFormMelds(temp)) return true;
      }
    }
    return false;
  };

  if ((countsBeforeHu.get(huKey) || 0) === 1) {
    const testCopy = cloneCounts(countsBeforeHu);
    testCopy.delete(huKey);
    if (canFormMelds(testCopy)) {
      isDanDiuStructure = true;
    }
  }

  if (['character', 'dot', 'bamboo'].includes(huSuit)) {
    if (huVal >= 2 && huVal <= 8) {
      const leftKey = `${huSuit}_${huVal - 1}`;
      const rightKey = `${huSuit}_${huVal + 1}`;

      if ((countsBeforeHu.get(leftKey) || 0) >= 1 && (countsBeforeHu.get(rightKey) || 0) >= 1) {
        const testCopy = cloneCounts(countsBeforeHu);
        testCopy.set(leftKey, testCopy.get(leftKey)! - 1);
        testCopy.set(rightKey, testCopy.get(rightKey)! - 1);
        if (canFormWithPair(testCopy)) isKaLungStructure = true;
      }
    }

    if (huVal === 3 || huVal === 7) {
      const keyA = `${huSuit}_${huVal === 3 ? 1 : 8}`;
      const keyB = `${huSuit}_${huVal === 3 ? 2 : 9}`;

      if ((countsBeforeHu.get(keyA) || 0) >= 1 && (countsBeforeHu.get(keyB) || 0) >= 1) {
        const testCopy = cloneCounts(countsBeforeHu);
        testCopy.set(keyA, testCopy.get(keyA)! - 1);
        testCopy.set(keyB, testCopy.get(keyB)! - 1);
        if (canFormWithPair(testCopy)) isPinZoengStructure = true;
      }
    }
  }

  let dukDukType: DukDukType = null;
  if (isDanDiuStructure) dukDukType = 'danDiu';
  else if (isKaLungStructure) dukDukType = 'kaLung';
  else if (isPinZoengStructure) dukDukType = 'pinZoeng';

  if (!dukDukType) return { isDukDuk: false, isFakeDuk: false, dukDukType: null };

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

    if (canFormWithPair(testCounts)) {
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
// 嚦咕嚦咕 (Lik Goo Lik Goo) 檢測 Helper
// ----------------------------------------------------------------------

interface LikGooAnalysis {
  isLikGoo: boolean;
  combinationLabel?: string;
  tripletTileKey?: string;
}

function checkLikGoo(
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>
): LikGooAnalysis {
  if (hasNonFlowerMelds(meldMap)) {
    return { isLikGoo: false };
  }

  if (handTiles.length !== 17) {
    return { isLikGoo: false };
  }

  const handCounts = new Map<string, number>();
  handTiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    handCounts.set(key, (handCounts.get(key) || 0) + 1);
  });

  let pairCount = 0;
  let tripletCount = 0;
  let tripletTileKey = '';
  const partsLabel: string[] = [];

  for (const [key, count] of handCounts.entries()) {
    if (count === 2) {
      pairCount++;
      partsLabel.push(`${tileLabel(key)}x2`);
    } else if (count === 3) {
      tripletCount++;
      tripletTileKey = key;
      partsLabel.push(`${tileLabel(key)}x3`);
    } else if (count === 4) {
      pairCount += 2;
      partsLabel.push(`${tileLabel(key)}x2`, `${tileLabel(key)}x2`);
    } else {
      return { isLikGoo: false };
    }
  }

  if (pairCount === 7 && tripletCount === 1) {
    const combinationLabel = partsLabel.sort().join(', ');
    return {
      isLikGoo: true,
      combinationLabel,
      tripletTileKey
    };
  }

  return { isLikGoo: false };
}

// ----------------------------------------------------------------------
// 將眼 Helper
// ----------------------------------------------------------------------

function getJeungNgaanFromCombination(
  combination: string
): FanResult | null {
  const parts = combination.split(', ');
  const pairPart = parts.find(part => part.includes('x2'));

  if (!pairPart) return null;

  const suit = pairPart.match(/[萬筒索]/)?.[0];
  const valueMatch = pairPart.match(/\d+/);
  const value = valueMatch ? Number(valueMatch[0]) : null;

  if (
    suit &&
    value !== null &&
    [2, 5, 8].includes(value)
  ) {
    return {
      rule: `將眼 (${value}${suit})`,
      fan: 2
    };
  }

  return null;
}


// ----------------------------------------------------------------------
// 風牌牌型 Helper
// 大四喜、小四喜、大三風、小三風
// ----------------------------------------------------------------------

type WindPattern =
  | 'bigFourWinds'
  | 'smallFourWinds'
  | 'bigThreeWinds'
  | 'smallThreeWinds'
  | null;

interface WindPatternAnalysis {
  pattern: WindPattern;
  tripletValues: Set<number>;
  pairValue?: number;
}

function analyzeWindPattern(
  comboStr?: string,
  meldMap?: Record<string, MeldEntry>
): WindPatternAnalysis {
  const tripletValues = new Set<number>();
  let pairValue: number | undefined;

  // 1. 副露中的風牌碰／槓
  if (meldMap) {
    for (const meld of Object.values(meldMap)) {
      if (
        (meld.kind === 'pung' || meld.kind === 'kong') &&
        meld.tiles.length > 0 &&
        meld.tiles[0].suit === 'wind'
      ) {
        const value = meld.tiles[0].value;

        if (value >= 1 && value <= 4) {
          tripletValues.add(value);
        }
      }
    }
  }

  // 2. 暗牌拆解中的風牌刻子及風牌眼
  if (comboStr) {
    const parts = comboStr.split(', ');

    for (const part of parts) {
      const windChar = part.match(/[東南西北]/)?.[0];

      if (!windChar) continue;

      const value = charToHonorNumber(windChar);

      if (
        value === null ||
        value < 1 ||
        value > 4
      ) {
        continue;
      }

      if (part.includes('x3')) {
        tripletValues.add(value);
      }

      if (part.includes('x2')) {
        pairValue = value;
      }
    }
  }

  // 93. 大四喜
  // 東、南、西、北全部為刻子／碰／槓
  if ([1, 2, 3, 4].every(value => tripletValues.has(value))) {
    return {
      pattern: 'bigFourWinds',
      tripletValues
    };
  }

  // 94. 小四喜
  // 三款風牌為刻子／碰／槓，餘下一款風牌做眼
  const isSmallFourWinds =
    tripletValues.size === 3 &&
    pairValue !== undefined &&
    !tripletValues.has(pairValue) &&
    [1, 2, 3, 4].every(
      value =>
        tripletValues.has(value) ||
        value === pairValue
    );

  if (isSmallFourWinds) {
    return {
      pattern: 'smallFourWinds',
      tripletValues,
      pairValue
    };
  }

  // 95.大三風
  // 任意三款不同風牌為刻子／碰／槓
  if (tripletValues.size === 3) {
    return {
      pattern: 'bigThreeWinds',
      tripletValues,
      pairValue
    };
  }

  // 96.小三風
  // 任意兩款不同風牌為刻子／碰／槓，
  // 另一款不同風牌做眼
  const isSmallThreeWinds =
    tripletValues.size === 2 &&
    pairValue !== undefined &&
    !tripletValues.has(pairValue);

  if (isSmallThreeWinds) {
    return {
      pattern: 'smallThreeWinds',
      tripletValues,
      pairValue
    };
  }

  return {
    pattern: null,
    tripletValues,
    pairValue
  };
}

// ----------------------------------------------------------------------
// 三元牌牌型 Helper
// 97.大三元、98.小三元
// ----------------------------------------------------------------------

type DragonPattern =
  | 'bigThreeDragons'
  | 'smallThreeDragons'
  | null;

interface DragonPatternAnalysis {
  pattern: DragonPattern;
  tripletValues: Set<number>;
  pairValue?: number;
}

function analyzeDragonPattern(
  comboStr?: string,
  meldMap?: Record<string, MeldEntry>
): DragonPatternAnalysis {
  const tripletValues = new Set<number>();
  let pairValue: number | undefined;

  // 1. 副露中的三元牌碰／槓
  if (meldMap) {
    for (const meld of Object.values(meldMap)) {
      if (
        (meld.kind === 'pung' || meld.kind === 'kong') &&
        meld.tiles.length > 0 &&
        meld.tiles[0].suit === 'dragon'
      ) {
        const value = meld.tiles[0].value;

        if (value >= 5 && value <= 7) {
          tripletValues.add(value);
        }
      }
    }
  }

  // 2. 暗牌拆解中的三元牌刻子及三元牌眼
  if (comboStr) {
    const parts = comboStr.split(', ');

    for (const part of parts) {
      const dragonChar = part.match(/[中發白]/)?.[0];

      if (!dragonChar) continue;

      const value = charToHonorNumber(dragonChar);

      if (
        value === null ||
        value < 5 ||
        value > 7
      ) {
        continue;
      }

      if (part.includes('x3')) {
        tripletValues.add(value);
      }

      if (part.includes('x2')) {
        pairValue = value;
      }
    }
  }

  // 97.大三元
  // 中、發、白全部為刻子／碰／槓
  if ([5, 6, 7].every(value => tripletValues.has(value))) {
    return {
      pattern: 'bigThreeDragons',
      tripletValues
    };
  }

  // 98.小三元
  // 中、發、白其中兩款為刻子／碰／槓，
  // 餘下一款做眼
  const isSmallThreeDragons =
    tripletValues.size === 2 &&
    pairValue !== undefined &&
    !tripletValues.has(pairValue) &&
    [5, 6, 7].every(
      value =>
        tripletValues.has(value) ||
        value === pairValue
    );

  if (isSmallThreeDragons) {
    return {
      pattern: 'smallThreeDragons',
      tripletValues,
      pairValue
    };
  }

  return {
    pattern: null,
    tripletValues,
    pairValue
  };
}

// ----------------------------------------------------------------------
// 食糊牌與組合牌匹配 Helper for check 對碰
// ----------------------------------------------------------------------

function doesMeldPartMatchTile(
  part: string,
  tile: Tile
): boolean {
  // 萬、筒、索
  if (
    tile.suit === 'character' ||
    tile.suit === 'dot' ||
    tile.suit === 'bamboo'
  ) {
    const suitLabel =
      tile.suit === 'character'
        ? '萬'
        : tile.suit === 'dot'
          ? '筒'
          : '索';

    return part.includes(`${tile.value}${suitLabel}`);
  }

  // 東、南、西、北
  if (tile.suit === 'wind') {
    const windCharMap: Record<number, string> = {
      1: '東',
      2: '南',
      3: '西',
      4: '北'
    };

    const windChar = windCharMap[tile.value];

    return !!windChar && part.includes(windChar);
  }

  // 中、發、白
  if (tile.suit === 'dragon') {
    const dragonCharMap: Record<number, string> = {
      5: '中',
      6: '發',
      7: '白'
    };

    const dragonChar = dragonCharMap[tile.value];

    return !!dragonChar && part.includes(dragonChar);
  }

  return false;
}

// ----------------------------------------------------------------------
// 對碰 Helper
// ----------------------------------------------------------------------

/**
 * 對碰成立條件：
 *
 * 1. 食糊後的基本形拆解中有一對眼
 * 2. 食糊牌被用於一組刻子
 * 3. 扣除食糊牌後，該刻子原本是一對
 *
 * 即食糊前有兩對：
 * - 一對被食糊牌補成刻子
 * - 另一對成為最終的眼
 */
function isDoiPungWait(
  comboStr: string | undefined,
  huTile: Tile | undefined
): boolean {
  if (!comboStr || !huTile) {
    return false;
  }

  const parts = comboStr.split(', ');

  // 食糊後必須仍然有一對正式的眼
  const hasFinalPair = parts.some(part =>
    part.includes('x2')
  );

  if (!hasFinalPair) {
    return false;
  }

  // 食糊牌必須完成其中一組刻子
  const winningTriplet = parts.find(part =>
    part.includes('x3') &&
    doesMeldPartMatchTile(part, huTile)
  );

  return winningTriplet !== undefined;
}


// ----------------------------------------------------------------------
// 通用單一形牌型番數計算器 (Unified Single Form Engine)
// ----------------------------------------------------------------------

function calculateSingleHandForm(
  formType: 'basic' | 'likGoo',
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>,
  huIsZimo?: boolean,
  comboStr?: string,
  huTile?: Tile,
  remainingCounts?: Map<string, number>,
  gameContext?: { prevailingWind?: 'east' | 'south' | 'west' | 'north'; seatWind?: 'east' | 'south' | 'west' | 'north' }
): FanCalculator {
  const calc = new FanCalculator();
  const seatWindNum = gameContext?.seatWind ? WIND_VALUE_MAP[gameContext.seatWind] : undefined;
  const prevailingWindNum = gameContext?.prevailingWind ? WIND_VALUE_MAP[gameContext.prevailingWind] : undefined;

  const flowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind === 'flower') : [];
  const allFlowerTiles = flowerMelds.flatMap(meld => meld.tiles);
  const allFlowerValues = new Set(allFlowerTiles.map(tile => tile.value));

  const hasHonor = hasHonorTiles(handTiles, meldMap);
  const hasFlower = allFlowerTiles.length > 0;
  const hasNonFlowerMeld = hasNonFlowerMelds(meldMap);

  let countNoHonor = true;  //不計無字
  let countNoFlower = true; //不計無花
  let countNoHonorFlower = true; //不計無字花
  let countZimo = true; //不計自摸
  //let countHonorTriplets = true; //不計字牌正字
  let countWind = true;
  let countDragon = true;
  
  const huKey = huTile? `${huTile.suit}_${huTile.value}` : undefined;
  // 123. 形態專屬主牌型 (嚦咕嚦咕)
  if (formType === 'likGoo') {
    calc.add('嚦咕嚦咕', 40);
    // 124. 八對嚦咕
    if (huKey){
      // 1. 統計包含胡牌在內嘅所有手牌數量
      const counts = new Map<string, number>();
      for (const t of handTiles) {
        const key = `${t.suit}_${t.value}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      // 2. 扣除胡牌嗰 1 張，計算「食糊前」嘅數量
      const countBeforeHu = (counts.get(huKey) || 0) - 1;

      // 3. 檢查食糊前是否剛好兩隻
      if(countBeforeHu === 2) {
        calc.add('八對嚦咕', 10);
      }
    }
    // 評估嚦咕嚦咕的特殊牌型組合（三元、四喜、三色同對、連對系列）
    const specialLikGooFans = evaluateLikGooSpecialPatterns(handTiles);
    for (const item of specialLikGooFans) {
      calc.add(item.rule, item.fan);
    }
  }

  // 151. & 152. 特殊求人牌型 (僅限基本形)
  if (formType === 'basic' && handTiles.length === 2) {
    if (!huIsZimo) calc.add('全求人', 40);
    else { calc.add('半求人', 20); countZimo = false; }
  }

  // ------------------------------------------------------------------
  // 風牌及三元牌大型牌型
  //
  // 以下牌型成立後，全部不再另計：
  // - 字牌（東、南、西、北、中、發、白）
  // - 正字（座位）
  // - 正字（場風）
  // ------------------------------------------------------------------

  if (formType === 'basic') {
    const windAnalysis = analyzeWindPattern(
      comboStr,
      meldMap
    );

    const dragonAnalysis = analyzeDragonPattern(
      comboStr,
      meldMap
    );


    // 93. 大四喜、94. 小四喜、95.大三風、96.小三風
    switch (windAnalysis.pattern) {
      case 'bigFourWinds':
        calc.add('大四喜', 180);
        countWind = false;
        break;

      case 'smallFourWinds':
        calc.add('小四喜', 120);
        countWind = false;
        break;

      case 'bigThreeWinds':
        calc.add('大三風', 60);
        countWind = false;
        break;

      case 'smallThreeWinds':
        calc.add('小三風', 30);
        countWind = false;
        break;
    }

    // 97.大三元、98.小三元
    switch (dragonAnalysis.pattern) {
      case 'bigThreeDragons':
        calc.add('大三元', 80);
        countDragon = false;
        break;

      case 'smallThreeDragons':
        calc.add('小三元', 40);
        countDragon = false;
        break;
    }
  }


  // 114. 清一色 (共通)
  if (isFullFlush(handTiles, meldMap)) {
    calc.add('清一色', 120);
    countNoHonor = false;
    countNoHonorFlower = false;
  }

  // 3. 自摸 (共通)
  if (huIsZimo && countZimo) calc.add('自摸', 1);

  // 20. 無字花
  if (!hasHonor && !hasFlower && countNoHonorFlower) {
    countNoHonor = false;
    countNoFlower = false;
    calc.add('無字花', 5);
  }

  // 14. 無字
  if (!hasHonor && countNoHonor){
    calc.add('無字', 1);
  } 

  // 15. 字牌 及 16.正字
  if (formType === 'basic') {
    const windMelds = meldMap ? Object.values(meldMap).filter(meld =>  (meld.kind === 'pung' || meld.kind === 'kong') && meld.tiles.length > 0 && meld.tiles[0].suit === 'wind') : [];
    const dragonMelds = meldMap ? Object.values(meldMap).filter(meld => (meld.kind === 'pung' || meld.kind === 'kong') && meld.tiles.length > 0 && meld.tiles[0].suit === 'dragon') : [];

    // A. 計算副露中的風牌及三元牌
    if (countWind){
      for (const meld of [...windMelds]) {
        const value = meld.tiles[0].value;
        const result = scoreHonorTriplet(value, seatWindNum, prevailingWindNum);
        calc.addMany(result.breakdown);
      }
    }
    if (countDragon){
      for (const meld of [...dragonMelds]) {
        const value = meld.tiles[0].value;
        const result = scoreHonorTriplet(value, seatWindNum, prevailingWindNum);
        calc.addMany(result.breakdown);
      }
    }
    // B. 計算暗牌拆解中的風牌及三元牌
    if (comboStr) {
      const parts = comboStr.split(', ');
      for (const part of parts) {
        if (!part.includes('x3')) continue;
        const windCharMatch = part.match(/[東南西北]/)?.[0];
        const dragonCharMatch = part.match(/[中發白]/)?.[0];
        let val: number | null = null;

        if (windCharMatch && countWind) {
          val = charToHonorNumber(windCharMatch);
        } else if (dragonCharMatch && countDragon) {
          val = charToHonorNumber(dragonCharMatch);
        }

        if (val !== null && val >= 1 && val <= 7) {
          const result = scoreHonorTriplet(val, seatWindNum, prevailingWindNum);
          calc.addMany(result.breakdown);
        }
      }
    }
}

  // 25. 將眼 (僅限基本形)
  if (formType === 'basic' && comboStr) {
    const jeungNgaan = getJeungNgaanFromCombination(comboStr);
    if (jeungNgaan) calc.add(jeungNgaan.rule, jeungNgaan.fan);
  }


  // 22.對碰（僅限基本形）
  // 食糊前有兩對，食糊牌令其中一對組成刻子
  if (formType === 'basic' && isDoiPungWait(comboStr, huTile)) {
    calc.add('對碰', 1);
  }


  // 92. 槓 (僅限基本形)
  if (formType === 'basic' && meldMap) {
    const kongs = Object.values(meldMap).filter(m => m.kind === 'kong' && !m.concealed).length;
    if (kongs > 0){
      calc.add(`槓 x${kongs}`, kongs);
    }
  }

  // 4. 暗槓
  if (formType === 'basic' && meldMap) {
    const concealedKongs = Object.values(meldMap).filter(m => m.kind === 'kong' && m.concealed).length;
    if (concealedKongs > 0) {
      calc.add(`暗槓 x${concealedKongs}`, concealedKongs * 2);
    }
  }

  // 23. & 24. 聽牌獨獨/假獨 (基本)
  if (formType === 'basic' && huTile && handTiles.length !== 2 && remainingCounts) {
    const waitResult = detectWaitPattern(remainingCounts, huTile);
    const typeNameMap: Record<string, string> = { danDiu: '單吊', kaLung: '卡窿', pinZoeng: '偏章' };
    if (waitResult.isDukDuk && waitResult.dukDukType) {
      calc.add(`獨獨 (${typeNameMap[waitResult.dukDukType]})`, 2);
    } else if (waitResult.isFakeDuk && waitResult.dukDukType) {
      calc.add(`假獨 (${typeNameMap[waitResult.dukDukType]})`, 1);
    }
  }
  // 獨獨 (嚦咕)
  if (formType === 'likGoo' && huKey) {
    // 1. 統計包含胡牌在內嘅所有手牌數量
    const counts = new Map<string, number>();
    for (const t of handTiles) {
      const key = `${t.suit}_${t.value}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // 2. 扣除胡牌嗰 1 張，計算「食糊前」嘅數量
    const countBeforeHu = (counts.get(huKey) || 0) - 1;

    // 3. 檢查食糊前是否剛好得一隻
    if(countBeforeHu === 1) {
      calc.add('獨獨 (單吊)', 2);
    }
  }

  // 18. & 21. 花牌 (共通)
  if (!hasFlower) {
    if (countNoFlower) calc.add('無花', 1);
  } else {
    const hasFirstGroup = [1, 2, 3, 4].every(val => allFlowerValues.has(val));
    const hasSecondGroup = [5, 6, 7, 8].every(val => allFlowerValues.has(val));

    if (hasFirstGroup && hasSecondGroup) calc.add('八仙過海', 40);
    else {
      if (hasFirstGroup) calc.add('一台花 (梅,蘭,竹,菊)', 10);
      if (hasSecondGroup) calc.add('一台花 (春,夏,秋,冬)', 10);

      for (const meld of flowerMelds) {
        for (const tile of meld.tiles) {
          const flowerVal = tile.value;
          if (hasFirstGroup && flowerVal >= 1 && flowerVal <= 4) continue;
          if (hasSecondGroup && flowerVal >= 5 && flowerVal <= 8) continue;
          calc.addMany(scoreFlower(flowerVal, seatWindNum).breakdown);
        }
      }
    }
  }

  // 2. 門清 (僅基本形成立)
  if (formType === 'basic' && !hasNonFlowerMeld && !hasFlower) {
    calc.add('門清', 5);
  }


  

  return calc;
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

  const kongCount = getDeclaredKongCount(meldMap);

  const counts = new Map<string, number>();
  const allTiles = [...handTiles, ...meldTilesAll];
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

  const totalTilesNeeded = 17 + kongCount;

  if (countedTiles.length < totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，需滿 ${totalTilesNeeded} 張才可計算。`,
      breakdown: []
    };
  }
  if (countedTiles.length > totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，超出允許的上限 ${totalTilesNeeded} 張。`,
      breakdown: []
    };
  }

  // 1. 檢查嚦咕嚦咕
  const likGooResult = checkLikGoo(handTiles, meldMap);

  // 2. 檢查基本形 (5面子 + 1眼)
  const remainingCounts = new Map<string, number>();
  let possibleCombinations: string[] | undefined;
  let canFormBasicHu = false;

  const nonFlowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind !== 'flower') : [];
  const existingMeldCount = nonFlowerMelds.length;
  const neededMelds = 5 - existingMeldCount;

  if (neededMelds >= 0) {
    const remainingTiles = handTiles.slice();
    const expectedRemaining = neededMelds * 3 + 2;

    if (remainingTiles.length === expectedRemaining) {
      remainingTiles.forEach(t => {
        const key = `${t.suit}_${t.value}`;
        remainingCounts.set(key, (remainingCounts.get(key) || 0) + 1);
      });

      const validCombinations: string[] = [];
      for (const [k, c] of remainingCounts.entries()) {
        if (c >= 2) {
          const copy = cloneCounts(remainingCounts);
          copy.set(k, c - 2);
          if (canFormMelds(copy)) {
            canFormBasicHu = true;
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

      if (canFormBasicHu) {
        possibleCombinations = [...new Set(validCombinations.map(canonicalizeCombination))];
      }
    }
  }

  // 若兩者皆不成立，回傳無法食糊
  if (!canFormBasicHu && !likGooResult.isLikGoo) {
    return {
      isValid: false,
      totalFan: 0,
      reason: '此手牌無法食糊：未能達成基本形（5組與一對）或嚦咕嚦咕牌型。',
      breakdown: []
    };
  }

  // ----------------------------------------------------------------------
  // 計算番數
  // ----------------------------------------------------------------------

  // A. 計算基本形得分 (取最高分的牌型分解)
  let basicCalc: FanCalculator | null = null;

  if (canFormBasicHu && possibleCombinations) {
    let maxBasicFan = -1;
    for (const combo of possibleCombinations) {
      const comboCalc = calculateSingleHandForm(
        'basic', handTiles, meldMap, huIsZimo, combo, huTile, remainingCounts, gameContext
      );
      if (comboCalc.totalFan > maxBasicFan) {
        maxBasicFan = comboCalc.totalFan;
        basicCalc = comboCalc;
      }
    }
  }

  // B. 計算嚦咕形得分
  let likGooCalc: FanCalculator | null = null;

  if (likGooResult.isLikGoo) {
    likGooCalc = calculateSingleHandForm(
      'likGoo', handTiles, meldMap, huIsZimo, undefined, huTile, undefined, gameContext
    );
  }

  // ----------------------------------------------------------------------
  // 結算與兩食處理 (Double Eat Settlement)
  // ----------------------------------------------------------------------
  let finalCalc = new FanCalculator();
  const allCombinations: string[] = [];

  if (possibleCombinations) {
    allCombinations.push(...possibleCombinations);
  }

  if (canFormBasicHu && likGooResult.isLikGoo && basicCalc && likGooCalc) {
    // 【嚦咕兩食】：直接將「基本形」與「嚦咕形」的番數完全加總（包含無花/自摸等雙重計算）
    finalCalc.addMany(basicCalc.breakdown);
    finalCalc.addMany(likGooCalc.breakdown);

    if (likGooResult.combinationLabel) {
      allCombinations.push(`[嚦咕形] ${likGooResult.combinationLabel}`);
    }
  } else if (likGooResult.isLikGoo && likGooCalc) {
    // 僅成立嚦咕形
    finalCalc = likGooCalc;
    if (likGooResult.combinationLabel) {
      allCombinations.push(`[嚦咕形] ${likGooResult.combinationLabel}`);
    }
  } else if (basicCalc) {
    // 僅成立基本形
    finalCalc = basicCalc;
  }

  return {
    isValid: true,
    totalFan: finalCalc.totalFan,
    breakdown: finalCalc.breakdown,
    possibleCombinations: allCombinations.length > 0 ? allCombinations : undefined
  };
}
