import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { MELD, SUIT, Tile } from '../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile =>
  ({ id: `${suit}-${value}-${id}`, suit, value, label: `${suit}${value}` });

const baseHand = (): Tile[] => [
  tile(SUIT.DOT, 1, 0), tile(SUIT.DOT, 2, 0), tile(SUIT.DOT, 3, 0),
  tile(SUIT.DOT, 4, 0), tile(SUIT.DOT, 5, 0), tile(SUIT.DOT, 6, 0),
  tile(SUIT.DOT, 7, 0), tile(SUIT.DOT, 8, 0), tile(SUIT.DOT, 9, 0),
  tile(SUIT.DOT, 2, 1), tile(SUIT.DOT, 3, 1), tile(SUIT.DOT, 4, 1),
  tile(SUIT.DOT, 5, 0), tile(SUIT.DOT, 5, 1),
  tile(SUIT.DOT, 6, 1), tile(SUIT.DOT, 7, 1), tile(SUIT.DOT, 8, 1)
];

describe('scoring modifier regressions', () => {
  it('scores an exposed kong as 明槓 while preserving the project 門清 rule', () => {
    const kong = [0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id));
    const result = calculateHandFan(baseHand().slice(0, 14), {
      kong: { kind: MELD.KONG, tiles: kong, concealed: false }
    });
    expect(result.breakdown).toContainEqual({ rule: '槓 x1', fan: 1 });
    expect(result.breakdown).toContainEqual({ rule: '門清', fan: 5 });
  });

  it('keeps totalFan equal to the sum of every reported scoring rule', () => {
    const result = calculateHandFan(baseHand(), undefined, true);
    expect(result.isValid).toBe(true);
    expect(result.totalFan).toBe(
      result.breakdown.reduce((total, item) => total + item.fan, 0)
    );
    expect(result.totalFan).toBe(134);
  });

  it('scores a concealed kong as 暗槓 and retains 門清', () => {
    const kong = [0, 1, 2, 3].map(id => tile(SUIT.CHARACTER, 1, id));
    const result = calculateHandFan(baseHand().slice(0, 14), {
      kong: { kind: MELD.KONG, tiles: kong, concealed: true }
    });
    expect(result.breakdown).toContainEqual({ rule: '暗槓 x1', fan: 2 });
    expect(result.breakdown).toContainEqual({ rule: '門清', fan: 5 });
  });

  it('scores exactly one flower group and not 八仙過海', () => {
    const result = calculateHandFan(baseHand(), {
      flowers: {
        kind: MELD.FLOWER,
        tiles: [tile(SUIT.FLOWER, 1, 0), tile(SUIT.FLOWER, 2, 0), tile(SUIT.FLOWER, 3, 0), tile(SUIT.FLOWER, 4, 0)]
      }
    });
    expect(result.breakdown).toContainEqual({ rule: '一台花 (梅,蘭,竹,菊)', fan: 10 });
    expect(result.breakdown).not.toContainEqual({ rule: '八仙過海', fan: 40 });
  });

  it('scores 八仙過海 when both flower groups are complete', () => {
    const result = calculateHandFan(baseHand(), {
      flowers: {
        kind: MELD.FLOWER,
        tiles: [
          ...[1, 2, 3, 4, 5, 6, 7, 8].map(value => tile(SUIT.FLOWER, value, value))
        ]
      }
    });
    expect(result.breakdown).toContainEqual({ rule: '八仙過海', fan: 40 });
    expect(result.breakdown).not.toContainEqual({ rule: '一台花 (梅,蘭,竹,菊)', fan: 10 });
    expect(result.breakdown).not.toContainEqual({ rule: '一台花 (春,夏,秋,冬)', fan: 10 });
  });
});
