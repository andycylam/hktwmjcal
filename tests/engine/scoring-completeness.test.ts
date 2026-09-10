import { describe, expect, it } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { detectWaitPattern } from '../../src/engine/validator.patterns';
import { MELD, SUIT, Tile } from '../../src/types/mahjong';

const t = (suit: Tile['suit'], value: number, id: number): Tile => ({
  id: `${suit}-${value}-${id}`,
  suit,
  value,
  label: `${suit}${value}`,
});

const group = (suit: Tile['suit'], value: number, start: number): Tile[] =>
  [0, 1, 2].map(offset => t(suit, value, start + offset));

const chow = (suit: Tile['suit'], start: number, id: number): Tile[] =>
  [0, 1, 2].map(offset => t(suit, start + offset, id + offset));

const hasRule = (result: ReturnType<typeof calculateHandFan>, rule: string) =>
  result.breakdown.some(item => item.rule === rule);

const likGooHand = (): Tile[] => [
  t(SUIT.DOT, 2, 0), t(SUIT.DOT, 2, 1),
  t(SUIT.BAMBOO, 3, 2), t(SUIT.BAMBOO, 3, 3),
  t(SUIT.DOT, 4, 4), t(SUIT.DOT, 4, 5),
  t(SUIT.BAMBOO, 5, 6), t(SUIT.BAMBOO, 5, 7),
  t(SUIT.DOT, 6, 8), t(SUIT.DOT, 6, 9),
  t(SUIT.WIND, 1, 10), t(SUIT.WIND, 1, 11),
  t(SUIT.DRAGON, 5, 12), t(SUIT.DRAGON, 5, 13),
  t(SUIT.CHARACTER, 3, 14), t(SUIT.CHARACTER, 3, 15),
  t(SUIT.CHARACTER, 3, 16),
];

const fourMelds = (): Tile[] => [
  ...chow(SUIT.DOT, 1, 0),
  ...chow(SUIT.DOT, 4, 10),
  ...chow(SUIT.BAMBOO, 1, 20),
  ...chow(SUIT.CHARACTER, 7, 30),
];

const fiveMelds = (): Tile[] => [
  ...fourMelds(),
  ...chow(SUIT.CHARACTER, 4, 40),
];

