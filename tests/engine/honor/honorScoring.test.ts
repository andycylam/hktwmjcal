import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../../src/engine/validator';
import { Tile, MELD, SUIT } from '../../../src/types/mahjong';
import { expectRuleScored } from '../../testHelpers';

function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}

describe('validator wind scoring', () => {
  it('字一色', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 1, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 2, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 1));
    handTiles.push(makeTile(SUIT.DRAGON, 3, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '字一色', 120);
  });

  it('scores 40 fan for 小三元 (2 dragon triplets + 1 dragon pair, self-drawn)', () => {
    const handTiles: Tile[] = [
        // 中×3 triplet
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×2 pair
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2),
        // 索 1-2-3 chow
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        // 萬 4-5-6 chow
        makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
        // 筒 7-8-9 chow
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
    ];
    const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
    });
    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小三元', 40);
    });

    it('scores 40 fan for 小三元 with declared concealed kong (non-self-drawn)', () => {
    const meldMap: Record<string, any> = {
        'dragon_5@kong': {
        kind: MELD.KONG,
        concealed: true,
        tiles: [makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3), makeTile(SUIT.DRAGON, 5, 4)],
        },
    };
    const handTiles: Tile[] = [
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×2 pair
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2),
        // 索 1-2-3 chow
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 2, 1), makeTile(SUIT.BAMBOO, 3, 1),
        // 萬 4-5-6 chow
        makeTile(SUIT.CHARACTER, 4, 1), makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1),
        // 筒 7-8-9 chow
        makeTile(SUIT.DOT, 7, 1), makeTile(SUIT.DOT, 8, 1), makeTile(SUIT.DOT, 9, 1),
    ];
    // handTiles = 14, meldTiles = 4 (kong), counted = 18, kongCount = 1, totalTilesNeeded = 18 ✓
    // neededMelds = 5 - 1 = 4, expectedRemaining = 14 = handTiles.length ✓
    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
        prevailingWind: 'south', seatWind: 'east',
    });
    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小三元', 40);
  });
  
  it('does NOT score 小三元 when all 3 dragons form triplets (scores 大三元 instead)', () => {
    const handTiles: Tile[] = [
    // 中×3, 發×3, 白×3 — all three dragon triplets → 大三元, not 小三元
    makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
    makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
    makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
    // pair 萬 7-7
    makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 7, 2),
    // 萬 1-2-3 chow
    makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
    // 索 4-5-6 chow
    makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
    ];
    // 17 tiles, self-drawn. Should score 大三元, NOT 小三元.
    const res = calculateHandFan(handTiles, undefined, true, undefined, {
    prevailingWind: 'south', seatWind: 'east',
    });
    expect(res.isValid).toBe(true);
    expectRuleScored(res, '大三元', 80);
    // Verify 小三元 is NOT scored
    const littleThreeDragons = res.breakdown.find(b => b.rule === '小三元');
    expect(littleThreeDragons).toBeUndefined();
  });

  it('scores 80 fan for 大三元 (all 3 dragon triplets concealed)', () => {
      const handTiles: Tile[] = [
        // 中×3 triplet
        makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3),
        // 發×3 triplet
        makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3),
        // 白×3 triplet
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
        // 萬 1-2-3 chow
        makeTile(SUIT.CHARACTER, 1, 1), makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1),
        // 索 4-5-6 chow
        makeTile(SUIT.BAMBOO, 4, 1), makeTile(SUIT.BAMBOO, 5, 1), makeTile(SUIT.BAMBOO, 6, 1),
        // pair 萬 7-7
        makeTile(SUIT.CHARACTER, 7, 1), makeTile(SUIT.CHARACTER, 7, 2),
      ];
      const res = calculateHandFan(handTiles, undefined, true, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '大三元', 80);
    });
    

    it('scores 80 fan for 大三元 with declared melds (exposed kongs)', () => {
      const meldMap: Record<string, any> = {
        'dragon_5@kong': {
          kind: MELD.KONG,
          concealed: false,
          tiles: [makeTile(SUIT.DRAGON, 5, 1), makeTile(SUIT.DRAGON, 5, 2), makeTile(SUIT.DRAGON, 5, 3), makeTile(SUIT.DRAGON, 5, 4)],
        },
        'dragon_6@kong': {
          kind: MELD.KONG,
          concealed: false,
          tiles: [makeTile(SUIT.DRAGON, 6, 1), makeTile(SUIT.DRAGON, 6, 2), makeTile(SUIT.DRAGON, 6, 3), makeTile(SUIT.DRAGON, 6, 4)],
        },
      };
      const handTiles: Tile[] = [
        // 白×3 triplet
        makeTile(SUIT.DRAGON, 7, 1), makeTile(SUIT.DRAGON, 7, 2), makeTile(SUIT.DRAGON, 7, 3),
        // pair 索 1-1
        makeTile(SUIT.BAMBOO, 1, 1), makeTile(SUIT.BAMBOO, 1, 2),
        // 萬 2-3-4 chow
        makeTile(SUIT.CHARACTER, 2, 1), makeTile(SUIT.CHARACTER, 3, 1), makeTile(SUIT.CHARACTER, 4, 1),
        // 萬 5-6-7 chow
        makeTile(SUIT.CHARACTER, 5, 1), makeTile(SUIT.CHARACTER, 6, 1), makeTile(SUIT.CHARACTER, 7, 1),
      ];
      // handTiles = 11, meldTiles = 8 (2 kongs), counted = 19, kongCount = 2, totalTilesNeeded = 19 ✓
      // neededMelds = 5 - 2 = 3, expectedRemaining = 11 = handTiles.length ✓
      const res = calculateHandFan(handTiles, meldMap, false, undefined, {
        prevailingWind: 'south', seatWind: 'east',
      });
      expect(res.isValid).toBe(true);
      expectRuleScored(res, '大三元', 80);
    });

  it('小三風', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小三風', 30);
  });
  it('大三風', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '大三風', 60);
  });
  it('小四喜', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '小四喜', 120);
  });
  it('大四喜', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile(SUIT.WIND, 1, 1));
    handTiles.push(makeTile(SUIT.WIND, 1, 2));
    handTiles.push(makeTile(SUIT.WIND, 1, 3));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 2, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 3, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.WIND, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 4, 1));
    handTiles.push(makeTile(SUIT.DOT, 5, 1));
    handTiles.push(makeTile(SUIT.DOT, 6, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 1));
    handTiles.push(makeTile(SUIT.BAMBOO, 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'south',
    });

    expect(res.isValid).toBe(true);
    expectRuleScored(res, '大四喜', 160);
  });
});
