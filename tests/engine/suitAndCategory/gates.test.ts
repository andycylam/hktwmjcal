import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { isVoidInOneSuit } from '../../../src/engine/validator.helpers';
import { MELD, SUIT, Tile } from '../../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile => ({
  id: `${suit}-${value}-${id}`,
  suit,
  value,
  label: `${suit}${value}`,
});

const chow = (suit: Tile['suit'], start: number, id: number): Tile[] =>
  [0, 1, 2].map(offset => tile(suit, start + offset, id + offset));

describe('缺一門', () => {
  it.each([
    ['缺萬', [SUIT.DOT, SUIT.BAMBOO]],
    ['缺筒', [SUIT.CHARACTER, SUIT.BAMBOO]],
    ['缺索', [SUIT.CHARACTER, SUIT.DOT]],
  ])('detects %s', (_name, suits) => {
    const hand = suits.flatMap((suit, suitIndex) => chow(suit, 1, suitIndex * 10));
    expect(isVoidInOneSuit(hand)).toBe(true);
  });

  it('does not detect 缺一門 when all three number suits are present', () => {
    const hand = [
      ...chow(SUIT.CHARACTER, 1, 0),
      ...chow(SUIT.DOT, 1, 10),
      ...chow(SUIT.BAMBOO, 1, 20),
    ];

    expect(isVoidInOneSuit(hand)).toBe(false);
  });

  it('does not detect 缺一門 when flowers are present', () => {
    const hand = [
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.BAMBOO, 1, 10),
    ];
    const meldMap = {
      flower: {
        kind: MELD.FLOWER,
        tiles: [tile(SUIT.FLOWER, 1, 20)],
      },
    };

    expect(isVoidInOneSuit(hand, meldMap)).toBe(false);
  });

  it('awards the exact total alongside 門清、自摸、無字花', () => {
    const hand = [
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.DOT, 4, 10),
      ...chow(SUIT.DOT, 7, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      ...chow(SUIT.BAMBOO, 4, 40),
      tile(SUIT.DOT, 5, 50),
      tile(SUIT.DOT, 5, 51),
    ];
    const result = calculateHandFan(hand, undefined, true);

    expect(result.isValid).toBe(true);
    expect(result.breakdown).toEqual(expect.arrayContaining([
      { rule: '門清', fan: 5 },
      { rule: '自摸', fan: 1 },
      { rule: '無字花', fan: 5 },
      { rule: '缺一門', fan: 10 },
    ]));
    expect(result.totalFan).toBe(
      result.breakdown.reduce((sum, item) => sum + item.fan, 0)
    );
  });
});