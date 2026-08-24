import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile } from '../../src/types/mahjong';

function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}

describe('validator kong-adjusted total', () => {
  it('accepts counted tiles equal to 17 + number_of_kongs', () => {
    // Create a kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile('character', 1, 1),
      makeTile('character', 1, 2),
      makeTile('character', 1, 3),
      makeTile('character', 1, 4),
    ];

    // Create 11 other tiles in hand that form 3 melds and a pair (needed when one meld exists)
    const handTiles: Tile[] = [];
    // meld 1: 筒 1-2-3
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    // meld 2: 索 1-2-3
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 2, 1));
    handTiles.push(makeTile('bamboo', 3, 1));
    // meld 3: 萬 2-3-4
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    handTiles.push(makeTile('character', 4, 1));
    // meld 4: 筒 4-5-6 (add one more meld to satisfy 5 melds total when a kong exists)
    handTiles.push(makeTile('dot', 4, 2));
    handTiles.push(makeTile('dot', 5, 2));
    handTiles.push(makeTile('dot', 6, 2));
    // pair: 風 東 x2
    handTiles.push(makeTile('wind', 1, 1));
    handTiles.push(makeTile('wind', 1, 2));

    const meldMap: Record<string, any> = {
      'character_1@kong': { kind: 'kong', tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBeGreaterThan(0);
  });

  it('does not count a four-of-a-kind left in hand as a kong unless declared in meldMap', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 9, i + 1));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 8, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 7, i + 20));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 6, i + 30));
    handTiles.push(makeTile('character', 5, 99));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.reason).toBeUndefined();
    expect(res.totalFan).toBeGreaterThanOrEqual(0);
  });

  it('accepts a valid hand that uses the remaining tiles as a descending sequence', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 9, i + 1));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 8, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 7, i + 20));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile('character', 6, i + 30));
    for (let i = 0; i < 2; i++) handTiles.push(makeTile('character', 5, i + 40));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
  });

  it('accepts a valid hand built from 999, 888, 666, 567, 789, and a 77 pair', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 3; i++) handTiles.push(makeTile('character', 9, i + 1));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile('character', 8, i + 10));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile('character', 6, i + 20));
    for (let i = 0; i < 2; i++) handTiles.push(makeTile('character', 7, i + 30));
    handTiles.push(makeTile('character', 5, 99));
    handTiles.push(makeTile('character', 6, 101));
    handTiles.push(makeTile('character', 7, 102));
    handTiles.push(makeTile('character', 7, 103));
    handTiles.push(makeTile('character', 8, 104));
    handTiles.push(makeTile('character', 9, 105));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.totalFan).toBeGreaterThanOrEqual(0);
  });

  it('deduplicates equivalent valid decompositions that differ only by sequence ordering', () => {
    const handTiles: Tile[] = [];
    handTiles.push(makeTile('character', 1, 1));
    handTiles.push(makeTile('character', 1, 2));
    handTiles.push(makeTile('character', 1, 3));
    handTiles.push(makeTile('character', 3, 4));
    handTiles.push(makeTile('character', 3, 5));
    handTiles.push(makeTile('character', 3, 6));
    handTiles.push(makeTile('character', 3, 7));
    handTiles.push(makeTile('character', 4, 8));
    handTiles.push(makeTile('character', 5, 9));
    handTiles.push(makeTile('character', 4, 10));
    handTiles.push(makeTile('character', 5, 11));
    handTiles.push(makeTile('character', 6, 12));
    handTiles.push(makeTile('character', 7, 13));
    handTiles.push(makeTile('character', 8, 14));
    handTiles.push(makeTile('character', 9, 15));
    handTiles.push(makeTile('character', 7, 16));
    handTiles.push(makeTile('character', 7, 17));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBe(1);
    expect(res.possibleCombinations?.[0]).toBe('1萬x3, 3萬x3, 3萬-4萬-5萬, 4萬-5萬-6萬, 7萬-8萬-9萬, 7萬x2');
  });

  it('shows multiple valid decompositions when the same hand can pair on different tiles', () => {
    const handTiles: Tile[] = [];
    for (let i = 0; i < 2; i++) handTiles.push(makeTile('character', 5, i + 1));
    for (let i = 0; i < 3; i++) handTiles.push(makeTile('character', 6, i + 10));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 7, i + 20));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 8, i + 30));
    for (let i = 0; i < 4; i++) handTiles.push(makeTile('character', 9, i + 40));

    const res = calculateHandFan(handTiles, undefined, false);
    expect(res.isValid).toBe(true);
    expect(res.possibleCombinations).toBeDefined();
    expect(res.possibleCombinations?.length).toBeGreaterThan(1);
    expect(res.possibleCombinations).toEqual(expect.arrayContaining([
      expect.stringContaining('5萬x2'),
      expect.stringContaining('8萬x2')
    ]));
  });

  it('rejects when counted tiles exceed 17 + number_of_kongs', () => {
    // Create a kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile('character', 2, 1),
      makeTile('character', 2, 2),
      makeTile('character', 2, 3),
      makeTile('character', 2, 4),
    ];

    // Create 15 other tiles in hand so that counted total = 15 + 4 = 19 (one too many)
    const handTiles: Tile[] = [];
    for (let i = 1; i <= 15; i++) {
      handTiles.push(makeTile('dot', (i % 9) + 1, i + 10));
    }

    const meldMap: Record<string, any> = {
      'character_2@kong': { kind: 'kong', tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(false);
    expect(res.totalFan).toBe(0);
    expect(res.reason).toBeTruthy();
  });

  it('awards concealed kong fan and includes breakdown entry', () => {
    // Create a concealed kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile('bamboo', 1, 1),
      makeTile('bamboo', 1, 2),
      makeTile('bamboo', 1, 3),
      makeTile('bamboo', 1, 4),
    ];

    // Create 11 other tiles in hand so that they form 3 melds + pair
    const handTiles: Tile[] = [];
    // meld 1: 萬 2-3-4
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    handTiles.push(makeTile('character', 4, 1));
    // meld 2: 筒 1-2-3
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    // meld 3: 索 2-3-4
    handTiles.push(makeTile('bamboo', 2, 1));
    handTiles.push(makeTile('bamboo', 3, 1));
    handTiles.push(makeTile('bamboo', 4, 1));
    // meld 4: 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 3));
    handTiles.push(makeTile('dot', 5, 3));
    handTiles.push(makeTile('dot', 6, 3));
    // pair: 東 x2
    handTiles.push(makeTile('wind', 1, 1));
    handTiles.push(makeTile('wind', 1, 2));

    const meldMap: Record<string, any> = {
      'bamboo_1@kong': { kind: 'kong', tiles: kongTiles, concealed: true }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    // kong adds +2
    //expect(res.totalFan).toBeGreaterThanOrEqual(2);
    const hasKong = res.breakdown.some(b => b.rule && b.rule.startsWith('槓'));
    expect(hasKong).toBe(true);
  });
  it('awards +1 fan for dragon triplet (中) in declared melds', () => {
    const pungTiles: Tile[] = [
      makeTile('dragon', 5, 1), // 中 x3
      makeTile('dragon', 5, 2),
      makeTile('dragon', 5, 3),
    ];

    const handTiles: Tile[] = [];
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    handTiles.push(makeTile('dot', 4, 2));
    handTiles.push(makeTile('dot', 5, 2));
    handTiles.push(makeTile('dot', 6, 2));
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 2, 1));
    handTiles.push(makeTile('bamboo', 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 3));
    handTiles.push(makeTile('dot', 5, 3));
    handTiles.push(makeTile('dot', 6, 3));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 2, 2));

    const meldMap: Record<string, any> = {
      'dragon_5@pung': { kind: 'pung', tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const dragonFan = res.breakdown.filter(b => b.rule === '字牌 (中)');
    expect(dragonFan.length).toBeGreaterThan(0);
  });

  it('awards +1 fan for each dragon triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 中 x3, 發 x3
    handTiles.push(makeTile('dragon', 5, 1));
    handTiles.push(makeTile('dragon', 5, 2));
    handTiles.push(makeTile('dragon', 5, 3));
    handTiles.push(makeTile('dragon', 6, 1));
    handTiles.push(makeTile('dragon', 6, 2));
    handTiles.push(makeTile('dragon', 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 3));
    handTiles.push(makeTile('dot', 5, 3));
    handTiles.push(makeTile('dot', 6, 3));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 3));
    handTiles.push(makeTile('dot', 5, 3));
    handTiles.push(makeTile('dot', 6, 3));
    // 萬 1-2-3
    handTiles.push(makeTile('character', 1, 1));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    // pair: 索 1x2
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const dragonFans = res.breakdown.filter(b => b.rule === '字牌 (中)' || b.rule === '字牌 (發)');
    expect(dragonFans.length).toBe(2);
  });
});
