import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { SUIT, Tile } from '../../../src/types/mahjong';

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
});
