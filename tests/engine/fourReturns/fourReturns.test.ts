import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { MELD, SUIT, Tile } from '../../../src/types/mahjong';
import { getFourReturnAnalyses } from '../../../src/engine/validator.helpers';

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

  it('does not count the same four-of-a-kind as both four-return levels', () => {
    const hand = [
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id)),
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 2, id)),
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 3, id)),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸四', fan: 120 });
    expect(result.breakdown.filter(item => item.rule === '暗四歸二')).toHaveLength(0);
  });

  it('does not award 八歸 or 十二歸 for a single four-of-a-kind', () => {
    const hand = [
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id)),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0),
      tile(SUIT.CHARACTER, 7, 0), tile(SUIT.CHARACTER, 8, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.DOT, 2, 0), tile(SUIT.DOT, 3, 0), tile(SUIT.DOT, 4, 0),
      tile(SUIT.DOT, 5, 0), tile(SUIT.DOT, 5, 1)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸二', fan: 10 });
    expect(result.breakdown).not.toContainEqual({ rule: '八歸', fan: 20 });
    expect(result.breakdown).not.toContainEqual({ rule: '十二歸', fan: 80 });
  });

  it('does not award 十二歸 for exactly two four-of-a-kind groups', () => {
    const hand = [
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id)),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 3, 0),
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 4, id)),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0),
      tile(SUIT.CHARACTER, 7, 0), tile(SUIT.CHARACTER, 8, 0),
      tile(SUIT.CHARACTER, 9, 0), tile(SUIT.CHARACTER, 9, 1), tile(SUIT.CHARACTER, 9, 2)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown.filter(item => item.rule === '暗四歸二')).toHaveLength(2);
    expect(result.breakdown).toContainEqual({ rule: '八歸', fan: 20 });
    expect(result.breakdown).not.toContainEqual({ rule: '十二歸', fan: 80 });
  });

  it('does not mix 明四歸 and 暗四歸 for the same four-of-a-kind', () => {
    const result = calculateHandFan(
      [
        ...[1, 2, 3].flatMap(value => [0, 1, 2].map(id => tile(SUIT.CHARACTER, value, id + 10))),
        tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
        tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
      ],
      {
        exposed: {
          kind: MELD.CHOW,
          tiles: [
            tile(SUIT.CHARACTER, 1, 0),
            tile(SUIT.CHARACTER, 2, 0),
            tile(SUIT.CHARACTER, 3, 0)
          ]
        }
      }
    );
    expect(result.breakdown.some(item => item.rule === '明四歸四')).toBe(true);
    expect(result.breakdown.some(item => item.rule === '暗四歸四')).toBe(false);
  });

  it('scores 暗四歸三', () => {
    const hand = [
      tile(SUIT.CHARACTER, 1, 0),
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 2, 1),
      tile(SUIT.CHARACTER, 2, 2), tile(SUIT.CHARACTER, 2, 3),
      tile(SUIT.CHARACTER, 3, 0), tile(SUIT.CHARACTER, 3, 1),
      tile(SUIT.CHARACTER, 4, 0),
      tile(SUIT.CHARACTER, 3, 2), tile(SUIT.CHARACTER, 4, 1), tile(SUIT.CHARACTER, 5, 0),
      tile(SUIT.CHARACTER, 5, 1), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0),
      tile(SUIT.CHARACTER, 7, 1), tile(SUIT.CHARACTER, 8, 0), tile(SUIT.CHARACTER, 9, 0)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸三', fan: 30 });
  });

  it('scores 暗四歸四 for four identical sequences', () => {
    const hand = [
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id)),
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 2, id)),
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 3, id)),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸四', fan: 120 });
  });

  it('scores 明四歸四 when one sequence is exposed', () => {
    const meldTiles = [
      tile(SUIT.CHARACTER, 1, 0),
      tile(SUIT.CHARACTER, 2, 0),
      tile(SUIT.CHARACTER, 3, 0)
    ];
    const hand = [
      ...[1, 2, 3].flatMap(value => [0, 1, 2].map(id => tile(SUIT.CHARACTER, value, id + 10))),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
    ];
    const result = calculateHandFan(hand, {
      exposed: { kind: MELD.CHOW, tiles: meldTiles }
    });
    expect(result.breakdown).toContainEqual({ rule: '明四歸四', fan: 60 });
  });

  it('scores 明四歸三 when an exposed sequence shares four identical tiles', () => {
    const hand = [
      tile(SUIT.CHARACTER, 2, 0), tile(SUIT.CHARACTER, 2, 1), tile(SUIT.CHARACTER, 2, 2),
      tile(SUIT.CHARACTER, 3, 0), tile(SUIT.CHARACTER, 4, 0),
      tile(SUIT.CHARACTER, 3, 1), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0),
      tile(SUIT.CHARACTER, 7, 1), tile(SUIT.CHARACTER, 8, 0), tile(SUIT.CHARACTER, 9, 0),
      tile(SUIT.CHARACTER, 5, 1)
    ];
    const result = calculateHandFan(hand, {
      exposed: {
        kind: MELD.CHOW,
        tiles: [
          tile(SUIT.CHARACTER, 1, 0),
          tile(SUIT.CHARACTER, 2, 3),
          tile(SUIT.CHARACTER, 3, 3)
        ]
      }
    });
    expect(result.breakdown).toContainEqual({ rule: '明四歸三', fan: 15 });
  });

  it('scores 十二歸 for three four-of-a-kind groups', () => {
    const hand: Tile[] = [
      ...[1, 2, 3].flatMap(value => [0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, value, id))),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '十二歸', fan: 80 });
  });

  it('scores four identical tiles as two pairs in 嚦咕', () => {
    const hand: Tile[] = [
      ...[0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id)),
      ...[2, 3, 4, 5, 6].flatMap(value => [
        tile(SUIT.DOT, value, 0), tile(SUIT.DOT, value, 1)
      ]),
      tile(SUIT.DRAGON, 5, 0), tile(SUIT.DRAGON, 5, 1), tile(SUIT.DRAGON, 5, 2)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '暗四歸二', fan: 10 });
  });

  it('scores 八歸 and 十二歸 independently from the individual four-return fan', () => {
    const hand: Tile[] = [
      ...[1, 2, 3].flatMap(value => [0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, value, id))),
      tile(SUIT.CHARACTER, 4, 0), tile(SUIT.CHARACTER, 4, 1),
      tile(SUIT.CHARACTER, 5, 0), tile(SUIT.CHARACTER, 6, 0), tile(SUIT.CHARACTER, 7, 0)
    ];
    const result = calculateHandFan(hand);
    expect(result.breakdown).toContainEqual({ rule: '八歸', fan: 20 });
    expect(result.breakdown).toContainEqual({ rule: '十二歸', fan: 80 });
  });
});
