import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile, SUIT } from '../../src/types/mahjong';
import { makeTile, expectRuleScored } from '../testHelpers';


describe('validator kong-adjusted total', () => {
  it('嚦咕', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「嚦咕嚦咕」規則
    expectRuleScored(res, '嚦咕嚦咕', 40);
  });
  it('八對嚦咕', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    const huTile = makeTile(SUIT.CHARACTER, 3, 2);
    handTiles.push(huTile);

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, huTile, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「八對嚦咕」規則
    expectRuleScored(res, '八對嚦咕', 10);
  });
  it('三元嚦咕', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 7, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 7, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 6, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「三元嚦咕」規則
    expectRuleScored(res, '三元嚦咕', 20);
  });
  it('四喜嚦咕', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 4, 3));
    handTiles.push(makeTile(SUIT.WIND, 4, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「四喜嚦咕」規則
    expectRuleScored(res, '四喜嚦咕', 40);
  });
  it('三色同對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.BAMBOO, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 4, 3));
    handTiles.push(makeTile(SUIT.WIND, 4, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「三色同對」規則
    expectRuleScored(res, '三色同對', 10);
  });
  it('三連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 3, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「三連對」規則
    expectRuleScored(res, '三連對', 5);
  });
  it('四連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「四連對」規則
    expectRuleScored(res, '四連對', 15);
  });
  it('五連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「五連對」規則
    expectRuleScored(res, '五連對', 30);
  });
  it('六連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「六連對」規則
    expectRuleScored(res, '六連對', 60);
  });
  it('七連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DOT, 8, 1));
    handTiles.push(makeTile(SUIT.DOT, 8, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「七連對」規則
    expectRuleScored(res, '七連對', 120);
  });
  it('八連對', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 2, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 3, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 4, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 5, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 6, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DOT, 7, 3));
    handTiles.push(makeTile(SUIT.DOT, 8, 1));
    handTiles.push(makeTile(SUIT.DOT, 8, 1));
    handTiles.push(makeTile(SUIT.DOT, 9, 1));
    handTiles.push(makeTile(SUIT.DOT, 9, 1));
    handTiles.push(makeTile(SUIT.DOT, 9, 2));

    // 執行算番 (假設 isSelfDrawn = false 代表非自摸，即靠他人出牌食糊)
    const isSelfDrawn = true;
    const res = calculateHandFan(handTiles, undefined, isSelfDrawn, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    // 測試斷言 (Assertions)
    expect(res.isValid).toBe(true);

    // 檢查是否有「八連對」規則
    expectRuleScored(res, '八連對', 420);
  });
});