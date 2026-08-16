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
      makeTile('wan', 1, 1),
      makeTile('wan', 1, 2),
      makeTile('wan', 1, 3),
      makeTile('wan', 1, 4),
    ];

    // Create 14 other tiles in hand so that counted total = 14 + 4 = 18
    const handTiles: Tile[] = [];
    // distribute across suits/values so none exceeds 4 copies
    handTiles.push(makeTile('tong', 1, 1));
    handTiles.push(makeTile('tong', 2, 1));
    handTiles.push(makeTile('tong', 3, 1));
    handTiles.push(makeTile('sou', 1, 1));
    handTiles.push(makeTile('sou', 2, 1));
    handTiles.push(makeTile('sou', 3, 1));
    handTiles.push(makeTile('wan', 2, 1));
    handTiles.push(makeTile('wan', 3, 1));
    handTiles.push(makeTile('wan', 4, 1));
    handTiles.push(makeTile('wan', 5, 1));
    handTiles.push(makeTile('wan', 6, 1));
    handTiles.push(makeTile('wan', 7, 1));
    handTiles.push(makeTile('wan', 8, 1));
    handTiles.push(makeTile('wan', 9, 1));

    const meldMap: Record<string, any> = {
      'wan_1@kong': { kind: 'kong', tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    // Ensure the validator accepted the kong-adjusted total
    const kongCount = Object.values(meldMap).filter((m: any) => m.kind === 'kong').length;
    expect(handTiles.length + kongTiles.length).toBe(17 + kongCount);
  });

  it('rejects when counted tiles exceed 17 + number_of_kongs', () => {
    // Create a kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile('wan', 2, 1),
      makeTile('wan', 2, 2),
      makeTile('wan', 2, 3),
      makeTile('wan', 2, 4),
    ];

    // Create 15 other tiles in hand so that counted total = 15 + 4 = 19 (one too many)
    const handTiles: Tile[] = [];
    for (let i = 1; i <= 15; i++) {
      handTiles.push(makeTile('tong', (i % 9) + 1, i + 10));
    }

    const meldMap: Record<string, any> = {
      'wan_2@kong': { kind: 'kong', tiles: kongTiles }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(false);
    expect(res.totalFan).toBe(0);
    expect(res.reason).toBeTruthy();
  });

  it('awards concealed kong fan and includes breakdown entry', () => {
    // Create a concealed kong (4 tiles)
    const kongTiles: Tile[] = [
      makeTile('sou', 1, 1),
      makeTile('sou', 1, 2),
      makeTile('sou', 1, 3),
      makeTile('sou', 1, 4),
    ];

    // Create 14 other tiles in hand so that counted total = 14 + 4 = 18
    const handTiles: Tile[] = [];
    handTiles.push(makeTile('wan', 2, 1));
    handTiles.push(makeTile('wan', 3, 1));
    handTiles.push(makeTile('wan', 4, 1));
    handTiles.push(makeTile('wan', 5, 1));
    handTiles.push(makeTile('wan', 6, 1));
    handTiles.push(makeTile('wan', 7, 1));
    handTiles.push(makeTile('wan', 8, 1));
    handTiles.push(makeTile('wan', 9, 1));
    handTiles.push(makeTile('tong', 1, 1));
    handTiles.push(makeTile('tong', 2, 1));
    handTiles.push(makeTile('tong', 3, 1));
    handTiles.push(makeTile('sou', 2, 1));
    handTiles.push(makeTile('sou', 3, 1));
    handTiles.push(makeTile('sou', 4, 1));

    const meldMap: Record<string, any> = {
      'sou_1@kong': { kind: 'kong', tiles: kongTiles, concealed: true }
    };

    const res = calculateHandFan(handTiles, meldMap, false);
    expect(res.isValid).toBe(true);
    // base fan is 1, concealed kong adds +1
    expect(res.totalFan).toBeGreaterThanOrEqual(2);
    const hasConcealed = res.breakdown.some(b => b.rule && b.rule.startsWith('暗槓'));
    expect(hasConcealed).toBe(true);
  });
});
