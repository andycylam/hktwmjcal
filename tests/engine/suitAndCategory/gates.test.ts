import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { hasSevenGatesFlowers, isBigFiveGates, isSmallFiveGates, isVoidInOneSuit } from '../../../src/engine/validator.helpers';
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

  describe('五門齊／七門齊', () => {
    const fiveGateMelds = {
      c: { kind: MELD.PUNG, tiles: [tile(SUIT.CHARACTER, 1, 1), tile(SUIT.CHARACTER, 1, 2), tile(SUIT.CHARACTER, 1, 3)] },
      d: { kind: MELD.PUNG, tiles: [tile(SUIT.DOT, 1, 4), tile(SUIT.DOT, 1, 5), tile(SUIT.DOT, 1, 6)] },
      b: { kind: MELD.PUNG, tiles: [tile(SUIT.BAMBOO, 1, 7), tile(SUIT.BAMBOO, 1, 8), tile(SUIT.BAMBOO, 1, 9)] },
      w: { kind: MELD.PUNG, tiles: [tile(SUIT.WIND, 1, 10), tile(SUIT.WIND, 1, 11), tile(SUIT.WIND, 1, 12)] },
      r: { kind: MELD.PUNG, tiles: [tile(SUIT.DRAGON, 5, 13), tile(SUIT.DRAGON, 5, 14), tile(SUIT.DRAGON, 5, 15)] },
    };

    it('scores 大五門齊 when all five categories have a meld', () => {
      const result = calculateHandFan([tile(SUIT.CHARACTER, 2, 20), tile(SUIT.CHARACTER, 2, 21)], fiveGateMelds);
      expect(result.breakdown).toContainEqual({ rule: '大五門齊', fan: 20 });
      expect(result.breakdown).not.toContainEqual({ rule: '小五門齊', fan: 10 });
    });

    it('scores 小五門齊 when one category is pair-only', () => {
      const melds = { ...fiveGateMelds };
      delete (melds as Record<string, unknown>).r;
      const hand = [
        tile(SUIT.DRAGON, 5, 20), tile(SUIT.DRAGON, 5, 21),
        ...chow(SUIT.CHARACTER, 2, 22),
      ];
      expect(isSmallFiveGates(hand, melds)).toBe(true);
      expect(isBigFiveGates(hand, melds)).toBe(false);
      expect(calculateHandFan(hand, melds).breakdown).toContainEqual({ rule: '小五門齊', fan: 10 });
    });

    it('scores 大七門齊 with one flower and one season tile', () => {
      const meldMap = {
        ...fiveGateMelds,
        flowers: { kind: MELD.FLOWER, tiles: [tile(SUIT.FLOWER, 1, 31), tile(SUIT.FLOWER, 5, 35)] },
      };
      const result = calculateHandFan([tile(SUIT.CHARACTER, 2, 20), tile(SUIT.CHARACTER, 2, 21)], meldMap);
      expect(hasSevenGatesFlowers([], meldMap)).toBe(true);
      expect(result.breakdown).toContainEqual({ rule: '大七門齊', fan: 30 });
    });

    it('requires both a flower tile and a season tile for seven gates', () => {
      const flowerOnly = {
        ...fiveGateMelds,
        flowers: { kind: MELD.FLOWER, tiles: [tile(SUIT.FLOWER, 1, 31)] },
      };
      const seasonOnly = {
        ...fiveGateMelds,
        flowers: { kind: MELD.FLOWER, tiles: [tile(SUIT.FLOWER, 5, 35)] },
      };

      expect(hasSevenGatesFlowers([], flowerOnly)).toBe(false);
      expect(hasSevenGatesFlowers([], seasonOnly)).toBe(false);
    });

    it('scores 小七門齊 when the five-gate hand has all eight flower tiles', () => {
      const melds = { ...fiveGateMelds };
      delete (melds as Record<string, unknown>).r;
      const meldMap = {
        ...melds,
        flowers: { kind: MELD.FLOWER, tiles: [1, 2, 3, 4, 5, 6, 7, 8].map(value => tile(SUIT.FLOWER, value, 40 + value)) },
      };
      const hand = [
        tile(SUIT.DRAGON, 5, 20), tile(SUIT.DRAGON, 5, 21),
        ...chow(SUIT.CHARACTER, 2, 22),
      ];
      expect(calculateHandFan(hand, meldMap).breakdown).toContainEqual({ rule: '小七門齊', fan: 15 });
    });
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

  it('does not detect 缺一門 when honor tiles are present', () => {
    const hand = [
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.BAMBOO, 1, 10),
      tile(SUIT.WIND, 1, 20),
    ];

    expect(isVoidInOneSuit(hand)).toBe(false);
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