describe('scoring completeness regressions', () => {
  it('reports the exact total for門清、自摸、無花、缺一門 and no hidden omission', () => {
    const hand = [
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.DOT, 4, 10),
      ...chow(SUIT.DOT, 7, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      ...chow(SUIT.BAMBOO, 4, 40),
      t(SUIT.DOT, 5, 50), t(SUIT.DOT, 5, 51),
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

  it('does not award 門清 for an exposed pung or chow', () => {
    const hand = [
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.DOT, 4, 10),
      ...chow(SUIT.DOT, 7, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      t(SUIT.DOT, 5, 40), t(SUIT.DOT, 5, 41),
    ];
    const exposed = {
      meld: {
        kind: MELD.PUNG,
        tiles: group(SUIT.CHARACTER, 9, 50),
        concealed: false,
      },
    };
    const result = calculateHandFan(hand, exposed);
    expect(result.isValid).toBe(true);
    expect(hasRule(result, '門清')).toBe(false);
  });

  it('scores a partial flower group and the matching seat flower independently', () => {
    const result = calculateHandFan([
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.DOT, 4, 10),
      ...chow(SUIT.DOT, 7, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      ...chow(SUIT.BAMBOO, 4, 35),
      t(SUIT.DOT, 5, 40), t(SUIT.DOT, 5, 41),
    ], {
      flowers: {
        kind: MELD.FLOWER,
        tiles: [t(SUIT.FLOWER, 1, 80), t(SUIT.FLOWER, 5, 81)],
      },
    }, false, undefined, { seatWind: 'east' });
    expect(result.isValid).toBe(true);
    expect(result.breakdown).toContainEqual({ rule: '正花 (梅)', fan: 1 });
    expect(result.breakdown).toContainEqual({ rule: '花牌 (梅)', fan: 1 });
    expect(result.breakdown).toContainEqual({ rule: '花牌 (春)', fan: 1 });
    expect(hasRule(result, '一台花')).toBe(false);
  });

  it('does not suppress duplicate flower scoring when duplicate flower tiles are supplied', () => {
    const result = calculateHandFan([
      ...chow(SUIT.DOT, 1, 0),
      ...chow(SUIT.DOT, 4, 10),
      ...chow(SUIT.DOT, 7, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      ...chow(SUIT.BAMBOO, 4, 35),
      t(SUIT.DOT, 5, 40), t(SUIT.DOT, 5, 41),
    ], {
      flowers: {
        kind: MELD.FLOWER,
        tiles: [t(SUIT.FLOWER, 1, 80), t(SUIT.FLOWER, 1, 81)],
      },
    });
    expect(result.breakdown.filter(item => item.rule === '花牌 (梅)')).toHaveLength(2);
  });

  it('keeps 大四喜 and 大三元 mutually exclusive from their smaller variants', () => {
    const windHand = [
      ...group(SUIT.WIND, 1, 0), ...group(SUIT.WIND, 2, 10),
      ...group(SUIT.WIND, 3, 20), ...group(SUIT.WIND, 4, 30),
      ...chow(SUIT.DOT, 1, 40), t(SUIT.DOT, 5, 50), t(SUIT.DOT, 5, 51),
    ];
    const windResult = calculateHandFan(windHand);
    expect(windResult.breakdown).toContainEqual({ rule: '大四喜', fan: 160 });
    expect(hasRule(windResult, '小四喜')).toBe(false);

    const dragonHand = [
      ...group(SUIT.DRAGON, 5, 0), ...group(SUIT.DRAGON, 6, 10),
      ...group(SUIT.DRAGON, 7, 20),
      ...chow(SUIT.DOT, 1, 30), ...chow(SUIT.BAMBOO, 4, 40),
      t(SUIT.CHARACTER, 5, 50), t(SUIT.CHARACTER, 5, 51),
    ];
    const dragonResult = calculateHandFan(dragonHand);
    expect(dragonResult.breakdown).toContainEqual({ rule: '大三元', fan: 80 });
    expect(hasRule(dragonResult, '小三元')).toBe(false);
  });

  it('adds both seat-wind and prevailing-wind fan to a matching wind triplet', () => {
    const result = calculateHandFan([
      ...group(SUIT.WIND, 1, 0),
      ...chow(SUIT.DOT, 1, 10),
      ...chow(SUIT.DOT, 4, 20),
      ...chow(SUIT.BAMBOO, 1, 30),
      ...chow(SUIT.BAMBOO, 4, 40),
      t(SUIT.CHARACTER, 5, 50), t(SUIT.CHARACTER, 5, 51),
    ], undefined, false, undefined, {
      seatWind: 'east',
      prevailingWind: 'east',
    });
    expect(result.breakdown).toContainEqual({ rule: '正字 (座位)', fan: 1 });
    expect(result.breakdown).toContainEqual({ rule: '正字 (場風)', fan: 1 });
    expect(result.breakdown).toContainEqual({ rule: '字牌 (東)', fan: 1 });
  });

  it('settles 十三么 and 十六不搭 as special forms without basic-form fans', () => {
    const orphans = [
      t(SUIT.CHARACTER, 1, 0), t(SUIT.CHARACTER, 9, 1),
      t(SUIT.DOT, 1, 2), t(SUIT.DOT, 9, 3),
      t(SUIT.BAMBOO, 1, 4), t(SUIT.BAMBOO, 9, 5),
      t(SUIT.WIND, 1, 6), t(SUIT.WIND, 2, 7), t(SUIT.WIND, 3, 8), t(SUIT.WIND, 4, 9),
      t(SUIT.DRAGON, 5, 10), t(SUIT.DRAGON, 6, 11), t(SUIT.DRAGON, 7, 12),
      t(SUIT.CHARACTER, 1, 13), t(SUIT.CHARACTER, 2, 14), t(SUIT.CHARACTER, 3, 15), t(SUIT.CHARACTER, 4, 16),
    ];
    const orphanResult = calculateHandFan(orphans);
    expect(hasRule(orphanResult, '十三么')).toBe(true);
    expect(orphanResult.breakdown.some(item => ['平糊', '門清', '無字', '缺一門'].includes(item.rule))).toBe(false);

    const unconnected = [
      t(SUIT.WIND, 1, 0), t(SUIT.WIND, 2, 1), t(SUIT.WIND, 3, 2), t(SUIT.WIND, 4, 3),
      t(SUIT.DRAGON, 5, 4), t(SUIT.DRAGON, 6, 5), t(SUIT.DRAGON, 7, 6),
      t(SUIT.CHARACTER, 1, 7), t(SUIT.CHARACTER, 4, 8), t(SUIT.CHARACTER, 9, 9),
      t(SUIT.DOT, 1, 10), t(SUIT.DOT, 4, 11), t(SUIT.DOT, 9, 12),
      t(SUIT.BAMBOO, 1, 13), t(SUIT.BAMBOO, 4, 14), t(SUIT.BAMBOO, 9, 15),
      t(SUIT.WIND, 1, 16),
    ];
    const unconnectedResult = calculateHandFan(unconnected);
    expect(hasRule(unconnectedResult, '十六不搭')).toBe(true);
    expect(unconnectedResult.breakdown.some(item => ['平糊', '門清', '無字', '缺一門'].includes(item.rule))).toBe(false);
  });

  it('preserves the documented 嚦咕與基本形雙重計算 policy', () => {
    const result = calculateHandFan(likGooHand(), undefined, true);
    expect(result.isValid).toBe(true);
    expect(result.breakdown.filter(item => item.rule === '嚦咕嚦咕')).toHaveLength(1);
    expect(result.totalFan).toBe(
      result.breakdown.reduce((sum, item) => sum + item.fan, 0)
    );
  });

  it('scores the three true 獨獨 wait shapes', () => {
    const singleHu = t(SUIT.BAMBOO, 5, 99);
    const single = calculateHandFan([
      ...fiveMelds(), t(SUIT.BAMBOO, 5, 42), singleHu,
    ], undefined, false, singleHu);
    expect(single.breakdown).toContainEqual({ rule: '獨獨 (單吊)', fan: 2 });

    const middleHu = t(SUIT.BAMBOO, 5, 100);
    const middle = calculateHandFan([
      ...fourMelds(), t(SUIT.DOT, 2, 50), t(SUIT.DOT, 2, 51),
      t(SUIT.BAMBOO, 4, 52), t(SUIT.BAMBOO, 6, 53), middleHu,
    ], undefined, false, middleHu);
    expect(middle.breakdown).toContainEqual({ rule: '獨獨 (卡窿)', fan: 2 });

    const edgeHu = t(SUIT.BAMBOO, 3, 101);
    const edge = calculateHandFan([
      ...fourMelds(), t(SUIT.DOT, 2, 60), t(SUIT.DOT, 2, 61),
      t(SUIT.BAMBOO, 1, 62), t(SUIT.BAMBOO, 2, 63), edgeHu,
    ], undefined, false, edgeHu);
    expect(edge.breakdown).toContainEqual({ rule: '獨獨 (偏章)', fan: 2 });
  });

  it('uses the highest-scoring decomposition when a hand has multiple decompositions', () => {
    const hand = [
      t(SUIT.CHARACTER, 5, 0), t(SUIT.CHARACTER, 5, 1),
      ...group(SUIT.CHARACTER, 6, 10),
      ...[0, 1, 2, 3].map(id => t(SUIT.CHARACTER, 7, 20 + id)),
      ...[0, 1, 2, 3].map(id => t(SUIT.CHARACTER, 8, 30 + id)),
      ...[0, 1, 2, 3].map(id => t(SUIT.CHARACTER, 9, 40 + id)),
    ];
    const result = calculateHandFan(hand, undefined, true);
    expect(result.isValid).toBe(true);
    expect(result.possibleCombinations?.length).toBeGreaterThan(1);
    expect(result.breakdown).toContainEqual({ rule: '將眼 (五萬)', fan: 2 });
    expect(result.totalFan).toBe(
      result.breakdown.reduce((sum, item) => sum + item.fan, 0)
    );
  });

  it('recognizes 假獨 when a ka-lung shape has another winning tile', () => {
    const remaining = new Map<string, number>([
      [`${SUIT.DOT}_1`, 1], [`${SUIT.DOT}_2`, 1], [`${SUIT.DOT}_3`, 1],
      [`${SUIT.DOT}_4`, 1], [`${SUIT.DOT}_5`, 1], [`${SUIT.DOT}_6`, 1],
      [`${SUIT.BAMBOO}_1`, 3], [`${SUIT.BAMBOO}_2`, 1], [`${SUIT.BAMBOO}_3`, 1],
      [`${SUIT.BAMBOO}_4`, 1], [`${SUIT.BAMBOO}_6`, 1],
      [`${SUIT.CHARACTER}_1`, 1], [`${SUIT.CHARACTER}_2`, 1], [`${SUIT.CHARACTER}_3`, 1],
    ]);
    const result = detectWaitPattern(remaining, t(SUIT.BAMBOO, 5, 110));
    expect(result).toEqual({
      isDukDuk: false,
      isFakeDuk: true,
      dukDukType: 'kaLung',
    });
  });

});
