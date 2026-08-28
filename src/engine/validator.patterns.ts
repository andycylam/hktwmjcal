import { Tile } from '../types/mahjong';
import {
  MeldEntry,
  FanResult,
  charToHonorNumber,
  cloneCounts,
  canFormMelds,
  WIND_CHARS,
  DRAGON_CHARS,
} from './validator.helpers';

type DukDukType = 'danDiu' | 'kaLung' | 'pinZoeng' | null;

export function detectWaitPattern(
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
// 將眼 Helper
// ----------------------------------------------------------------------

export function getJeungNgaanFromCombination(
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

export function analyzeWindPattern(
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

export function analyzeDragonPattern(
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
    const windChar = WIND_CHARS[tile.value];
    return !!windChar && part.includes(windChar);
  }

  // 中、發、白
  if (tile.suit === 'dragon') {
    const dragonChar = DRAGON_CHARS[tile.value];
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
export function isDoiPungWait(
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

