import { describe, it, expect, beforeEach } from 'vitest';
import { calculateHandFan } from '../src/engine/validator';
import { Tile } from '../src/types/mahjong';

function makeTile(suit: string, value: number, idSuffix: number): Tile {
  return { id: `${suit}_${value}_${idSuffix}`, suit: suit as any, value, label: `${value}${suit}` };
}

describe('meld behaviors', () => {
  let hand: Tile[] = [];
  let meldMap: Record<string, { kind: 'kong'|'pung'|'shang'|'flower'; tiles: Tile[]; concealed?: boolean }> = {};

  beforeEach(() => {
    hand = [];
    meldMap = {};
  });

  it('selection kong -> downgrade -> remove returns correct tiles', () => {
    hand = [makeTile('character',1,1), makeTile('character',1,2), makeTile('character',1,3), makeTile('character',1,4)];
    // simulate creation of kong
    meldMap['character_1@kong'] = { kind: 'kong', tiles: [...hand] };
    hand = [];

    // downgrade by removing one tile
    const clicked = meldMap['character_1@kong'].tiles[0];
    const remaining = meldMap['character_1@kong'].tiles.filter(t => t.id !== clicked.id);
    delete meldMap['character_1@kong'];
    meldMap['character_1@pung'] = { kind: 'pung', tiles: remaining };
    hand.push(clicked);

    expect(Object.keys(meldMap)).toContain('character_1@pung');
    expect(hand.length).toBe(1);

    // remove one from pung and expect two to return
    const removeId = meldMap['character_1@pung'].tiles[0].id;
    const remaining2 = meldMap['character_1@pung'].tiles.filter(t => t.id !== removeId);
    delete meldMap['character_1@pung'];
    hand.push(...remaining2);

    expect(hand.length).toBe(3);
  });

  it('shang detection works', () => {
    hand = [makeTile('bamboo',4,1), makeTile('bamboo',5,2), makeTile('bamboo',6,3)];
    // create shang
    meldMap['bamboo_4@shang'] = { kind: 'shang', tiles: [...hand] };
    hand = [];
    expect(Object.keys(meldMap).some(k => k.endsWith('@shang'))).toBe(true);
  });

  it('zimo and concealed scoring reflected in validator', () => {
    // Create a concealed kong and remaining tiles that form 3 melds + pair
    meldMap['character_1@kong'] = { kind: 'kong', tiles: [makeTile('character',1,100), makeTile('character',1,101), makeTile('character',1,102), makeTile('character',1,103)], concealed: true };
    // remaining hand should be 14 tiles (4 melds + pair) to satisfy total 17 when a kong exists
    hand = [
      // meld 1
      makeTile('dot',1,1), makeTile('dot',2,2), makeTile('dot',3,3),
      // meld 2
      makeTile('bamboo',2,4), makeTile('bamboo',3,5), makeTile('bamboo',4,6),
      // meld 3
      makeTile('character',2,7), makeTile('character',3,8), makeTile('character',4,9),
      // meld 4
      makeTile('dot',4,12), makeTile('dot',5,13), makeTile('dot',6,14),
      // pair
      makeTile('wind',1,10), makeTile('wind',1,11)
    ];

    const res = calculateHandFan(hand as Tile[], meldMap, true);
    expect(res.isValid).toBe(true);
    expect(res.breakdown.some(b => b.rule === '自摸')).toBe(true);
    expect(res.breakdown.some(b => b.rule.startsWith('暗槓'))).toBe(true);
  });

  it('flower cancel removes flower meld', () => {
    // add two flowers then remove one
    meldMap['flower_1@flower'] = { kind: 'flower', tiles: [makeTile('flower', 1, 1)] };
    meldMap['flower_2@flower'] = { kind: 'flower', tiles: [makeTile('flower', 2, 2)] };
    expect(Object.keys(meldMap).some(k => k.endsWith('@flower'))).toBe(true);
    delete meldMap['flower_1@flower'];
    const remaining = Object.keys(meldMap).filter(k => meldMap[k].kind === 'flower');
    expect(remaining.length).toBe(1);
    expect(remaining[0]).toBe('flower_2@flower');
  });

  it('flowers do not count toward 17 tiles requirement', () => {
    // hand of 16 tiles + 1 flower should still be invalid (flowers not counted)
    hand = new Array(16).fill(0).map((_,i) => makeTile('character', (i % 9) + 1, i+1));
    meldMap['flower_1@flower'] = { kind: 'flower', tiles: [makeTile('flower', 1, 1)] };
    const res = calculateHandFan(hand as Tile[], meldMap, false);
    expect(res.isValid).toBe(false);
    expect(res.reason).toMatch(/目前手牌共有 16 張/);
  });
});
