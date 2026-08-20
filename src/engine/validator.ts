import { Tile, CalculationResult } from '../types/mahjong';

/*
  validator.ts — fan calculation and hand-structure validation

  Purpose and conventions
  - This module validates a mahjong hand and computes a simple "fan" (point) summary.
  - Tile encoding: Tile objects use { suit: 'wan'|'tong'|'sou'|'wind'|'dragon'|'flower', value: number }.
    Keys used in maps are `${suit}_${value}` (e.g. 'wan_5', 'wind_1'). Flowers use suit === 'flower'.
  - meldMap: a record of declared melds (melds taken/declared by player). MeldEntry.kind values:
      - 'kong'   : four-tile kong (can be concealed or declared)
      - 'pung'   : three-of-a-kind meld (exposed)
      - 'shang'  : sequence meld (usually exposed)
      - 'flower' : flower tiles grouped as melds (do NOT count toward required tile total)
    Each MeldEntry has `tiles: Tile[]` and optional `concealed: boolean` (for concealed kongs).

  Counting rules and assumptions implemented here
  - The required total for a winning hand (standard 5 melds + 1 pair) is 17 tiles in hand+melds,
    with each declared kong consuming an extra tile (so total needed = 17 + kongCount).
  - Flower melds do NOT count toward the 17-tile requirement but are included in `allTiles` for
    rule checks that consider flowers explicitly.
  - Only kongs declared in meldMap count as kongs. Four identical tiles still in the concealed hand
    are NOT treated as a kong unless moved into meldMap.
  - Tile-type limits: non-flower tiles may not exceed 4 copies across hand + melds (basic integrity check).

  Structure and extension points for fan rules
  - This file currently computes a minimal fan breakdown:
      * Base point (always present)
      * +1 for any honor tiles present (wind/dragon)
      * +1 for zimo (self draw) when huIsZimo is true
      * +1 per concealed kong declared in meldMap
  - To add more fan rules, follow these guidelines:
      1) Compute any helper summaries early (e.g. `allTiles`, `counts`, `meldMap` summary values).
      2) Add deterministic checks that do not depend on specific winning partitioning (e.g. all-chows,
         suits present/absent, presence of terminals/honors) before or after the winning-structure
         validation as appropriate. Document whether the rule requires the hand to be a valid winning
         hand (some rules only apply on actual winning hands).
      3) For rules that depend on the winning decomposition (e.g. all pungs, pure hand, seven pairs,
         thirteen orphans), compute them using `possibleCombinations` when `shouldValidateWinning` is true
         and include clear comments about which decomposition(s) qualify.
      4) Keep each rule's check isolated and append to `breakdown` with a descriptive `rule` label and
         `fan` value so the UI can show the reasoning.

  Example fan rules to add (TODO list)
  - all-pungs (全刻) : +X fan when hand consists only of pungs/kongs + pair
  - pure-suit (清一色) : +X fan when only one suit (no honors)
  - mixed-one-suit-with-honors (混一色) : +X fan
  - half-flush / full-flush variations
  - small- and big-dragon (小/大三元) : based on dragon triplets
  - all-honors (字一色) : only honor tiles
  - seven pairs (七對) : special structure, not covered by standard meld partitioning
  - thirteen orphans (十三么) : special terminals/honors pattern
  - pure-chow (平胡 / 門前清/清一色 的組合差異) : chows-only variants
  - rob-the-kong (搶槓), seat/wind/round-based bonuses (depends on game context)
  - limit hands / yakuman-style rules (大役) : highest-value special hands

  Implementation notes
  - The combination collector (`collectMeldCombinations`) and canonicalization logic are helpful when
    checking rules that require knowing which melds were used. They produce human-readable tokens like
    '1萬-2萬-3萬' and '5筒x3' and a canonicalized string for uniqueness.
  - For performance: `collectMeldCombinations` explores possible decompositions; for very large inputs
    this could be constrained. When adding rules that only need to know existence of a decomposition,
    prefer boolean checks like `canFormMelds` which prune earlier.
  - Wherever a new rule requires game-state (seat wind, prevailing wind, discarder, scoring mode),
    extend the function signature to accept an options object rather than adding many new parameters.

  Next steps for development
  - Start by grafting simple, decomposition-free rules (pure-suit, honors-only, terminals-only).
  - Implement special-structure detectors (seven pairs, thirteen orphans) as separate helper functions
    and make them short-circuit the normal decomposition logic when their patterns match.
  - Add unit tests covering representative hands for each new fan rule.
*/

