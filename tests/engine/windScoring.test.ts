import { describe, it, expect } from 'vitest';
import { calculateHandFan } from '../../src/engine/validator';
import { Tile } from '../../src/types/mahjong';

function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}

describe('validator wind scoring', () => {
  it('awards +1 fan when seat wind matches a wind triplet in declared melds', () => {
    const kongTiles: Tile[] = [
      makeTile('character', 1, 1),
      makeTile('character', 1, 2),
      makeTile('character', 1, 3),
      makeTile('character', 1, 4),
    ];

    const pungTiles: Tile[] = [
      makeTile('wind', 1, 1), // 東 x3, seat is east
      makeTile('wind', 1, 2),
      makeTile('wind', 1, 3),
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
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 2, 2));

    const meldMap: Record<string, any> = {
      'character_1@kong': { kind: 'kong', tiles: kongTiles },
      'wind_1@pung': { kind: 'pung', tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const seatFan = res.breakdown.filter(b => b.rule === '正字 (座位)');
    expect(seatFan.length).toBeGreaterThan(0);
  });

  it('awards +1 fan when prevailing wind matches a wind triplet in declared melds', () => {
    const pungTiles: Tile[] = [
      makeTile('wind', 2, 1), // 南 x3, prevailing is south
      makeTile('wind', 2, 2),
      makeTile('wind', 2, 3),
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
    handTiles.push(makeTile('bamboo', 4, 1));
    handTiles.push(makeTile('bamboo', 5, 1));
    handTiles.push(makeTile('bamboo', 6, 1));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 2, 2));

    const meldMap: Record<string, any> = {
      'wind_2@pung': { kind: 'pung', tiles: pungTiles },
    };

    const res = calculateHandFan(handTiles, meldMap, false, undefined, {
      prevailingWind: 'south',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const prevailingFan = res.breakdown.filter(b => b.rule === '正字 (場風)');
    expect(prevailingFan.length).toBeGreaterThan(0);
  });

  it('awards +1 fan when seat wind matches a wind triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 東 x3 (seat is east)
    handTiles.push(makeTile('wind', 1, 1));
    handTiles.push(makeTile('wind', 1, 2));
    handTiles.push(makeTile('wind', 1, 3));
    // 萬 1-2-3
    handTiles.push(makeTile('character', 1, 1));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile('character', 4, 1));
    handTiles.push(makeTile('character', 5, 1));
    handTiles.push(makeTile('character', 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 1));
    handTiles.push(makeTile('dot', 5, 1));
    handTiles.push(makeTile('dot', 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const seatFan = res.breakdown.filter(b => b.rule === '正字 (座位)');
    expect(seatFan.length).toBeGreaterThan(0);
  });

  it('awards +1 fan when prevailing wind matches a wind triplet in concealed hand', () => {
    const handTiles: Tile[] = [];
    // 北 x3 (prevailing is north)
    handTiles.push(makeTile('wind', 4, 1));
    handTiles.push(makeTile('wind', 4, 2));
    handTiles.push(makeTile('wind', 4, 3));
    // 萬 1-2-3
    handTiles.push(makeTile('character', 1, 1));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile('character', 4, 1));
    handTiles.push(makeTile('character', 5, 1));
    handTiles.push(makeTile('character', 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 1));
    handTiles.push(makeTile('dot', 5, 1));
    handTiles.push(makeTile('dot', 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'north',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const prevailingFan = res.breakdown.filter(b => b.rule === '正字 (場風)');
    expect(prevailingFan.length).toBeGreaterThan(0);
  });

  it('awards both seat and prevailing fan when they match the same wind triplet', () => {
    const handTiles: Tile[] = [];
    // 東 x3 (both seat and prevailing are east)
    handTiles.push(makeTile('wind', 1, 1));
    handTiles.push(makeTile('wind', 1, 2));
    handTiles.push(makeTile('wind', 1, 3));
    // 萬 1-2-3
    handTiles.push(makeTile('character', 1, 1));
    handTiles.push(makeTile('character', 2, 1));
    handTiles.push(makeTile('character', 3, 1));
    // 萬 4-5-6
    handTiles.push(makeTile('character', 4, 1));
    handTiles.push(makeTile('character', 5, 1));
    handTiles.push(makeTile('character', 6, 1));
    // 筒 1-2-3
    handTiles.push(makeTile('dot', 1, 1));
    handTiles.push(makeTile('dot', 2, 1));
    handTiles.push(makeTile('dot', 3, 1));
    // 筒 4-5-6
    handTiles.push(makeTile('dot', 4, 1));
    handTiles.push(makeTile('dot', 5, 1));
    handTiles.push(makeTile('dot', 6, 1));
    // pair: 索 1x2
    handTiles.push(makeTile('bamboo', 1, 1));
    handTiles.push(makeTile('bamboo', 1, 2));

    const res = calculateHandFan(handTiles, undefined, false, undefined, {
      prevailingWind: 'east',
      seatWind: 'east',
    });

    expect(res.isValid).toBe(true);
    const seatFan = res.breakdown.filter(b => b.rule === '正字 (座位)');
    const prevailingFan = res.breakdown.filter(b => b.rule === '正字 (場風)');
    expect(seatFan.length).toBeGreaterThan(0);
    expect(prevailingFan.length).toBeGreaterThan(0);
  });
});
