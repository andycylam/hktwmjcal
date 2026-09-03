import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile, MELD, MeldKind, SUIT } from '../../src/types/mahjong';
import { makeTile, expectRuleScored } from '../testHelpers';
import { isAllChows } from '../../src/engine/validator.helpers';

describe('validator kong-adjusted total', () => {
  it('accepts counted tiles equal to 17 + number_of_kongs', () => {
    // Create a kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 1, 1),
      makeTile(SUIT.CHARACTER, 1, 2),
      makeTile(SUIT.CHARACTER, 1, 3),
      makeTile(SUIT.CHARACTER, 1, 4),
    ];

    // Create 11 other tiles in hand that form 3 melds and a pair (needed when one meld exists)
    const handTiles: Tile[] = [];
    // meld 1: 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // meld 2: 索 1-2-3
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 2, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 1));
    // meld 3: 萬 2-3-4
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    // meld 4: 筒 4-5-6 (add one more meld to satisfy 5 melds total when a kong exists)
    handTiles.push(makeTile(SUIT.DOT, 4, 2));
    handTiles.push(makeTile(SUIT.DOT, 5, 2));
    handTiles.push(makeTile(SUIT.DOT, 6, 2));
    // pair: 風 東 x2
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));

    const meldMap: Record<string, any> = {
      'character_1@kong': { kind: MELD.KONG, tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBeGreaterThan(0);
  });

  it('does not count a four-of-a-kind left in hand as a kong unless declared in meldMap', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 9, i + 1));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 8, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 7, i + 20));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 6, i + 30));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 99));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.reason).toBeUndefined();
    const hasKong = res.breakdown.some(item => item.rule?.includes('槓'));
    expect(hasKong).toBe(false);
    expect(res.totalFan).toBeGreaterThanOrEqual(0);
  });

  it('accepts a valid hand that uses the remaining tiles as a descending sequence', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 9, i + 1));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 8, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 7, i + 20));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile(SUIT.CHARACTER, 6, i + 30));
    for (let i = 0; i < 2; i++) handTiles.push(makeTile(SUIT.CHARACTER, 5, i + 40));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.totalFan).toBeGreaterThanOrEqual(0);
  });

  it('accepts a valid hand built from 999, 888, 666, 567, 789, and a 77 pair', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 3; i++) handTiles.push(makeTile(SUIT.CHARACTER, 9, i + 1));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile(SUIT.CHARACTER, 8, i + 10));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile(SUIT.CHARACTER, 6, i + 20));
    for (let i = 0; i < 2; i++) handTiles.push(makeTile(SUIT.CHARACTER, 7, i + 30));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 99));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 101));
    handTiles.push(makeTile(SUIT.CHARACTER, 7, 102));
    handTiles.push(makeTile(SUIT.CHARACTER, 7, 103));
    handTiles.push(makeTile(SUIT.CHARACTER, 8, 104));
    handTiles.push(makeTile(SUIT.CHARACTER, 9, 105));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.totalFan).toBeGreaterThanOrEqual(0);
  });

  it('deduplicates equivalent valid decompositions that differ only by sequence ordering', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 2));
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 3));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 4));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 5));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 6));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 7));
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 8));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 9));
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 10));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 11));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 12));
    handTiles.push(makeTile(SUIT.CHARACTER, 7, 13));
    handTiles.push(makeTile(SUIT.CHARACTER, 8, 14));
    handTiles.push(makeTile(SUIT.CHARACTER, 9, 15));
    handTiles.push(makeTile(SUIT.CHARACTER, 7, 16));
    handTiles.push(makeTile(SUIT.CHARACTER, 7, 17));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBe(1);
    expect(res.possibleCombinations?.[0]).toBe('一萬x3, 三萬x3, 三萬-四萬-五萬, 四萬-五萬-六萬, 七萬-八萬-九萬, 七萬x2');
  });

  it('shows multiple valid decompositions when the same hand can pair on different tiles', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 2; i++) handTiles.push(makeTile(SUIT.CHARACTER, 5, i + 1));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile(SUIT.CHARACTER, 6, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 7, i + 20));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 8, i + 30));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile(SUIT.CHARACTER, 9, i + 40));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBeGreaterThan(1);
    expect(res.possibleCombinations).toEqual(expect.arrayContaining([
      expect.stringContaining('五萬x2'),
      expect.stringContaining('八萬x2')
    ]));
  });

  it('rejects when counted tiles exceed 17 + number_of_kongs', () => {
    // Create a kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 2, 1),
      makeTile(SUIT.CHARACTER, 2, 2),
      makeTile(SUIT.CHARACTER, 2, 3),
      makeTile(SUIT.CHARACTER, 2, 4),
    ];

    // Create 15 other tiles in hand so that counted total = 15 + 4 = 19 (one too many)
    const handTiles: Tile[] = [];
    for (let i = 1; i <= 15; i++) {
      handTiles.push(makeTile(SUIT.DOT, (i % 9) + 1, i + 10));
    }

    const meldMap: Record<string, any> = {
      'character_2@kong': { kind: MELD.KONG, tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(false);
    expect(res.totalFan).toBe(0);
    expect(res.reason).toBeTruthy();
  });

  it('awards concealed kong fan and includes breakdown entry', () => {
    // Create a concealed kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile(SUIT.BAMBOO, 1, 1),
      makeTile(SUIT.BAMBOO, 1, 2),
      makeTile(SUIT.BAMBOO, 1, 3),
      makeTile(SUIT.BAMBOO, 1, 4),
    ];

    // Create 11 other tiles in hand so that they form 3 melds + pair
    const handTiles: Tile[] = [];
    // meld 1: 萬 2-3-4
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    // meld 2: 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // meld 3: 索 2-3-4
    handTiles.push(makeTile(SUIT.BAMBOO, 2, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 4, 1));
    // meld 4: 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // pair: 東 x2
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));

    const meldMap: Record<string, any> = {
      'bamboo_1@kong': { kind: MELD.KONG, tiles: kongTiles, concealed: true }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    // kong adds +2
    //expect(res.totalFan).toBeGreaterThanOrEqual(2);
    expectRuleScored(res, '暗槓', 2);
  });
  it('awards +1 fan for dragon triplet (中) in declared melds', () => {
    const pungTiles: Tile[] = [
      makeTile(SUIT.DRAGON, 5, 1), // 中 x3
      makeTile(SUIT.DRAGON, 5, 2),
      makeTile(SUIT.DRAGON, 5, 3),
    ];

    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 2));
    handTiles.push(makeTile(SUIT.DOT, 5, 2));
    handTiles.push(makeTile(SUIT.DOT, 6, 2));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 2, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 2));

    const meldMap: Record<string, any> = {
      'dragon_5@pung': { kind: MELD.PUNG, tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '字牌 (中)', 1);
  });

  it('awards +1 fan for each dragon triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '字牌 (中)', 1);
    expectRuleScored(res, '字牌 (發)', 1);
  });

  it('識別全求人 (5組副露 + 1張單吊眼牌)', () => {
    // 1. 準備 5 組副露 (露牌：碰/槓/吃)
    const meldMap: Record<string, any> = {
      'wind_2@pung': {
        kind: MELD.PUNG,
        tiles: [makeTile(SUIT.WIND, 2, 1), makeTile(SUIT.WIND, 2, 2), makeTile(SUIT.WIND, 2, 3)] // 南風碰
      },
      'bamboo_1@chow': {
        kind: MELD.CHOW,
        tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 2), makeTile(SUIT.BAMBOO, 3, 3)] // 123索吃
      },
      'dot_4@pung': {
        kind: MELD.PUNG,
        tiles: [makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 4, 2), makeTile(SUIT.DOT, 4, 3)] // 4筒碰
      },
      'character_7@chow': {
        kind: MELD.CHOW,
        tiles: [makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 8, 2), makeTile(SUIT.CHARACTER, 9, 3)] // 789萬吃
      },
      'dragon_1@kong': {
        kind: MELD.KONG,
        tiles: [makeTile(SUIT.DRAGON, 1, 1), makeTile(SUIT.DRAGON, 1, 2), makeTile(SUIT.DRAGON, 1, 3), makeTile(SUIT.DRAGON, 1, 4)] // 中發白 (紅中槓)
      }
    };
    // 指定食糊牌 (huTile) - 單吊 2萬
    const huTile = makeTile(SUIT.CHARACTER, 2, 99);

    // 手牌 (handTiles)
    const handTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 2, 1),
      huTile // 併入食糊牌湊成對子眼
    ];

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = false;
    const res = calculateHandFan(handTiles, meldMap, isSelfDrawn, huTile, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「全求人」規則
    expectRuleScored(res, '全求人', 40);
  });
  it('識別半求人 (5組副露 + 1張單吊眼牌)', () => {
    // 1. 準備 5 組副露 (露牌：碰/槓/吃)
    const meldMap: Record<string, any> = {
      'wind_2@pung': {
        kind: MELD.PUNG,
        tiles: [makeTile(SUIT.WIND, 2, 1), makeTile(SUIT.WIND, 2, 2), makeTile(SUIT.WIND, 2, 3)] // 南風碰
      },
      'bamboo_1@chow': {
        kind: MELD.CHOW,
        tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 2), makeTile(SUIT.BAMBOO, 3, 3)] // 123索吃
      },
      'dot_4@pung': {
        kind: MELD.PUNG,
        tiles: [makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 4, 2), makeTile(SUIT.DOT, 4, 3)] // 4筒碰
      },
      'character_7@chow': {
        kind: MELD.CHOW,
        tiles: [makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 8, 2), makeTile(SUIT.CHARACTER, 9, 3)] // 789萬吃
      },
      'dragon_1@kong': {
        kind: MELD.KONG,
        tiles: [makeTile(SUIT.DRAGON, 1, 1), makeTile(SUIT.DRAGON, 1, 2), makeTile(SUIT.DRAGON, 1, 3), makeTile(SUIT.DRAGON, 1, 4)] // 中發白 (紅中槓)
      }
    };
    // 指定食糊牌 (huTile) - 單吊 2萬
    const huTile = makeTile(SUIT.CHARACTER, 2, 99);

    // 手牌 (handTiles)
    const handTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 2, 1),
      huTile // 併入食糊牌湊成對子眼
    ];

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, meldMap, isSelfDrawn, huTile, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「半求人」規則
    expectRuleScored(res, '半求人', 20);
  });
  it('識別門清', () => {
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「門清」規則
    expectRuleScored(res, '門清', 5);
  });
  it('八仙過海', () => {
    const meldMap: Record<string, { kind: MeldKind; tiles: Tile[]; concealed?: boolean }> = {};
    meldMap['flower_1@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 1, 1)] };
    meldMap['flower_2@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 2, 2)] };
    meldMap['flower_3@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 3, 3)] };
    meldMap['flower_4@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 4, 4)] };
    meldMap['flower_5@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 5, 5)] };
    meldMap['flower_6@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 6, 6)] };
    meldMap['flower_7@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 7, 7)] };
    meldMap['flower_8@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 8, 8)] };
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, meldMap, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「八仙過海」規則
    expectRuleScored(res, '八仙過海', 40);
  });
  it('一台花', () => {
    const meldMap: Record<string, { kind: MeldKind; tiles: Tile[]; concealed?: boolean }> = {};
    meldMap['flower_1@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 1, 1)] };
    meldMap['flower_2@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 2, 2)] };
    meldMap['flower_3@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 3, 3)] };
    meldMap['flower_4@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 4, 4)] };
    meldMap['flower_5@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 5, 5)] };
    meldMap['flower_6@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 6, 6)] };
    meldMap['flower_7@flower'] = { kind: MELD.FLOWER, tiles: [makeTile(MELD.FLOWER, 7, 7)] };
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, meldMap, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「一台花」規則
    expectRuleScored(res, '一台花', 10);
  });
  it('無花', () => {
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「無花」規則
    expectRuleScored(res, '無花', 1);
  });
  it('將眼', () => {
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 2));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 2, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 2, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「將眼」規則
    expectRuleScored(res, '將眼', 2);
  });
  it('清一色', () => {
    const handTiles: Tile[] = [];
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    // 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // pair: 筒 1x2
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「清一色」規則
    expectRuleScored(res, '清一色', 120);
  });

  describe('isAllChows (平糊)', () => {
    it('returns true for 5 chows + pair with no declared melds (17 tiles)', () => {
      const handTiles: Tile[] = [];
      // chow 1: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
      // chow 2: 萬 4-5-6
      handTiles.push(makeTile(SUIT.CHARACTER, 4, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 5, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 6, 2));
      // chow 3: 筒 1-2-3
      handTiles.push(makeTile(SUIT.DOT, 1, 1));
      handTiles.push(makeTile(SUIT.DOT, 2, 1));
      handTiles.push(makeTile(SUIT.DOT, 3, 1));
      // chow 4: 筒 4-5-6
      handTiles.push(makeTile(SUIT.DOT, 4, 2));
      handTiles.push(makeTile(SUIT.DOT, 5, 2));
      handTiles.push(makeTile(SUIT.DOT, 6, 2));
      // chow 5: 索 7-8-9
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 8, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 9, 1));
      // pair: 東 x2
      handTiles.push(makeTile(SUIT.WIND, 1, 1));
      handTiles.push(makeTile(SUIT.WIND, 1, 2));

      expect(isAllChows(handTiles, undefined)).toBe(true);
      const isSelfDrawn = true;
      const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });
      expectRuleScored(res, '平糊', 5);
    });

    it('returns true when 1 chow is declared and hand is 4 chows + pair (14 tiles)', () => {
      const handTiles: Tile[] = [];
      // chow 1: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
      // chow 2: 筒 1-2-3
      handTiles.push(makeTile(SUIT.DOT, 1, 1));
      handTiles.push(makeTile(SUIT.DOT, 2, 1));
      handTiles.push(makeTile(SUIT.DOT, 3, 1));
      // chow 3: 索 4-5-6
      handTiles.push(makeTile(SUIT.BAMBOO, 4, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 5, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 6, 1));
      // chow 4: 萬 7-8-9
      handTiles.push(makeTile(SUIT.CHARACTER, 7, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 8, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 9, 2));
      // pair: 中 x2
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 2));

      const meldMap: Record<string, any> = {
        'dot_4@chow': { kind: MELD.CHOW, tiles: [makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1)] }
      };

      expect(isAllChows(handTiles, meldMap)).toBe(true);
    });

    it('returns true when all 5 chows are declared and hand holds only the pair (2 tiles)', () => {
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 3, 1),
        makeTile(SUIT.DOT, 3, 2),
      ];

      const meldMap: Record<string, any> = {
        'm1': { kind: MELD.CHOW, tiles: [makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1)] },
        'm2': { kind: MELD.CHOW, tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1)] },
        'm3': { kind: MELD.CHOW, tiles: [makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1)] },
        'm4': { kind: MELD.CHOW, tiles: [makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 6, 2), makeTile(SUIT.CHARACTER, 7, 2)] },
        'm5': { kind: MELD.CHOW, tiles: [makeTile(SUIT.BAMBOO, 7, 2), makeTile(SUIT.BAMBOO, 8, 2), makeTile(SUIT.BAMBOO, 9, 2)] },
      };

      expect(isAllChows(handTiles, meldMap)).toBe(true);
    });

    it('returns false when the hand contains a triplet (not all chows)', () => {
      const handTiles: Tile[] = [];
      // triplet: 萬 1-1-1
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 3));
      // chow 2: 萬 4-5-6
      handTiles.push(makeTile(SUIT.CHARACTER, 4, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 5, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 6, 2));
      // chow 3: 筒 1-2-3
      handTiles.push(makeTile(SUIT.DOT, 1, 1));
      handTiles.push(makeTile(SUIT.DOT, 2, 1));
      handTiles.push(makeTile(SUIT.DOT, 3, 1));
      // chow 4: 筒 4-5-6
      handTiles.push(makeTile(SUIT.DOT, 4, 2));
      handTiles.push(makeTile(SUIT.DOT, 5, 2));
      handTiles.push(makeTile(SUIT.DOT, 6, 2));
      // chow 5: 索 7-8-9
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 8, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 9, 1));
      // pair: 東 x2
      handTiles.push(makeTile(SUIT.WIND, 1, 1));
      handTiles.push(makeTile(SUIT.WIND, 1, 2));

      expect(isAllChows(handTiles, undefined)).toBe(false);
    });

    it('returns false when declared meld is a triplet', () => {
      const handTiles: Tile[] = [];
      // chow 1: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
      // chow 2: 筒 4-5-6
      handTiles.push(makeTile(SUIT.DOT, 4, 1));
      handTiles.push(makeTile(SUIT.DOT, 5, 1));
      handTiles.push(makeTile(SUIT.DOT, 6, 1));
      // chow 3: 索 7-8-9
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 8, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 9, 1));
      // chow 4: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));
      // pair: 中 x2
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 2));

      const meldMap: Record<string, any> = {
        'character_5@pung': { kind: MELD.PUNG, tiles: [makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 1)] }
      };

      expect(isAllChows(handTiles, meldMap)).toBe(false);
    });

    it('returns false when declared meld is a kong', () => {
      const handTiles: Tile[] = [];
      // chow 1: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
      // chow 2: 筒 4-5-6
      handTiles.push(makeTile(SUIT.DOT, 4, 1));
      handTiles.push(makeTile(SUIT.DOT, 5, 1));
      handTiles.push(makeTile(SUIT.DOT, 6, 1));
      // chow 3: 索 7-8-9
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 8, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 9, 1));
      // chow 4: 萬 1-2-3
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 2));
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));
      // pair: 東 x2
      handTiles.push(makeTile(SUIT.WIND, 1, 1));
      handTiles.push(makeTile(SUIT.WIND, 1, 2));

      const meldMap: Record<string, any> = {
        'bamboo_1@kong': { kind: MELD.KONG, tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 1, 2), makeTile(SUIT.BAMBOO, 1, 3), makeTile(SUIT.BAMBOO, 1, 4)] }
      };

      expect(isAllChows(handTiles, meldMap)).toBe(false);
    });
  });

  // ----------------------------------------------------------------------
  // 將眼 (Jeung Ngaan) Tests
  // ----------------------------------------------------------------------
  describe('將眼', () => {
    it('scores 2 fan when pair is value 5 suited (五萬)', () => {
      const handTiles: Tile[] = [];
      // 4 chows
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      // triplet
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 五萬 x2
      handTiles.push(makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2));

      const isSelfDrawn = true;
      const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('scores 2 fan when pair is value 2 suited (二萬)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 二萬 x2
      handTiles.push(makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('scores 2 fan when pair is value 8 suited (八索)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 8, 1), makeTile(SUIT.CHARACTER, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 八索 x2
      handTiles.push(makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 8, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('does NOT score 將眼 when pair value is 1 (not in 2,5,8)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 一萬 x2 (value 1, NOT in [2,5,8])
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 1, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });

    it('does NOT score 將眼 when pair value is 3 (not in 2,5,8)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 三萬 x2
      handTiles.push(makeTile(SUIT.CHARACTER, 3, 1), makeTile(SUIT.CHARACTER, 3, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });

    it('does NOT score 將眼 when pair is a wind tile', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      // pair: 東 x2 (wind, no 萬/筒/索 suit)
      handTiles.push(makeTile(SUIT.WIND, 1, 1), makeTile(SUIT.WIND, 1, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });

    it('does NOT score 將眼 when pair is a dragon tile', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1));
      // pair: 中 x2 (dragon, no 萬/筒/索 suit)
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2));

      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // 對碰 (Dui Pung) Tests
  // ----------------------------------------------------------------------
  describe('對碰', () => {
    it('scores 1 fan when suited pair is completed by hu tile (basic form)', () => {
      // 1 declared chow + handTiles (14 tiles) including huTile
      // Hand: 索4-5-6, 索7-8-9, 筒1-2-3, 萬5x3 (triplet), 萬2x2 (pair)
      // huTile = 萬5 (completes 萬2 pair into 萬5 triplet)
      const meldMap: Record<string, any> = {
        'bamboo_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 2), makeTile(SUIT.BAMBOO, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      const huTile = makeTile(SUIT.CHARACTER, 5, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
    });

    it('scores 1 fan when dot pair is completed by hu tile', () => {
      const meldMap: Record<string, any> = {
        'character_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 2), makeTile(SUIT.CHARACTER, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 5, 2), makeTile(SUIT.BAMBOO, 5, 3),
        makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 2, 2),
      ];
      const huTile = makeTile(SUIT.BAMBOO, 5, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
    });

    it('scores 1 fan when wind pair is completed by hu tile', () => {
      const meldMap: Record<string, any> = {
        'dot_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 2), makeTile(SUIT.DOT, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        makeTile(SUIT.WIND, 1, 1), makeTile(SUIT.WIND, 1, 2), makeTile(SUIT.WIND, 1, 3),
        makeTile(SUIT.WIND, 2, 1), makeTile(SUIT.WIND, 2, 2),
      ];
      const huTile = makeTile(SUIT.WIND, 1, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
    });

    it('scores 1 fan when dragon pair is completed by hu tile', () => {
      const meldMap: Record<string, any> = {
        'dot_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 2), makeTile(SUIT.DOT, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2),
      ];
      const huTile = makeTile(SUIT.DRAGON, 5, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
    });

    it('does NOT score 對碰 when hu tile does not complete a pair into a triplet', () => {
      // Hand has a triplet and a pair, but huTile does not match the triplet
      const meldMap: Record<string, any> = {
        'bamboo_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 2), makeTile(SUIT.BAMBOO, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      // huTile is 筒1, which does NOT match the existing triplet (萬5) or the pair (萬2)
      const huTile = makeTile(SUIT.DOT, 1, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const duiPung = res.breakdown.find(b => b.rule === '對碰');
      expect(duiPung).toBeUndefined();
    });

    it('does NOT score 對碰 when hand has no triplet (only sequences and a pair)', () => {
      const meldMap: Record<string, any> = {
        'bamboo_1@chow': {
          kind: MELD.CHOW,
          tiles: [makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 2), makeTile(SUIT.BAMBOO, 3, 3)],
        },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
        makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
        makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      const huTile = makeTile(SUIT.CHARACTER, 2, 99);

      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south',
        seatWind: 'east',
      });

      expect(res.isValid).toBe(true);
      const duiPung = res.breakdown.find(b => b.rule === '對碰');
      expect(duiPung).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // 將眼 Additional Edge Case Tests
  // ----------------------------------------------------------------------
  describe('將眼 additional edge cases', () => {
    it('scores 2 fan for 將眼 with pair 八萬 (character suit, value 8)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      handTiles.push(makeTile(SUIT.CHARACTER, 8, 1), makeTile(SUIT.CHARACTER, 8, 2));
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('scores 2 fan for 將眼 with pair 二筒 (dot suit, value 2)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      handTiles.push(makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 2, 2));
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('scores 2 fan for 將眼 in non-self-drawn hand with meldMap', () => {
      const meldMap: Record<string, any> = {
        'dot_1@chow': { kind: MELD.CHOW, tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 2), makeTile(SUIT.DOT, 3, 3)] },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1),
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2),
      ];
      const huTile = makeTile(SUIT.CHARACTER, 5, 99);
      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '將眼', 2);
    });

    it('does NOT score 將眼 when pair value is 4 (not in 2,5,8)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      handTiles.push(makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 4, 2));
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });

    it('does NOT score 將眼 when pair value is 9 (not in 2,5,8)', () => {
      const handTiles: Tile[] = [];
      handTiles.push(makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1));
      handTiles.push(makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1));
      handTiles.push(makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1));
      handTiles.push(makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3));
      handTiles.push(makeTile(SUIT.CHARACTER, 9, 1), makeTile(SUIT.CHARACTER, 9, 2));
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      const jeungNgaan = res.breakdown.find(b => b.rule?.startsWith('將眼'));
      expect(jeungNgaan).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------------
  // 對碰 Additional Edge Case Tests
  // ----------------------------------------------------------------------
  describe('對碰 additional edge cases', () => {
    it('scores 1 fan when huTile completes a pair and also scores 將眼', () => {
      // Self-drawn: 17 tiles with triplet 萬5 + pair 萬5 + pair 萬2
      // huTile = 萬5 completes the pair into triplet → 對碰
      // pair value is 5 → 將眼 also scores
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 1), makeTile(SUIT.DOT, 3, 1),
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      const huTile = makeTile(SUIT.CHARACTER, 5, 99);
      const res = calculateHandFan(handTiles, undefined, true, huTile, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
      expectRuleScored(res, '將眼', 2);
    });

    it('does NOT score 對碰 when huTile matches neither pair nor triplet', () => {
      const meldMap: Record<string, any> = {
        'dot_1@chow': { kind: MELD.CHOW, tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 2), makeTile(SUIT.DOT, 3, 3)] },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      const huTile = makeTile(SUIT.BAMBOO, 9, 99);
      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      const duiPung = res.breakdown.find(b => b.rule === '對碰');
      expect(duiPung).toBeUndefined();
    });

    it('scores 1 fan when declared chow exists and huTile completes a pair', () => {
      const meldMap: Record<string, any> = {
        'dot_1@chow': { kind: MELD.CHOW, tiles: [makeTile(SUIT.DOT, 1, 1), makeTile(SUIT.DOT, 2, 2), makeTile(SUIT.DOT, 3, 3)] },
      };
      const handTiles: Tile[] = [
        makeTile(SUIT.DOT, 4, 1), makeTile(SUIT.DOT, 5, 1), makeTile(SUIT.DOT, 6, 1),
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        makeTile(SUIT.BAMBOO, 7, 1), makeTile(SUIT.BAMBOO, 8, 1), makeTile(SUIT.BAMBOO, 9, 1),
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3),
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 2, 2),
      ];
      const huTile = makeTile(SUIT.CHARACTER, 5, 99);
      const res = calculateHandFan(handTiles, meldMap, false, huTile, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '對碰', 1);
    });

    it('scores 80 fan for 大三元 (all 3 dragon triplets concealed)', () => {
      const handTiles: Tile[] = [
        // 中×3 triplet
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×3 triplet
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
        // 萬 1-2-3 chow
        makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
        // 索 4-5-6 chow
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        // pair 萬 7-7
        makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 7, 2),
      ];
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '大三元', 80);
    });
    it('scores 40 fan for 小三元 (2 dragon triplets + 1 dragon pair, self-drawn)', () => {
      const handTiles: Tile[] = [
        // 中×3 triplet
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×2 pair
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2),
        // 索 1-2-3 chow
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        // 萬 4-5-6 chow
        makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
        // 筒 7-8-9 chow
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
      ];
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '小三元', 40);
    });

    it('scores 40 fan for 小三元 with declared concealed kong (non-self-drawn)', () => {
      const meldMap: Record<string, any> = {
        'dragon_5@kong': {
          kind: MELD.KONG,
          concealed: true,
          tiles: [makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3), makeTile(SUIT.DRAGON, 5, 4)],
        },
      };
      const handTiles: Tile[] = [
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×2 pair
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2),
        // 索 1-2-3 chow
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        // 萬 4-5-6 chow
        makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
        // 筒 7-8-9 chow
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
      ];
      // handTiles = 14, meldTiles = 4 (kong), counted = 18, kongCount = 1, totalTilesNeeded = 18 ✓
      // neededMelds = 5 - 1 = 4, expectedRemaining = 14 = handTiles.length ✓
      const res = calculateHandFan(handTiles, meldMap, false, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '小三元', 40);
    });

    it('scores 80 fan for 大三元 with declared melds (exposed kongs)', () => {
      const meldMap: Record<string, any> = {
        'dragon_5@kong': {
          kind: MELD.KONG,
          concealed: false,
          tiles: [makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3), makeTile(SUIT.DRAGON, 5, 4)],
        },
        'dragon_6@kong': {
          kind: MELD.KONG,
          concealed: false,
          tiles: [makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3), makeTile(SUIT.DRAGON, 6, 4)],
        },
      };
      const handTiles: Tile[] = [
        // 白×3 triplet
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
        // pair 索 1-1
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 1, 2),
        // 萬 2-3-4 chow
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1), makeTile(SUIT.CHARACTER, 4, 1),
        // 萬 5-6-7 chow
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1), makeTile(SUIT.CHARACTER, 7, 1),
      ];
      // handTiles = 11, meldTiles = 8 (2 kongs), counted = 19, kongCount = 2, totalTilesNeeded = 19 ✓
      // neededMelds = 5 - 2 = 3, expectedRemaining = 11 = handTiles.length ✓
      const res = calculateHandFan(handTiles, meldMap, false, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '大三元', 80);
    });

    it('does NOT score 小三元 when all 3 dragons form triplets (scores 大三元 instead)', () => {
      const handTiles: Tile[] = [
        // 中×3, 發×3, 白×3 — all three dragon triplets → 大三元, not 小三元
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
        // pair 萬 7-7
        makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 7, 2),
        // 萬 1-2-3 chow
        makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
        // 索 4-5-6 chow
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
      ];
      // 17 tiles, self-drawn. Should score 大三元, NOT 小三元.
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '大三元', 80);
      // Verify 小三元 is NOT scored
      const xiaoSanYuan = res.breakdown.find(b => b.rule === '小三元');
      expect(xiaoSanYuan).toBeUndefined();
    });
  });
});