type MeldEntry = { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[]; concealed?: boolean };

function getDeclaredKongCount(meldMap?: Record<string, MeldEntry>): number {
  // Rule: only tiles that are explicitly declared as a kong meld count as a kong.
  // Four identical tiles still in hand are not a kong unless they are moved into meldMap.
  return meldMap ? Object.values(meldMap).filter(m => m.kind === 'kong').length : 0;
}

export function calculateHandFan(
  handTiles: Tile[],
  meldMap?: Record<string, MeldEntry>,
  huIsZimo?: boolean,
  huTile?: Tile,
  gameContext?: { prevailingWind?: 'east' | 'south' | 'west' | 'north'; seatWind?: 'east' | 'south' | 'west' | 'north' }
): CalculationResult {
  // include meld tiles when validating total tile count; flower melds do NOT count toward the 17-tile requirement
  const meldTilesAll: Tile[] = [];
  const meldTilesCounted: Tile[] = [];
  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      meldTilesAll.push(...m.tiles);
      if (m.kind !== 'flower') meldTilesCounted.push(...m.tiles);
    });
  }
  const countedTiles = [...handTiles, ...meldTilesCounted];

  // Game context (optional)
  // - prevailingWind and seatWind are strings: 'east'|'south'|'west'|'north'
  // - This function will accept them and make them available for fan-rule decisions.
  // - Currently we do NOT apply any automatic fan for winds here; these are exposed so
  //   future fan rules can reference them. See comments in the header for guidance.
  const prevailingWind = gameContext?.prevailingWind;
  const seatWind = gameContext?.seatWind;
  // Account for kongs: some rules allow an extra tile per kong (kong consumes an extra tile).
  // IMPORTANT: a four-of-a-kind left in hand is NOT a kong unless it is declared in meldMap.
  const kongCount = getDeclaredKongCount(meldMap);

  // Count all tiles including flowers for per-type limits
  const counts = new Map<string, number>();
  const allTiles = [...handTiles, ...meldTilesAll];
  allTiles.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  // Separate wind and dragon melds for potential scoring rules that depend on them
  const windMelds: MeldEntry[] = [];
  const dragonMelds: MeldEntry[] = [];

  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      if (m.kind === 'flower' || m.kind === 'shang' || !m.tiles.length) return;

      const suit = m.tiles[0].suit;
      if (suit === 'wind') windMelds.push(m);
      if (suit === 'dragon') dragonMelds.push(m);
    });
  }

  // If the UI calls calculate only when counted total matches expected, perform winning-structure validation then.
  const shouldValidateWinning = countedTiles.length === 17 + kongCount;

  for (const [key, count] of counts.entries()) {
    if (!key.startsWith('flower') && count > 4) {
      return {
        isValid: false,
        totalFan: 0,
        reason: `無效手牌：牌型 [${key}] 超過 4 張限制。`,
        breakdown: []
      };
    }
  }

  // For winning structure validation we expect total non-flower counted tiles to equal
  // 17 + number_of_kongs (5 melds + a pair = 17 tiles; each kong consumes an extra tile).
  const totalTilesNeeded = 17 + kongCount;

  if (countedTiles.length < totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，需滿 ${totalTilesNeeded} 張 (完成 5 組與一對，含 ${kongCount} 個槓) 才可計算。`,
      breakdown: []
    };
  }
  if (countedTiles.length > totalTilesNeeded) {
    return {
      isValid: false,
      totalFan: 0,
      reason: `目前手牌共有 ${countedTiles.length} 張，超出允許的上限 ${totalTilesNeeded} 張（含 ${kongCount} 個槓）。`,
      breakdown: []
    };
  }

  let possibleCombinations: string[] | undefined;
  // huWaitFlags: set during winning-structure validation when huTile is provided.
  // It is declared here so the final scoring section can reference it.
  let huWaitFlags: { pairWait: boolean; closedWait: boolean } | undefined = undefined;

  // If the caller (UI) indicated strict validation (countedTiles matches UI expectations), validate winning hand structure.
  if (shouldValidateWinning) {
    // Validate winning hand structure: with existing melds, remaining tiles must be partitionable into
    // the remaining number of melds and exactly one pair. Standard rule: total melds == 5 (kongs count as one meld).
    const nonFlowerMelds = meldMap ? Object.values(meldMap).filter(m => m.kind !== 'flower') : [];
    const existingMeldCount = nonFlowerMelds.length;
    const neededMelds = 5 - existingMeldCount;

    if (neededMelds < 0) {
      return { isValid: false, totalFan: 0, reason: '成組數量超過允許的 5 組，無法計算。', breakdown: [] };
    }

    const remainingTiles = handTiles.slice(); // only handTiles were passed in (melds are in meldMap)
    const expectedRemaining = neededMelds * 3 + 2;
    if (remainingTiles.length !== expectedRemaining) {
      return { isValid: false, totalFan: 0, reason: `此手牌無法胡牌：剩餘 ${remainingTiles.length} 張，預期 ${expectedRemaining} 張以構成 ${neededMelds} 組與一對。`, breakdown: [] };
    }

    // build counts map for remaining tiles
    const remainingCounts = new Map<string, number>();
    remainingTiles.forEach(t => {
      const key = `${t.suit}_${t.value}`;
      remainingCounts.set(key, (remainingCounts.get(key) || 0) + 1);
    });

    // helper: recursively check whether counts can be reduced entirely into melds (triplets or sequences)
    const cloneCounts = (src: Map<string, number>) => new Map(src);

    function removeTiles(countMap: Map<string, number>, tiles: string[]): Map<string, number> | null {
      const next = cloneCounts(countMap);
      for (const tile of tiles) {
        const nextValue = (next.get(tile) || 0) - 1;
        if (nextValue < 0) {
          return null;
        }
        if (nextValue === 0) {
          next.delete(tile);
        } else {
          next.set(tile, nextValue);
        }
      }
      return next;
    }

    function tileLabel(tile: string): string {
      const [suit, valueStr] = tile.split('_');
      const value = Number(valueStr);
      const suitLabel = suit === 'wan' ? '萬' : suit === 'tong' ? '筒' : suit === 'sou' ? '索' : suit === 'wind' ? '風' : suit === 'dragon' ? '字' : '';
      return `${value}${suitLabel}`;
    }

    function meldLabel(tiles: string[]): string {
      const ordered = [...tiles].sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
      const labels = ordered.map(tileLabel);

      if (ordered.length === 3 && ordered.every(tile => tile.split('_')[1] === ordered[0].split('_')[1])) {
        return `${tileLabel(ordered[0])}x3`;
      }

      if (ordered.length === 3) {
        return labels.join('-');
      }

      if (ordered.length === 2) {
        return `${tileLabel(ordered[0])}x2`;
      }

      return labels.join('-');
    }

    function normalizeMeldPart(part: string): { sortKey: number; pair: boolean; token: string } {
      const suitMatch = part.match(/[萬筒索風字]/)?.[0] ?? '';
      const numbers = [...part.matchAll(/\d+/g)].map(Number);
      const firstNumber = numbers[0] ?? 0;

      if (part.includes('x3')) {
        return { sortKey: firstNumber, pair: false, token: `${firstNumber}${suitMatch}x3` };
      }

      if (part.includes('x2')) {
        return { sortKey: firstNumber, pair: true, token: `${firstNumber}${suitMatch}x2` };
      }

      const normalizedNumbers = [...numbers].sort((a, b) => a - b);
      return {
        sortKey: normalizedNumbers[0] ?? 0,
        pair: false,
        token: normalizedNumbers.map(value => `${value}${suitMatch}`).join('-')
      };
    }

    function canonicalizeCombination(combo: string): string {
      const parts = combo.split(', ').map(normalizeMeldPart).sort((a, b) => {
        if (a.pair && !b.pair) return 1;
        if (!a.pair && b.pair) return -1;
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;

        const aRank = a.token.includes('x3') ? 0 : a.token.includes('x2') ? 2 : 1;
        const bRank = b.token.includes('x3') ? 0 : b.token.includes('x2') ? 2 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return a.token.localeCompare(b.token);
      });

      return parts.map(part => part.token).join(', ');
    }

    function collectMeldCombinations(countMap: Map<string, number>, visited = new Set<string>(), current: string[] = []): string[][] {
      const stateKey = [...countMap.entries()]
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tile, count]) => `${tile}:${count}`)
        .join('|');

      if (visited.has(stateKey)) return [];
      visited.add(stateKey);

      if (![...countMap.values()].some(value => value > 0)) {
        return [current.slice()];
      }

      const results: string[][] = [];

      for (const [tile, count] of countMap.entries()) {
        if ((count || 0) <= 0) continue;

        const [suit, valStr] = tile.split('_');
        const value = Number(valStr);

        if (count >= 3) {
          const tripletNext = removeTiles(countMap, [tile, tile, tile]);
          if (tripletNext) {
            const grouped = collectMeldCombinations(tripletNext, new Set(visited), [...current, meldLabel([tile, tile, tile])]);
            results.push(...grouped);
          }
        }

        if (suit === 'wan' || suit === 'tong' || suit === 'sou') {
          const seqPatterns = [
            [value, value + 1, value + 2],
            [value - 2, value - 1, value]
          ];

          for (const [a, b, c] of seqPatterns) {
            if (a < 1 || b > 9 || c < 1 || c > 9) continue;
            const sequenceTiles = [`${suit}_${a}`, `${suit}_${b}`, `${suit}_${c}`];
            if (sequenceTiles.every(key => (countMap.get(key) || 0) > 0)) {
              const sequenceNext = removeTiles(countMap, sequenceTiles);
              if (sequenceNext) {
                const grouped = collectMeldCombinations(sequenceNext, new Set(visited), [...current, meldLabel(sequenceTiles)]);
                results.push(...grouped);
              }
            }
          }
        }
      }

      return results.length > 0 ? results : [];
    }

    function canFormMelds(countMap: Map<string, number>, visited = new Set<string>()): boolean {
      const stateKey = [...countMap.entries()]
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tile, count]) => `${tile}:${count}`)
        .join('|');

      if (visited.has(stateKey)) return false;
      visited.add(stateKey);

      if (![...countMap.values()].some(value => value > 0)) return true;

      for (const [tile, count] of countMap.entries()) {
        if ((count || 0) <= 0) continue;

        const [suit, valStr] = tile.split('_');
        const value = Number(valStr);

        if (count >= 3) {
          const tripletNext = removeTiles(countMap, [tile, tile, tile]);
          if (tripletNext && canFormMelds(tripletNext, new Set(visited))) return true;
        }

        if (suit === 'wan' || suit === 'tong' || suit === 'sou') {
          const seqPatterns = [
            [value, value + 1, value + 2],
            [value - 2, value - 1, value]
          ];

          for (const [a, b, c] of seqPatterns) {
            if (a < 1 || b > 9 || c < 1 || c > 9) continue;
            const sequenceTiles = [`${suit}_${a}`, `${suit}_${b}`, `${suit}_${c}`];
            if (sequenceTiles.every(key => (countMap.get(key) || 0) > 0)) {
              const sequenceNext = removeTiles(countMap, sequenceTiles);
              if (sequenceNext && canFormMelds(sequenceNext, new Set(visited))) return true;
            }
          }
        }
      }

      return false;
    }

    // Try every possible pair in remainingCounts
    let winning = false;
    const validCombinations: string[] = [];
    for (const [k, c] of remainingCounts.entries()) {
      if (c >= 2) {
        const copy = cloneCounts(remainingCounts);
        copy.set(k, c - 2);
        if (canFormMelds(copy)) {
          winning = true;
          const pairLabel = tileLabel(k) + 'x2';
          const decomposition = collectMeldCombinations(copy)
            .map(melds => {
              const meldParts = [...melds].sort((a, b) => {
                const aNum = Number((a.match(/\d+/) || ['0'])[0]);
                const bNum = Number((b.match(/\d+/) || ['0'])[0]);
                return aNum - bNum;
              });
              return [...meldParts, pairLabel].sort((a, b) => {
                const aIsPair = a.includes('x2');
                const bIsPair = b.includes('x2');
                if (aIsPair && !bIsPair) return 1;
                if (!aIsPair && bIsPair) return -1;
                const aNum = Number((a.match(/\d+/) || ['0'])[0]);
                const bNum = Number((b.match(/\d+/) || ['0'])[0]);
                return aNum - bNum;
              }).join(', ');
            });
          validCombinations.push(...decomposition);
        }
      }
    }

    possibleCombinations = [...new Set(validCombinations.map(canonicalizeCombination))].sort((a, b) => {
      const aParts = a.split(', ');
      const bParts = b.split(', ');
      const aKey = aParts.map(part => Number((part.match(/\d+/) || ['0'])[0])).join('|');
      const bKey = bParts.map(part => Number((part.match(/\d+/) || ['0'])[0])).join('|');
      return aKey.localeCompare(bKey);
    });

    if (!winning) {
      return { isValid: false, totalFan: 0, reason: '此手牌無法胡牌：無法將剩餘牌拆解為完整的組合與一對。', breakdown: [] };
    }

    // hu wait detection (pair-wait / single wait: 單騎, and closed-middle wait: 卡張)
    // These flags are set by simulating the tile counts BEFORE the hu tile was added
    // and checking whether removing the companion tiles leaves a partitionable remainder.
    // The code uses existing helpers: cloneCounts, canFormMelds.
    huWaitFlags = { pairWait: false, closedWait: false };

    if (huTile) {
      const huKey = `${huTile.suit}_${huTile.value}`;

      // countsWithoutHu represents tile counts before the hu tile was added.
      const countsWithoutHu = cloneCounts(remainingCounts);
      // If handTiles already included the hu tile (typical caller behavior), remove one copy
      if ((countsWithoutHu.get(huKey) || 0) > 0) {
        const newVal = (countsWithoutHu.get(huKey) || 0) - 1;
        if (newVal > 0) countsWithoutHu.set(huKey, newVal);
        else countsWithoutHu.delete(huKey);
      }

      // 1) Pair wait (單騎 / tanki): if there is at least one identical tile and removing it leaves valid melds
      if ((countsWithoutHu.get(huKey) || 0) >= 1) {
        const copy = cloneCounts(countsWithoutHu);
        const c = (copy.get(huKey) || 0) - 1;
        if (c > 0) copy.set(huKey, c); else copy.delete(huKey);

        if (canFormMelds(copy)) {
          huWaitFlags.pairWait = true;
        }
      }

      // 2) Closed-middle (卡張): hu tile completes the middle of a sequence => neighbors must exist
      const [suit, valStr] = huKey.split('_');
      const val = Number(valStr);
      if (['wan', 'tong', 'sou'].includes(suit)) {
        const leftKey = `${suit}_${val - 1}`;
        const rightKey = `${suit}_${val + 1}`;
        if ((countsWithoutHu.get(leftKey) || 0) >= 1 && (countsWithoutHu.get(rightKey) || 0) >= 1) {
          const copy2 = cloneCounts(countsWithoutHu);
          // remove left
          const lc = (copy2.get(leftKey) || 0) - 1;
          if (lc > 0) copy2.set(leftKey, lc); else copy2.delete(leftKey);
          // remove right
          const rc = (copy2.get(rightKey) || 0) - 1;
          if (rc > 0) copy2.set(rightKey, rc); else copy2.delete(rightKey);

          if (canFormMelds(copy2)) {
            huWaitFlags.closedWait = true;
          }
        }
      }
    }
  }

  const breakdown: { rule: string; fan: number }[] = [];
  let totalFan = 0;//1;
  //breakdown.push({ rule: '底番 (Base Point)', fan: 1 });

  // wind and dragon melds for potential scoring
  const windValueMap: Record<'east'|'south'|'west'|'north', number> = {
    east: 1,
    south: 2,
    west: 3,
    north: 4
  };

  let windFan = 0;
  let dragonFan = 0;
  // If seatWind can be undefined or unknown string, provide a fallback or optional check
  const seatWindNum = seatWind ? windValueMap[seatWind] : undefined;
  // If prevailingWind can be undefined or unknown string, provide a fallback or optional check
  const prevailingWindNum = prevailingWind ? windValueMap[prevailingWind] : undefined;

  // Count declared melds (meldMap) as before
  for (const meld of windMelds) {
    const windValue = meld.tiles[0].value;
    if (windValue === seatWindNum) {
      windFan += 1;
      breakdown.push({ rule: '正字 (座位)', fan: 1 });
    }
    if (windValue === prevailingWindNum) {
      windFan += 1;
      breakdown.push({ rule: '正字 (場風)', fan: 1 });
    }
    if (windValue === 1) {
      windFan += 1;
      breakdown.push({ rule: '字牌 (東)', fan: 1 });
    }
    else if (windValue === 2) {
      windFan += 1;
      breakdown.push({ rule: '字牌 (南)', fan: 1 });
    }
    else if (windValue === 3) {
      windFan += 1;
      breakdown.push({ rule: '字牌 (西)', fan: 1 });
    }
    else if (windValue === 4) {
      windFan += 1;
      breakdown.push({ rule: '字牌 (北)', fan: 1 });
    }
  }

  for (const meld of dragonMelds) {
    const dragonValue = meld.tiles[0].value;
    if (dragonValue === 5) {
      dragonFan += 1;
      breakdown.push({ rule: '字牌 (中)', fan: 1 });
    }
    else if (dragonValue === 6) {
      dragonFan += 1;
      breakdown.push({ rule: '字牌 (發)', fan: 1 });
    }
    else if (dragonValue === 7) {
      dragonFan += 1;
      breakdown.push({ rule: '字牌 (白)', fan: 1 });
    }
  }

  // If the concealed hand (remaining hand tiles) can form melds that include wind/dragon triplets,
  // they should also contribute to fan. possibleCombinations contains canonicalized decomposition
  // strings for the concealed tiles (if shouldValidateWinning was true). Analyze those decompositions
  // and pick the one that yields the maximum honor-related fan (this matches choosing a winning
  // decomposition that maximizes fan).
  if (possibleCombinations && possibleCombinations.length > 0) {
    let bestExtraFan = 0;
    let bestBreakdownToAdd: { rule: string; fan: number }[] = [];

    for (const combo of possibleCombinations) {
      let comboWindExtra = 0;
      let comboDragonExtra = 0;
      const comboBreakdown: { rule: string; fan: number }[] = [];

      const parts = combo.split(', ');
      for (const part of parts) {
        // Triplets are labeled with 'x3' (e.g. '1風x3', '5字x3')
        if (!part.includes('x3')) continue;

        // wind triplets
        if (part.includes('風')) {
          const match = part.match(/(\d+)/);
          const val = match ? Number(match[1]) : NaN;
          if (!Number.isNaN(val)) {
            // seat / prevailing
            if (val === seatWindNum) {
              comboWindExtra += 1;
              comboBreakdown.push({ rule: '正字 (座位)', fan: 1 });
            }
            if (val === prevailingWindNum) {
              comboWindExtra += 1;
              comboBreakdown.push({ rule: '正字 (場風)', fan: 1 });
            }
            comboWindExtra += 1; // base for having a wind triplet
            if (val === 1) { comboWindExtra += 1; comboBreakdown.push({ rule: '字牌 (東)', fan: 1 }); }
            else if (val === 2) { comboWindExtra += 1; comboBreakdown.push({ rule: '字牌 (南)', fan: 1 }); }
            else if (val === 3) { comboWindExtra += 1; comboBreakdown.push({ rule: '字牌 (西)', fan: 1 }); }
            else if (val === 4) { comboWindExtra += 1; comboBreakdown.push({ rule: '字牌 (北)', fan: 1 }); }
          }
        }

        // dragon triplets
        if (part.includes('字')) {
          const match = part.match(/(\d+)/);
          const val = match ? Number(match[1]) : NaN;
          if (!Number.isNaN(val)) {
            if (val === 5) { comboDragonExtra += 1; comboBreakdown.push({ rule: '字牌 (中)', fan: 1 }); }
            else if (val === 6) { comboDragonExtra += 1; comboBreakdown.push({ rule: '字牌 (發)', fan: 1 }); }
            else if (val === 7) { comboDragonExtra += 1; comboBreakdown.push({ rule: '字牌 (白)', fan: 1 }); }
          }
        }
      }

      const comboTotal = comboWindExtra + comboDragonExtra;
      if (comboTotal > bestExtraFan) {
        bestExtraFan = comboTotal;
        bestBreakdownToAdd = comboBreakdown;
      }
    }

    if (bestExtraFan > 0) {
      totalFan += bestExtraFan;
      // append the breakdown entries (may contain duplicates across multiple melds)
      for (const e of bestBreakdownToAdd) breakdown.push(e);
    }
  }

  totalFan += windFan + dragonFan;

  // 自摸 (zimo) grants +1 fan
  if (huIsZimo) {
    totalFan += 1;
    breakdown.push({ rule: '自摸 (Zimo)', fan: 1 });
  }

  // 暗槓 (concealed kong) grants +1 fan each
  if (meldMap) {
    const concealedKongs = Object.values(meldMap).filter(m => m.kind === 'kong' && m.concealed).length;
    if (concealedKongs > 0) {
      totalFan += concealedKongs;
      breakdown.push({ rule: `暗槓 x${concealedKongs}`, fan: concealedKongs });
    }
  }

  // Hu-wait based fans (requires huTile and successful winning-structure validation)
  // - 單騎 (pair wait): huTile paired an existing single tile (單騎) => +1 fan
  // - 卡張 (closed-middle): huTile completed the middle of a sequence (x-? - x+?) => +1 fan
  if (huWaitFlags) {
    if (huWaitFlags.pairWait) {
      totalFan += 1;
      breakdown.push({ rule: '單騎 (Pair wait)', fan: 1 });
    } else if (huWaitFlags.closedWait) {
      totalFan += 1;
      breakdown.push({ rule: '卡張 (Closed-middle wait)', fan: 1 });
    }
  }

  return {
    isValid: true,
    totalFan,
    breakdown,
    possibleCombinations
  };
}
