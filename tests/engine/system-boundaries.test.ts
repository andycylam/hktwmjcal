import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { SUIT, Tile } from '../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile =>
  ({ id: `${suit}-${value}-${id}`, suit, value, label: `${suit}${value}` });

function validBasicHand(): Tile[] {
  return [
    tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0),
    tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 5, 0), tile(SUIT.DOT, 6, 0),
    tile(SUIT.BAMBOO, 7, 0), tile(SUIT.BAMBOO, 8, 0), tile(SUIT.BAMBOO, 9, 0),
    tile(SUIT.BAMBOO, 1, 1), tile(SUIT.BAMBOO, 2, 1), tile(SUIT.BAMBOO, 3, 1),
    tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 1, 1), tile(SUIT.WIND, 1, 2),
    tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 5, 1)
  ];
}

describe('system validation boundaries', () => {
  it('accepts a normal 17-tile basic hand', () => {
    const result = calculateHandFan(validBasicHand());
    expect(result.isValid).toBe(true);
    expect(result.possibleCombinations?.length).toBeGreaterThan(0);
  });

  it('rejects a hand below 17 counted tiles', () => {
    const result = calculateHandFan(validBasicHand().slice(0, 16));
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/需滿 17 張/);
  });

  it('rejects a hand above 17 counted tiles', () => {
    const result = calculateHandFan([...validBasicHand(), tile(SUIT.DOT, 1, 99)]);
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/超出允許的上限 17 張/);
  });

  it('rejects more than four copies of the same tile', () => {
    const hand = [
      ...validBasicHand().slice(0, 12),
      ...[0, 1, 2, 3, 4].map(id => tile(SUIT.CHARACTER, 1, id + 90))
    ];
    const result = calculateHandFan(hand);
    expect(result.isValid).toBe(false);
    expect(result.reason).toMatch(/超過 4 張限制/);
  });

  it('adds 自摸 only when the hand is marked self-drawn', () => {
    const hand = validBasicHand();
    const discardResult = calculateHandFan(hand, undefined, false);
    const selfDrawResult = calculateHandFan(hand, undefined, true);
    expect(discardResult.breakdown).not.toContainEqual({ rule: '自摸', fan: 1 });
    expect(selfDrawResult.breakdown).toContainEqual({ rule: '自摸', fan: 1 });
  });
});
