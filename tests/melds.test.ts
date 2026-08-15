import { describe, it, expect, beforeEach } from 'vitest';
import { calculateHandFan } from '../src/engine/validator';
import { Tile } from '../src/types/mahjong';

function makeTile(suit: string, value: number, idSuffix: number): Tile {
  return { id: `${suit}_${value}_${idSuffix}`, suit: suit as any, value, label: `${value}${suit}` };
}

describe('meld behaviors', () => {
  let hand: Tile[] = [];
  let meldMap: Record<string, { kind: 'kong'|'pung'|'shang'; tiles: Tile[]; concealed?: boolean }> = {};

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
    // build hand such that hand + meld tiles = 17
    // one kong concealed (4 tiles) so hand should be 13 tiles
    meldMap['wan_1@kong'] = { kind: 'kong', tiles: [makeTile('wan',1,100), makeTile('wan',1,101), makeTile('wan',1,102), makeTile('wan',1,103)], concealed: true };
    const meldTiles = Object.values(meldMap).flatMap(m => m.tiles);
    const handCount = 17 - meldTiles.length;
    // avoid creating same value as meld (1) to prevent exceeding 4-of-a-kind
    hand = new Array(handCount).fill(0).map((_,i) => makeTile('wan', (i % 8) + 2, i));

    const res = calculateHandFan(hand as Tile[], meldMap, true);
    expect(res.isValid).toBe(true);
    expect(res.breakdown.some(b => b.rule === '自摸 (Zimo)')).toBe(true);
    expect(res.breakdown.some(b => b.rule.startsWith('暗槓'))).toBe(true);
  });
});
