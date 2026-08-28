import { Tile, CalculationResult, GameContext } from '../types/mahjong';
import {
  MeldEntry,
  FanCalculator,
  countTileOccurrences,
  charToHonorNumber,
  tileLabel,
  canonicalizeCombination,
  getPrimaryNumberFromString,
  getDeclaredKongCount,
  hasConcealedKong,
  hasHonorTiles,
  scoreHonorTriplet,
  scoreFlower,
  hasExposedNonKongMeld,
  isFullFlush,
  isVoidInOneSuit,
  WIND_VALUE_MAP,
  cloneCounts,
  canFormMelds,
  collectMeldCombinations,
} from './validator.helpers';
import {
  detectWaitPattern,
  getJeungNgaanFromCombination,
  analyzeWindPattern,
  analyzeDragonPattern,
  isDoiPungWait,
} from './validator.patterns';
import {
  checkLikGoo, 
  evaluateLikGooSpecialPatterns 
} from './likgoo.helper';

function calculateSingleHandForm(
  formType: 'basic' | 'likGoo',
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>,
  huIsZimo?: boolean,
  comboStr?: string,
  huTile?: Tile,
  remainingCounts?: Map<string, number>,
  gameContext?: GameContext
): FanCalculator {
  const calc = new FanCalculator();
  const seatWindNum = gameContext?.seatWind ? WIND_VALUE_MAP[gameContext.seatWind] : undefined;
  const prevailingWindNum = gameContext?.prevailingWind ? WIND_VALUE_MAP[gameContext.prevailingWind] : undefined;

  const flowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind === 'flower') : [];
  const allFlowerTiles = flowerMelds.flatMap(meld => meld.tiles);
  const allFlowerValues = new Set(allFlowerTiles.map(tile => tile.value));

  const hasHonor = hasHonorTiles(handTiles, meldMap);
  const hasFlower = allFlowerTiles.length > 0;
  const hasExposedNonKong = hasExposedNonKongMeld(meldMap);

  let countNoHonor = true;  //不計無字
  let countNoFlower = true; //不計無花
  let countNoHonorFlower = true; //不計無字花
  let countZimo = true; //不計自摸
  //let countHonorTriplets = true; //不計字牌正字
  let countWind = true; //不計風牌正字
  let countDragon = true; //不計三元
  const flags = {
    countFullFlush: true //不計清一色
  };
  let countVoidInOneSuit = true; //不計缺一門

  const huKey = huTile? `${huTile.suit}_${huTile.value}` : undefined;
  // 123. 形態專屬主牌型 (嚦咕嚦咕)
  if (formType === 'likGoo') {
    calc.add('嚦咕嚦咕', 40);
    // 124. 八對嚦咕
    if (huKey){
      const counts = countTileOccurrences(handTiles);
      const countBeforeHu = (counts.get(huKey) || 0) - 1;
      if (countBeforeHu === 2) {
        calc.add('八對嚦咕', 10);
      }
    }
    // 評估嚦咕嚦咕的特殊牌型組合（三元、四喜、三色同對、連對系列）
    const specialLikGooFans = evaluateLikGooSpecialPatterns(handTiles, flags);
    for (const item of specialLikGooFans) {
      calc.add(item.rule, item.fan);
    }
  }

  // 151. & 152. 特殊求人牌型 (僅限基本形)
  if (formType === 'basic' && handTiles.length === 2 && !hasConcealedKong(meldMap)) {
    if (!huIsZimo) calc.add('全求人', 40);
    else { calc.add('半求人', 20); countZimo = false; }
  }

  // ------------------------------------------------------------------
  // 風牌及三元牌大型牌型
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
  if (flags.countFullFlush && isFullFlush(handTiles, meldMap)) {
    calc.add('清一色', 120);
    countNoHonor = false;
    countNoHonorFlower = false;
    countVoidInOneSuit = false;
  }

  // 3. 自摸 (共通)
  if (huIsZimo && countZimo) calc.add('自摸', 1);

  // 20. 無字花
  if (!hasHonor && !hasFlower && countNoHonorFlower) {
    countNoHonor = false;
    countNoFlower = false;
    calc.add('無字花', 5);
  }

  // 108. 缺一門
  if (countVoidInOneSuit && isVoidInOneSuit(handTiles, meldMap)) {
    countNoHonor = false;
    calc.add('缺一門', 10);
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
    const counts = countTileOccurrences(handTiles);
    const countBeforeHu = (counts.get(huKey) || 0) - 1;
    if (countBeforeHu === 1) {
      calc.add('獨獨 (單吊)', 2);
    }
  }

  // 17. 無花 & 18. 花牌 & 21. 一台花 & 154. 八仙過海 (共通)
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

  // 2. 門清 (僅基本形成立) — 槓子不影響門清
  if (formType === 'basic' && !hasExposedNonKong && !hasFlower) {
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
  gameContext?: GameContext
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
