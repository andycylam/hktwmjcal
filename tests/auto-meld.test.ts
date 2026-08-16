import { describe, it, expect } from 'vitest';
import { Tile } from '../src/types/mahjong';

function makeTile(suit: string, value: number, idSuffix: number): Tile {
  return { id: `${suit}_${value}_${idSuffix}`, suit: suit as any, value, label: `${value}${suit}` };
}

// Recreate minimal parts of App behaviour needed for auto-create meld
function autoCreateMeldFromHand(hand: Tile[]) {
  // try kong
  const countMap: Record<string, Tile[]> = {};
  for (const t of hand) {
    const k = `${t.suit}_${t.value}`;
    if (!countMap[k]) countMap[k] = [];
    countMap[k].push(t);
  }

  for (const [k, arr] of Object.entries(countMap)) {
    if (arr.length >= 4) return { kind: 'kong', key: `${k}@kong`, tiles: arr.slice(0, 4), remaining: hand.filter(t => !arr.slice(0,4).some(x => x.id === t.id)) };
  }

  for (const [k, arr] of Object.entries(countMap)) {
    if (arr.length >= 3) return { kind: 'pung', key: `${k}@pung`, tiles: arr.slice(0, 3), remaining: hand.filter(t => !arr.slice(0,3).some(x => x.id === t.id)) };
  }

  // try shang
  const suits = Array.from(new Set(hand.map(t => t.suit)));
  for (const suit of suits) {
    for (let start = 1; start <= 7; start++) {
      const need = [start, start + 1, start + 2];
      const taken: Tile[] = [];
      for (const t of hand) {
        if (t.suit === suit && need.includes(t.value) && !taken.some(x => x.value === t.value)) taken.push(t);
      }
      if (taken.length === 3) return { kind: 'shang', key: `${suit}_${start}@shang`, tiles: taken, remaining: hand.filter(t => !taken.some(x => x.id === t.id)) };
    }
  }

  return null;
}

describe('auto-create 成組 from hand', () => {
  it('creates kong when 4 identical tiles exist', () => {
    const hand = [makeTile('wan',1,1), makeTile('wan',1,2), makeTile('wan',1,3), makeTile('wan',1,4), makeTile('wan',2,5)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('kong');
    expect(result!.tiles.length).toBe(4);
    expect(result!.remaining.length).toBe(1);
  });

  it('creates pung when 3 identical tiles exist but no kong', () => {
    const hand = [makeTile('wan',3,1), makeTile('wan',3,2), makeTile('wan',3,3), makeTile('wan',4,4)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('pung');
    expect(result!.tiles.length).toBe(3);
  });

  it('creates shang when a sequence exists', () => {
    const hand = [makeTile('sou',4,1), makeTile('sou',5,2), makeTile('sou',6,3), makeTile('wan',2,4)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('shang');
    expect(result!.tiles.map(t => t.value).sort((a,b)=>a-b)).toEqual([4,5,6]);
  });

  it('returns null when no valid group exists', () => {
    const hand = [makeTile('wan',1,1), makeTile('wan',2,2), makeTile('wan',4,3)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).toBeNull();
  });
});
