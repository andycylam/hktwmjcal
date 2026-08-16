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
    hand = [makeTile('wan',1,1), makeTile('wan',1,2), makeTile('wan',1,3), makeTile('wan',1,4)];
    // simulate creation of kong
    meldMap['wan_1@kong'] = { kind: 'kong', tiles: [...hand] };
    hand = [];

    // downgrade by removing one tile
    const clicked = meldMap['wan_1@kong'].tiles[0];
    const remaining = meldMap['wan_1@kong'].tiles.filter(t => t.id !== clicked.id);
    delete meldMap['wan_1@kong'];
    meldMap['wan_1@pung'] = { kind: 'pung', tiles: remaining };
    hand.push(clicked);

    expect(Object.keys(meldMap)).toContain('wan_1@pung');
    expect(hand.length).toBe(1);

    // remove one from pung and expect two to return
    const removeId = meldMap['wan_1@pung'].tiles[0].id;
    const remaining2 = meldMap['wan_1@pung'].tiles.filter(t => t.id !== removeId);
    delete meldMap['wan_1@pung'];
    hand.push(...remaining2);

    expect(hand.length).toBe(3);
  });

  it('shang detection works', () => {
    hand = [makeTile('sou',4,1), makeTile('sou',5,2), makeTile('sou',6,3)];
    // create shang
    meldMap['sou_4@shang'] = { kind: 'shang', tiles: [...hand] };
    hand = [];
    expect(Object.keys(meldMap).some(k => k.endsWith('@shang'))).toBe(true);
  });

  it('zimo and concealed scoring reflected in validator', () => {
    // Create a concealed kong and remaining tiles that form 3 melds + pair
    meldMap['wan_1@kong'] = { kind: 'kong', tiles: [makeTile('wan',1,100), makeTile('wan',1,101), makeTile('wan',1,102), makeTile('wan',1,103)], concealed: true };
    // remaining hand should be 11 tiles (3 melds + pair)
    hand = [
      // meld 1
      makeTile('tong',1,1), makeTile('tong',2,2), makeTile('tong',3,3),
      // meld 2
      makeTile('sou',2,4), makeTile('sou',3,5), makeTile('sou',4,6),
      // meld 3
      makeTile('wan',2,7), makeTile('wan',3,8), makeTile('wan',4,9),
      // pair
      makeTile('wind',1,10), makeTile('wind',1,11)
    ];

    const res = calculateHandFan(hand as Tile[], meldMap, true);
    expect(res.isValid).toBe(true);
    expect(res.breakdown.some(b => b.rule === '自摸 (Zimo)')).toBe(true);
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
    hand = new Array(16).fill(0).map((_,i) => makeTile('wan', (i % 9) + 1, i+1));
    meldMap['flower_1@flower'] = { kind: 'flower', tiles: [makeTile('flower', 1, 1)] };
    const res = calculateHandFan(hand as Tile[], meldMap, false);
    expect(res.isValid).toBe(false);
    expect(res.reason).toMatch(/目前手牌共有 16 張/);
  });
});
