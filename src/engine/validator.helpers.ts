import { Tile } from '../types/mahjong';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type MeldEntry = { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[]; concealed?: boolean };

// ----------------------------------------------------------------------
// Helper Functions & Maps
// ----------------------------------------------------------------------

export const WIND_VALUE_MAP: Record<'east' | 'south' | 'west' | 'north', number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

// 字牌嘅統一映射表（避免喺各函數內重複定義）
export const WIND_CHARS: Record<number, string> = { 1: '東', 2: '南', 3: '西', 4: '北' };
export const DRAGON_CHARS: Record<number, string> = { 5: '中', 6: '發', 7: '白' };
export const HONOR_CHARS: Record<number, string> = { ...WIND_CHARS, ...DRAGON_CHARS };
const HONOR_CHAR_TO_NUMBER: Record<string, number> = Object.fromEntries(
  Object.entries(HONOR_CHARS).map(([num, ch]) => [ch, Number(num)])
);
// 完整版字牌名稱（用於顯示）
const FULL_DRAGON_NAMES: Record<number, string> = { 5: '紅中', 6: '發財', 7: '白板' };

// 數字中文（用於牌面顯示）
const CHINESE_NUM: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九'
};

// 反向映射：中文數字 → 整數（供 normalizeMeldPart 解析牌面字符串用）
const CHINESE_NUM_TO_INT: Record<string, number> = Object.fromEntries(
  Object.entries(CHINESE_NUM).map(([k, v]) => [v, Number(k)])
);

export interface FanResult {
  rule: string;
  fan: number;
}

export class FanCalculator {
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

export function getDeclaredKongCount(meldMap?: Record<string, MeldEntry>): number {
  return meldMap ? Object.values(meldMap).filter(m => m.kind === 'kong').length : 0;
}


// True if any meld is a concealed kong (暗槓)
export function hasConcealedKong(meldMap?: Record<string, MeldEntry>): boolean {
  if (!meldMap) return false;
  return Object.values(meldMap).some(m => m.kind === 'kong' && m.concealed === true);
}

// 統計手牌中每種牌（suit_value）出現嘅次數
export function countTileOccurrences(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function honorNumberToChar(suitChar: string, num: number): string {
  if (suitChar === '風') {
    if (num >= 5) return FULL_DRAGON_NAMES[num] || String(num);
    return WIND_CHARS[num] || String(num);
  }
  if (suitChar === '字') {
    return FULL_DRAGON_NAMES[num] || String(num);
  }
  return String(num);
}

export function charToHonorNumber(ch: string): number | null {
  return HONOR_CHAR_TO_NUMBER[ch] ?? null;
}

export function getPrimaryNumberFromString(s: string): number {
  const numMatch = s.match(/\d+/);
  if (numMatch) return Number(numMatch[0]);
  const charMatch = s.match(/[東南西北中發白]/)?.[0];
  if (charMatch) return charToHonorNumber(charMatch) ?? 0;
  return 0;
}

export function cloneCounts(src: Map<string, number>): Map<string, number> {
  return new Map(src);
}

export function removeTiles(countMap: Map<string, number>, tiles: string[]): Map<string, number> | null {
  const next = cloneCounts(countMap);
  for (const tile of tiles) {
    const nextValue = (next.get(tile) || 0) - 1;
    if (nextValue < 0) return null;
    if (nextValue === 0) next.delete(tile);
    else next.set(tile, nextValue);
  }
  return next;
}

export function tileLabel(tile: string): string {
  const [suit, valueStr] = tile.split('_');
  const value = Number(valueStr);
  const suitLabel = suit === 'character' ? '萬' : suit === 'dot' ? '筒' : suit === 'bamboo' ? '索' : suit === 'wind' ? '風' : suit === 'dragon' ? '字' : '';
  return `${CHINESE_NUM[value] || value}${suitLabel}`;
}

export function meldLabel(tiles: string[]): string {
  const ordered = [...tiles].sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
  const labels = ordered.map(tileLabel);

  if (ordered.length === 3 && ordered.every(tile => tile.split('_')[1] === ordered[0].split('_')[1])) {
    return `${tileLabel(ordered[0])}x3`;
  }
  if (ordered.length === 3) return labels.join('-');
  if (ordered.length === 2) return `${tileLabel(ordered[0])}x2`;
  return labels.join('-');
}

function suitNumberLabel(n: number): string {
  return CHINESE_NUM[n] || String(n);
}

function parseSuitNumber(s: string): number {
  // Try Arabic digit first
  const num = Number(s);
  if (!isNaN(num) && num >= 1 && num <= 9) return num;
  // Fall back to Chinese numeral lookup
  return CHINESE_NUM_TO_INT[s] ?? 0;
}

function normalizeMeldPart(part: string): { sortKey: number; pair: boolean; token: string } {
  const suitMatch = part.match(/[萬筒索風字]/)?.[0] ?? '';
  const numbers = [...part.matchAll(/[\d一二三四五六七八九]/g)].map(m => parseSuitNumber(m[0]));
  const firstNumber = numbers[0] ?? 0;

  const dragonChars = ['紅中', '發財', '白板'];
  const isDragon = (ch: string) => dragonChars.includes(ch);

  if (part.includes('x3')) {
    const displayNum = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, firstNumber) : suitNumberLabel(firstNumber);
    const suffix = isDragon(displayNum) ? '' : suitMatch;
    return { sortKey: firstNumber, pair: false, token: `${displayNum}${suffix}x3` };
  }

  if (part.includes('x2')) {
    const displayNum = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, firstNumber) : suitNumberLabel(firstNumber);
    const suffix = isDragon(displayNum) ? '' : suitMatch;
    return { sortKey: firstNumber, pair: true, token: `${displayNum}${suffix}x2` };
  }

