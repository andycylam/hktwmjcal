import { Tile } from '../types/mahjong';

interface FanResult {
  rule: string;
  fan: number;
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
function getConsecutiveFanResult(length: number): FanResult | null {
  if (length >= 8) return { rule: '八連對', fan: 420 };
  if (length === 7) return { rule: '七連對', fan: 120 };
  if (length === 6) return { rule: '六連對', fan: 60 };
  if (length === 5) return { rule: '五連對', fan: 30 };
  if (length === 4) return { rule: '四連對', fan: 15 };
  if (length === 3) return { rule: '三連對', fan: 10 };
  return null;
}

/**
 * 嚦咕嚦咕特殊牌型完整番數計算器
 */
export function evaluateLikGooSpecialPatterns(handTiles: Tile[]): FanResult[] {
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
  const hasDragon5 = pairKeys.has('dragon_5'); // 中
  const hasDragon6 = pairKeys.has('dragon_6'); // 發
  const hasDragon7 = pairKeys.has('dragon_7'); // 白

  if (hasDragon5 && hasDragon6 && hasDragon7) {
    results.push({ rule: '三元嚦咕', fan: 20 });
  }

  // ----------------------------------------------------------------------
  // 2. 四喜嚦咕 (東、南、西、北 各有一對)
  // ----------------------------------------------------------------------
  const hasWind1 = pairKeys.has('wind_1'); // 東
  const hasWind2 = pairKeys.has('wind_2'); // 南
  const hasWind3 = pairKeys.has('wind_3'); // 西
  const hasWind4 = pairKeys.has('wind_4'); // 北

  if (hasWind1 && hasWind2 && hasWind3 && hasWind4) {
    results.push({ rule: '四喜嚦咕', fan: 40 });
  }

  // ----------------------------------------------------------------------
  // 3. 三色同對 (萬、筒、索 擁有相同數字的對子)
  // ----------------------------------------------------------------------
  let hasThreeColorSamePair = false;
  for (let num = 1; num <= 9; num++) {
    const hasChar = pairKeys.has(`character_${num}`);
    const hasDot = pairKeys.has(`dot_${num}`);
    const hasBamboo = pairKeys.has(`bamboo_${num}`);

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
  const suitPairs: Record<'character' | 'dot' | 'bamboo', number[]> = {
    character: [],
    dot: [],
    bamboo: []
  };

  for (const key of pairKeys) {
    const [suit, valStr] = key.split('_');
    if (suit === 'character' || suit === 'dot' || suit === 'bamboo') {
      suitPairs[suit as 'character' | 'dot' | 'bamboo'].push(Number(valStr));
    }
  }

  // 拆出萬、筒、索三個花色中「所有獨立」的連對片段
  const allSegments: number[] = [
    ...getConsecutiveSegments(suitPairs.character),
    ...getConsecutiveSegments(suitPairs.dot),
    ...getConsecutiveSegments(suitPairs.bamboo)
  ];

  // 逐一計算每個獨立片段（例如：5連對 + 3連對 會各自獨立加總）
  for (const segLen of allSegments) {
    const fanRes = getConsecutiveFanResult(segLen);
    if (fanRes) {
      results.push(fanRes);
    }
  }

  return results;
}