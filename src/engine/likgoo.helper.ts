import { Tile, Suit, SUIT } from '../types/mahjong';
import {
  MeldEntry,
  FanResult,
  countTileOccurrences,
  tileLabel,
  hasNonFlowerMelds,
} from './validator.helpers';

// ----------------------------------------------------------------------
// 嚦咕嚦咕 (Lik Goo Lik Goo) 檢測 Helper
// ----------------------------------------------------------------------

interface LikGooAnalysis {
  isLikGoo: boolean;
  combinationLabel?: string;
  tripletTileKey?: string;
}

export function checkLikGoo(
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>
): LikGooAnalysis {
  if (hasNonFlowerMelds(meldMap)) {
    return { isLikGoo: false };
  }

  if (handTiles.length !== 17) {
    return { isLikGoo: false };
  }

  const handCounts = countTileOccurrences(handTiles);

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

/**
 * 找出指定數字陣列中，所有「獨立不相連」的連續長度片段
 * 例如：[1, 2, 3, 6, 7, 8] -> 會拆出兩組長度為 [3, 3] 的片段
 */
function getConsecutiveSegments(nums: number[]): number[] {
  if (nums.length === 0) return [];
  
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const segments: number[] = [];
  let currentLen = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentLen++;
    } else {
      segments.push(currentLen);
      currentLen = 1;
    }
  }
  segments.push(currentLen);
  return segments;
}

/**
 * 將單一連續長度轉化為最高階的連對番數 (同一組片段內高階覆蓋低階)
 */
function getConsecutiveFanResult(length: number,flags?: { countFullFlush?: boolean }): FanResult | null {
  if (length >= 8 && flags){
    flags.countFullFlush = false;
    return { rule: '八連對', fan: 420 };
  }
  if (length === 7) return { rule: '七連對', fan: 120 };
  if (length === 6) return { rule: '六連對', fan: 60 };
  if (length === 5) return { rule: '五連對', fan: 30 };
  if (length === 4) return { rule: '四連對', fan: 15 };
  if (length === 3) return { rule: '三連對', fan: 5 };
  return null;
}

/**
 * 嚦咕嚦咕特殊牌型完整番數計算器
 */
export function evaluateLikGooSpecialPatterns(handTiles: Tile[],flags?: { countFullFlush?: boolean }): FanResult[] {
  const results: FanResult[] = [];
  
  // 1. 統計所有牌的張數，並提取所有「有對子或以上 (count >= 2)」的 key
  const counts = new Map<string, number>();
  for (const t of handTiles) {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  const pairKeys = new Set<string>();
  for (const [key, count] of counts.entries()) {
    if (count >= 2) pairKeys.add(key);
  }

  // ----------------------------------------------------------------------
  // 1. 三元嚦咕 (中、發、白 各有一對)
  // ----------------------------------------------------------------------
  const hasDragon5 = pairKeys.has(`${SUIT.DRAGON}_5`); // 中
  const hasDragon6 = pairKeys.has(`${SUIT.DRAGON}_6`); // 發
  const hasDragon7 = pairKeys.has(`${SUIT.DRAGON}_7`); // 白

  if (hasDragon5 && hasDragon6 && hasDragon7) {
    results.push({ rule: '三元嚦咕', fan: 20 });
  }

  // ----------------------------------------------------------------------
  // 2. 四喜嚦咕 (東、南、西、北 各有一對)
  // ----------------------------------------------------------------------
  const hasWind1 = pairKeys.has(`${SUIT.WIND}_1`); // 東
  const hasWind2 = pairKeys.has(`${SUIT.WIND}_2`); // 南
  const hasWind3 = pairKeys.has(`${SUIT.WIND}_3`); // 西
  const hasWind4 = pairKeys.has(`${SUIT.WIND}_4`); // 北

  if (hasWind1 && hasWind2 && hasWind3 && hasWind4) {
    results.push({ rule: '四喜嚦咕', fan: 40 });
  }

  // ----------------------------------------------------------------------
  // 3. 三色同對 (萬、筒、索 擁有相同數字的對子)
  // ----------------------------------------------------------------------
  let hasThreeColorSamePair = false;
  for (let num = 1; num <= 9; num++) {
    const hasChar = pairKeys.has(`${SUIT.CHARACTER}_${num}`);
    const hasDot = pairKeys.has(`${SUIT.DOT}_${num}`);
    const hasBamboo = pairKeys.has(`${SUIT.BAMBOO}_${num}`);

    if (hasChar && hasDot && hasBamboo) {
      hasThreeColorSamePair = true;
      break;
    }
  }

  if (hasThreeColorSamePair) {
    results.push({ rule: '三色同對', fan: 10 });
  }

  // ----------------------------------------------------------------------
  // 4. 連對系列 (三連對 ~ 八連對，支援多組獨立/跨花色疊加)
  // ----------------------------------------------------------------------
  const suitPairs: Partial<Record<Suit, number[]>> = {
    [SUIT.CHARACTER]: [],
    [SUIT.DOT]: [],
    [SUIT.BAMBOO]: []
  };

  for (const key of pairKeys) {
    const [suit, valStr] = key.split('_');
    if (suit === SUIT.CHARACTER || suit === SUIT.DOT || suit === SUIT.BAMBOO) {
      (suitPairs[suit as Suit] ??= []).push(Number(valStr));
    }
  }

  // 拆出萬、筒、索三個花色中「所有獨立」的連對片段
  const allSegments: number[] = [
    ...getConsecutiveSegments(suitPairs[SUIT.CHARACTER]!),
    ...getConsecutiveSegments(suitPairs[SUIT.DOT]!),
    ...getConsecutiveSegments(suitPairs[SUIT.BAMBOO]!)
  ];

  // 逐一計算每個獨立片段（例如：5連對 + 3連對 會各自獨立加總）
  for (const segLen of allSegments) {
    const fanRes = getConsecutiveFanResult(segLen,flags);
    if (fanRes) {
      results.push(fanRes);
    }
  }

  return results;
}