  const normalizedNumbers = [...numbers].sort((a, b) => a - b);
  const displayParts = normalizedNumbers.map(value => {
    const ch = (suitMatch === '風' || suitMatch === '字') ? honorNumberToChar(suitMatch, value) : suitNumberLabel(value);
    return isDragon(ch) ? ch : `${ch}${suitMatch}`;
  });

  return {
    sortKey: normalizedNumbers[0] ?? 0,
    pair: false,
    token: displayParts.join('-')
  };
}

export function canonicalizeCombination(combo: string): string {
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

function makeStateKey(countMap: Map<string, number>): string {
  return [...countMap.entries()]
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tile, count]) => `${tile}:${count}`)
    .join('|');
}

function hasRemainingTiles(countMap: Map<string, number>): boolean {
  return [...countMap.values()].some(value => value > 0);
}

interface MeldSuccessor {
  next: Map<string, number>;
  label: string;
}

// 列出移除一組面子（刻子／順子）後嘅所有延續狀態
export function getMeldSuccessors(countMap: Map<string, number>): MeldSuccessor[] {
  const successors: MeldSuccessor[] = [];

  for (const [tile, count] of countMap.entries()) {
    if ((count || 0) <= 0) continue;

    const [suit, valStr] = tile.split('_');
    const value = Number(valStr);

    if (count >= 3) {
      const tripletNext = removeTiles(countMap, [tile, tile, tile]);
      if (tripletNext) {
        successors.push({ next: tripletNext, label: meldLabel([tile, tile, tile]) });
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
            successors.push({ next: sequenceNext, label: meldLabel(sequenceTiles) });
          }
        }
      }
    }
  }

  return successors;
}

export function canFormMelds(countMap: Map<string, number>, visited = new Set<string>()): boolean {
  const stateKey = makeStateKey(countMap);
  if (visited.has(stateKey)) return false;
  visited.add(stateKey);

  if (!hasRemainingTiles(countMap)) return true;

  for (const { next } of getMeldSuccessors(countMap)) {
    if (canFormMelds(next, new Set(visited))) return true;
  }

  return false;
}

