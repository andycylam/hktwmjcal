import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { MELD, SUIT, Tile } from '../../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile =>
  ({ id: `${suit}-${value}-${id}`, suit, value, label: `${suit}${value}` });

describe('十六不搭', () => {
  it('scores a hand with seven honors and three separated tiles in each suit', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    const result = calculateHandFan(hand);
    expect(result.isValid).toBe(true);
    expect(result.breakdown).toContainEqual({ rule: '十六不搭', fan: 50 });
  });

  it('accepts flowers alongside the special hand', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    const result = calculateHandFan(hand, {
      flower: {
        kind: MELD.FLOWER,
        tiles: [tile(SUIT.FLOWER, 1, 90)]
      }
    });
    expect(result.isValid).toBe(true);
    expect(result.breakdown).toContainEqual({ rule: '十六不搭', fan: 50 });
  });

  it('rejects connected suited tiles', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    expect(calculateHandFan(hand).isValid).toBe(false);
  });

  it('adds 十六扉不搭 for a 16-sided wait', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    const result = calculateHandFan(hand, undefined, false, hand[16]);
    expect(result.breakdown).toContainEqual({ rule: '十六扉不搭', fan: 20 });
  });

  it('scores 不搭三相 when all suits use the same separated numbers', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '不搭三相', fan: 20 });
  });

  it('scores 不搭雜龍 for 147, 258, and 369 across the suits', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 7, 0),
      tile(SUIT.DOT, 2, 0), tile(SUIT.DOT, 5, 0), tile(SUIT.DOT, 8, 0),
      tile(SUIT.BAMBOO, 3, 0), tile(SUIT.BAMBOO, 6, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '不搭雜龍', fan: 30 });
  });

  it('rejects an exposed pung', () => {
    const hand: Tile[] = [
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 4, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 1)
    ];
    expect(calculateHandFan(hand, {
      exposed: {
        kind: 'pung',
        tiles: [tile(SUIT.WIND, 1, 2), tile(SUIT.WIND, 1, 3), tile(SUIT.WIND, 1, 4)]
      }
    }).breakdown).not.toContainEqual({ rule: '十六不搭', fan: 50 });
  });
});
