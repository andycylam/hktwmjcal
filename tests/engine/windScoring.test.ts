import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile, MELD, SUIT } from '../../src/types/mahjong';
import { expectRuleScored } from '../testHelpers';

function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}

describe('validator wind scoring', () => {
  it('awards +1 fan when seat wind matches a wind triplet in declared melds', () => {
    const kongTiles: Tile[] = [
      makeTile(SUIT.CHARACTER, 1, 1),
      makeTile(SUIT.CHARACTER, 1, 2),
      makeTile(SUIT.CHARACTER, 1, 3),
      makeTile(SUIT.CHARACTER, 1, 4),
    ];

    const pungTiles: Tile[] = [
      makeTile(SUIT.WIND, 1, 1), // 東 x3, seat is east
      makeTile(SUIT.WIND, 1, 2),
      makeTile(SUIT.WIND, 1, 3),
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
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 2));

    const meldMap: Record<string, any> = {
      'character_1@kong': { kind: MELD.KONG, tiles: kongTiles },
      'wind_1@pung': { kind: MELD.PUNG, tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '正字 (座位)', 1);
  });

  it('awards +1 fan when prevailing wind matches a wind triplet in declared melds', () => {
    const pungTiles: Tile[] = [
      makeTile(SUIT.WIND, 2, 1), // 南 x3, prevailing is south
      makeTile(SUIT.WIND, 2, 2),
      makeTile(SUIT.WIND, 2, 3),
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
    handTiles.push(makeTile(SUIT.BAMBOO, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 5, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 6, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 2));

    const meldMap: Record<string, any> = {
      'wind_2@pung': { kind: MELD.PUNG, tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '正字 (場風)', 1);
  });

  it('awards +1 fan when seat wind matches a wind triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 東 x3 (seat is east)
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '正字 (座位)', 1);
  });

  it('awards +1 fan when prevailing wind matches a wind triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 北 x3 (prevailing is north)
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 2));
    handTiles.push(makeTile(SUIT.WIND, 4, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'north',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '正字 (場風)', 1);
  });

  it('awards both seat and prevailing fan when they match the same wind triplet', () => {
    const handTiles: Tile[] = [];
    // 東 x3 (both seat and prevailing are east)
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '正字 (座位)', 1);
    expectRuleScored(res, '正字 (場風)', 1);
  });

  it('東風', () => {
    const handTiles: Tile[] = [];
    // 東 x3
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    // 萬 1-2-3
    handTiles.push(makeTile(SUIT.CHARACTER, 1, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 2, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile(SUIT.CHARACTER, 4, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 5, 1));
    handTiles.push(makeTile(SUIT.CHARACTER, 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile(SUIT.DOT, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 2, 1));
    handTiles.push(makeTile(SUIT.DOT, 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '字牌 (東)', 1);
  });
  it('大四喜', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '大四喜', 180);
  });
  it('小四喜', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小四喜', 120);
  });
  it('大三風', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '大三風', 60);
  });
  it('小三風', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小三風', 30);
  });
});
