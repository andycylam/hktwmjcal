import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { Tile, MELD, MeldKind, SUIT } from '../../../src/types/mahjong';
import { makeTile, expectRuleScored } from '../../testHelpers';
import { isAllChows, isMixedFlush } from '../../../src/engine/validator.helpers';


describe('validator kong-adjusted total', () => {
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

  it('混一色', () => {
    const handTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
      makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
      makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 8, 1), makeTile(SUIT.CHARACTER, 9, 1),
      makeTile(SUIT.CHARACTER, 1, 2), makeTile(SUIT.CHARACTER, 2, 2), makeTile(SUIT.CHARACTER, 3, 2),
      makeTile(SUIT.CHARACTER, 5, 2), makeTile(SUIT.CHARACTER, 5, 3), makeTile(SUIT.WIND, 1, 1),
      makeTile(SUIT.WIND, 1, 2), makeTile(SUIT.WIND, 1, 3)
    ];
    const result = calculateHandFan(handTiles);

    expect(result.isValid).toBe(true);
    expectRuleScored(result, '混一色', 40);
    expect(result.breakdown.some(item => item.rule === '清一色')).toBe(false);
    expect(isMixedFlush(handTiles)).toBe(true);
  });

  it('does not classify multiple number suits as 混一色', () => {
    const handTiles = [
      makeTile(SUIT.CHARACTER, 1, 1),
      makeTile(SUIT.DOT, 1, 2),
      makeTile(SUIT.WIND, 1, 3)
    ];

    expect(isMixedFlush(handTiles)).toBe(false);
  });

  it('does not classify a pure number suit as 混一色', () => {
    const handTiles = [
      makeTile(SUIT.CHARACTER, 1, 1),
      makeTile(SUIT.CHARACTER, 2, 2),
      makeTile(SUIT.CHARACTER, 3, 3)
    ];

    expect(isMixedFlush(handTiles)).toBe(false);
  });
});