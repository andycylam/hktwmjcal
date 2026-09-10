import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { SUIT, Tile } from '../../../src/types/mahjong';

function tile(suit: Tile['suit'], value: number, index: number): Tile {
  return { id: `${suit}-${value}-${index}`, suit, value, label: `${suit}${value}` };
}

function validHand(): Tile[] {
  const tiles: Tile[] = [
    tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 9, 0),
    tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 9, 0),
    tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 9, 0),
    tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
    tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
    tile(SUIT.CHARACTER, 1, 1), tile(SUIT.CHARACTER, 2, 0),
    tile(SUIT.CHARACTER, 3, 0), tile(SUIT.CHARACTER, 4, 0)
  ];
  return tiles;
}

describe('十三么', () => {
  it('accepts all orphans with an extra pair and concealed meld', () => {
    const result = calculateHandFan(validHand());
    expect(result.isValid).toBe(true);
    expect(result.breakdown).toContainEqual({ rule: '十三么', fan: 100 });
  });

  it('rejects an exposed meld', () => {
    const hand = [...validHand().slice(0, 13), tile(SUIT.CHARACTER, 1, 1)];
    const result = calculateHandFan(hand, {
      exposed: {
        kind: 'pung',
        tiles: [
          tile(SUIT.CHARACTER, 2, 0),
          tile(SUIT.CHARACTER, 2, 1),
          tile(SUIT.CHARACTER, 2, 2)
        ]
      }
    });
    expect(result.isValid).toBe(false);
  });
  it('adds 20 fan for a thirteen-sided 十三么 wait', () => {
    const hand: Tile[] = [
      tile(SUIT.CHARACTER, 1, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 9, 0),
      tile(SUIT.BAMBOO, 1, 0), tile(SUIT.BAMBOO, 9, 0),
      tile(SUIT.WIND, 1, 0), tile(SUIT.WIND, 2, 0), tile(SUIT.WIND, 3, 0), tile(SUIT.WIND, 4, 0),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 6, 0), tile(SUIT.DRAGON, 7, 0),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0), tile(SUIT.CHARACTER, 4, 0),
      tile(SUIT.CHARACTER, 1, 1)
    ];
    const result = calculateHandFan(hand, undefined, false, hand[16]);
    expect(result.breakdown).toContainEqual({ rule: '十三么', fan: 100 });
    expect(result.breakdown).toContainEqual({ rule: '十三扉十三么', fan: 20 });
  });
});
