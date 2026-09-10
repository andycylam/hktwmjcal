import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile, MELD, SUIT } from '../../src/types/mahjong';
import { expectRuleScored } from '../testHelpers';

function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}

describe('validator wind scoring', () => {
  it('字一色', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '字一色', 120);
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
    expectRuleScored(res, '大四喜', 160);
  });
});
