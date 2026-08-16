import { describe, it, expect, vi } from 'vitest';
import { Tile } from '../src/types/mahjong';

function makeTile(suit: string, value: number, idSuffix: number): Tile {
  return { id: `${suit}_${value}_${idSuffix}`, suit: suit as any, value, label: `${value}${suit}` };
}

// Recreate minimal parts of App behaviour needed for auto-create meld
function autoCreateMeldFromHand(hand: Tile[]) {
  // New behaviour: scan hand positions in order and at each position try kong > pung > shang
  for (let i = 0; i < hand.length; i++) {
    // try kong at this position
    if (i <= hand.length - 4) {
      const slice4 = hand.slice(i, i + 4);
      if (slice4.length === 4 && slice4.every(t => t.suit === slice4[0].suit && t.value === slice4[0].value)) {
        const k = `${slice4[0].suit}_${slice4[0].value}`;
        return { kind: 'kong', key: `${k}@kong`, tiles: slice4, remaining: hand.filter(t => !slice4.some(x => x.id === t.id)) };
      }
    }

    // try pung at this position
    if (i <= hand.length - 3) {
      const slice3 = hand.slice(i, i + 3);
      if (slice3.length === 3 && slice3.every(t => t.suit === slice3[0].suit && t.value === slice3[0].value)) {
        const k = `${slice3[0].suit}_${slice3[0].value}`;
        return { kind: 'pung', key: `${k}@pung`, tiles: slice3, remaining: hand.filter(t => !slice3.some(x => x.id === t.id)) };
      }
    }

    // try shang at this position
    if (i <= hand.length - 3) {
      const slice = hand.slice(i, i + 3);
      if (slice.length >= 3) {
        const suit = slice[0].suit;
        if (slice.every(t => t.suit === suit)) {
          const vals = slice.map(t => t.value).slice().sort((a, b) => a - b);
          if (vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1) {
            const seqKey = `${suit}_${vals[0]}`;
            return { kind: 'shang', key: `${seqKey}@shang`, tiles: slice, remaining: hand.filter(t => !slice.some(x => x.id === t.id)) };
          }
        }
      }
    }
  }

  // fallback: no window-based match found
  // try kong/pung by counts
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

  it('prefers earliest window: uses early sequence over later kong', () => {
    // early 1-2-3 sequence at positions 0..2, but later there is a kong of 3s
    const hand = [makeTile('wan',1,1), makeTile('wan',2,2), makeTile('wan',3,3), makeTile('wan',3,4), makeTile('wan',3,5), makeTile('wan',3,6)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).not.toBeNull();
    // Should pick the early shang (1-2-3) rather than the later kong of 3s
    expect(result!.kind).toBe('shang');
    expect(result!.tiles.map(t => t.value).sort((a,b)=>a-b)).toEqual([1,2,3]);
  });

  it('returns null when no valid group exists', () => {
    const hand = [makeTile('wan',1,1), makeTile('wan',2,2), makeTile('wan',4,3)];
    const result = autoCreateMeldFromHand(hand);
    expect(result).toBeNull();
  });

  it('creates two identical sequences when two windows exist', () => {
    // hand contains two 1-2-3 sequences
    const hand = [
      makeTile('wan',1,1), makeTile('wan',2,2), makeTile('wan',3,3),
      makeTile('wan',1,4), makeTile('wan',2,5), makeTile('wan',3,6)
    ];
    const first = autoCreateMeldFromHand(hand);
    expect(first).not.toBeNull();
    expect(first!.kind).toBe('shang');
    const second = autoCreateMeldFromHand(first!.remaining);
    expect(second).not.toBeNull();
    expect(second!.kind).toBe('shang');
    expect(second!.remaining.length).toBe(0);
  });
});
