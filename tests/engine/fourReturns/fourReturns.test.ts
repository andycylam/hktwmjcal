import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { SUIT, Tile } from '../../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile =>
  ({ id: `${suit}-${value}-${id}`, suit, value, label: `${suit}${value}` });

describe('四歸', () => {
  it('scores 暗四歸二 for a concealed sequence and triplet split', () => {
    const hand: Tile[] = [
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 1, 1),
      tile(SUIT.CHARACTER, 1, 2), tile(SUIT.CHARACTER, 1, 3),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0),
      tile(SUIT.CHARACTER, 7, 0), tile(SUIT.CHARACTER, 8, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.CHARACTER, 9, 1), tile(SUIT.CHARACTER, 9, 2),
      tile(SUIT.CHARACTER, 2, 1), tile(SUIT.CHARACTER, 2, 2), tile(SUIT.CHARACTER, 2, 3)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸二', fan: 10 });
  });

  it('scores four-return bonuses independently for two four-of-a-kind groups', () => {
    const hand: Tile[] = [
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 1, 1),
      tile(SUIT.CHARACTER, 1, 2), tile(SUIT.CHARACTER, 1, 3),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 4, 2), tile(SUIT.CHARACTER, 4, 3),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0),
      tile(SUIT.CHARACTER, 7, 0), tile(SUIT.CHARACTER, 8, 0),
      tile(SUIT.CHARACTER, 9, 0), tile(SUIT.CHARACTER, 9, 1),
      tile(SUIT.CHARACTER, 9, 2)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown.filter(item => item.rule === '暗四歸二')).toHaveLength(2);
    expect(result.breakdown).toContainEqual({ rule: '八歸', fan: 20 });
  });
});