export function collectMeldCombinations(countMap: Map<string, number>, visited = new Set<string>(), current: string[] = []): string[][] {
  const stateKey = makeStateKey(countMap);
  if (visited.has(stateKey)) return [];
  visited.add(stateKey);

  if (!hasRemainingTiles(countMap)) {
    return [current.slice()];
  }

  const results: string[][] = [];

  for (const { next, label } of getMeldSuccessors(countMap)) {
    results.push(...collectMeldCombinations(next, new Set(visited), [...current, label]));
  }

  return results;
}

export function hasHonorTiles(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
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

export function scoreHonorTriplet(
  value: number,
  seatWindNum: number | undefined,
  prevailingWindNum: number | undefined
): { fan: number; breakdown: { rule: string; fan: number }[] } {
  const name = HONOR_CHARS[value];
  if (value < 1 || value > 7) return { fan: 0, breakdown: [] };

  const breakdown: { rule: string; fan: number }[] = [];
  let fan = 0;

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

export function scoreFlower(
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

export function hasNonFlowerMelds(meldMap?: Record<string, MeldEntry>): boolean {
  if (!meldMap) return false;

  for (const key in meldMap) {
    if (meldMap[key].kind !== 'flower') {
      return true;
    }
  }

  return false;
}

// True if there's any exposed meld that isn't a kong (pung or shang)
// Kong — even exposed — does not break 門清
export function hasExposedNonKongMeld(meldMap?: Record<string, MeldEntry>): boolean {
  if (!meldMap) return false;
  for (const key in meldMap) {
    const kind = meldMap[key].kind;
    if (kind !== 'flower' && kind !== 'kong') return true;
  }
  return false;
}

export function isFullFlush(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
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

// 缺一門：無花牌，且萬筒索三門中至少缺其一門
export function isVoidInOneSuit(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
  const hasFlower = meldMap
    ? Object.values(meldMap).some(m => m.kind === 'flower')
    : false;
  if (hasFlower) return false;

  const relevantTiles: Tile[] = [...handTiles];
  if (meldMap) {
    Object.values(meldMap).forEach(meld => {
      if (meld.kind !== 'flower') relevantTiles.push(...meld.tiles);
    });
  }

  if (relevantTiles.length === 0) return false;

  const hasChar = relevantTiles.some(t => t.suit === 'character');
  const hasDot  = relevantTiles.some(t => t.suit === 'dot');
  const hasBamboo = relevantTiles.some(t => t.suit === 'bamboo');

  return !hasChar || !hasDot || !hasBamboo;
}

// 平糊：5 個順子（shang）+ 1 對，無刻子/槓子
export function isAllChows(handTiles: Tile[], meldMap?: Record<string, MeldEntry>): boolean {
  const nonFlowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind !== 'flower') : [];
  const existingMeldCount = nonFlowerMelds.length;
  const neededMelds = 5 - existingMeldCount;

  if (neededMelds < 0) return false;

  const relevantTiles = [...handTiles];
  const relevantMelds = nonFlowerMelds.filter(m => m.kind !== 'flower');
  for (const m of relevantMelds) {
    relevantTiles.push(...m.tiles);
  }

  const expectedRemaining = neededMelds * 3 + 2;
  if (handTiles.length !== expectedRemaining) return false;

  const remainingCounts = new Map<string, number>();
  for (const t of handTiles) {
    const key = `${t.suit}_${t.value}`;
    remainingCounts.set(key, (remainingCounts.get(key) || 0) + 1);
  }

  for (const [k, c] of remainingCounts.entries()) {
    if (c >= 2) {
      const copy = cloneCounts(remainingCounts);
      copy.set(k, c - 2);
      const combos = collectMeldCombinations(copy);
      for (const combo of combos) {
        if (combo.length === neededMelds && combo.every(m => !m.includes('x3'))) {
          return true;
        }
      }
    }
  }
  return false;
}


