import { useState } from 'react';
import { Tile, CalculationResult } from './types/mahjong';
import { TilePicker } from './components/TilePicker';
import { HandRack } from './components/HandRack';
import { ResultCard } from './components/ResultCard';
import { calculateHandFan } from './engine/validator';
import { HuArea } from './components/HuArea';
import MeldArea from './components/MeldArea';
import ErrorDialog from './components/ErrorDialog';
import WindSelector from './components/WindSelector';

const MAX_TILES_PER_TYPE = 4;

function getTileCount(hand: Tile[], tile: Tile): number {
  return hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
}

export default function App() {
  const [hand, setHand] = useState<Tile[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [huTileId, setHuTileId] = useState<string | null>(null);
  const [huIsZimo, setHuIsZimo] = useState<boolean>(false);
  const huTile = hand.find(t => t.id === huTileId) || null;
  // declared melds tracked in meldMap
  const [meldMap, setMeldMap] = useState<Record<string, { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[]; concealed?: boolean }>>({});
  const [selection, setSelection] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createMeldFromSelection = () => {
    // auto-detect kind from selection: kong > pung > shang
    setErrorMessage(null);
    const tiles = hand.filter(t => selection.includes(t.id));

    // If nothing selected, attempt to find any valid group in the hand automatically
    if (tiles.length === 0) {
      // New rule: prefer forming groups from the first matching window in hand order.
      // Iterate hand positions in order and at each position prefer kong > pung > shang for that window.
      for (let i = 0; i < hand.length; i++) {
        // try kong at this position
        if (i <= hand.length - 4) {
          const slice4 = hand.slice(i, i + 4);
          if (slice4.length === 4 && slice4.every(t => t.suit === slice4[0].suit && t.value === slice4[0].value)) {
            const baseKey = `${slice4[0].suit}_${slice4[0].value}`;
            const storageKey = `${baseKey}@kong`;
            setHand(prev => {
              const copy = [...prev];
              copy.splice(i, 4);
              return copy;
            });
            setMeldMap(prev => { let key = storageKey; let i = 1; while (prev[key]) { key = `${storageKey}.${i++}`; } return { ...prev, [key]: { kind: 'kong', tiles: slice4, concealed: false } }; });
            setResult(null);
            return;
          }
        }

        // try pung at this position
        if (i <= hand.length - 3) {
          const slice3 = hand.slice(i, i + 3);
          if (slice3.length === 3 && slice3.every(t => t.suit === slice3[0].suit && t.value === slice3[0].value)) {
            const baseKey = `${slice3[0].suit}_${slice3[0].value}`;
            const storageKey = `${baseKey}@pung`;
            setHand(prev => {
              const copy = [...prev];
              copy.splice(i, 3);
              return copy;
            });
            setMeldMap(prev => { let key = storageKey; let i = 1; while (prev[key]) { key = `${storageKey}.${i++}`; } return { ...prev, [key]: { kind: 'pung', tiles: slice3 } }; });
            setResult(null);
            return;
          }
        }

        // try shang (sequence) at this position
        if (i <= hand.length - 3) {
          const slice = hand.slice(i, i + 3);
          if (slice.length >= 3) {
            const suit = slice[0].suit;
            if (slice.every(t => t.suit === suit)) {
              const vals = slice.map(t => t.value).slice().sort((a, b) => a - b);
              if (vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1) {
                const seqKey = `${suit}_${vals[0]}`;
                const seqStorage = `${seqKey}@shang`;
                setHand(prev => {
                  const copy = [...prev];
                  copy.splice(i, 3);
                  return copy;
                });
                setMeldMap(prev => { let key = seqStorage; let i = 1; while (prev[key]) { key = `${seqStorage}.${i++}`; } return { ...prev, [key]: { kind: 'shang', tiles: slice } }; });
                setResult(null);
                return;
              }
            }
          }
        }
      }

      // Fallback: previous broader search (by counts and suit scanning)
      const countMap: Record<string, Tile[]> = {};
      for (const t of hand) {
        const k = `${t.suit}_${t.value}`;
        if (!countMap[k]) countMap[k] = [];
        countMap[k].push(t);
      }

      for (const [k, arr] of Object.entries(countMap)) {
        if (arr.length >= 4) {
          const baseKey = k;
          const storageKey = `${baseKey}@kong`;
          setHand(prev => prev.filter(t => !arr.slice(0, 4).some(x => x.id === t.id)));
          setMeldMap(prev => { let key = storageKey; let i = 1; while (prev[key]) { key = `${storageKey}.${i++}`; } return { ...prev, [key]: { kind: 'kong', tiles: arr.slice(0, 4), concealed: false } }; });
          setResult(null);
          return;
        }
      }

      for (const [k, arr] of Object.entries(countMap)) {
        if (arr.length >= 3) {
          const baseKey = k;
          const storageKey = `${baseKey}@pung`;
          setHand(prev => prev.filter(t => !arr.slice(0, 3).some(x => x.id === t.id)));
          setMeldMap(prev => { let key = storageKey; let i = 1; while (prev[key]) { key = `${storageKey}.${i++}`; } return { ...prev, [key]: { kind: 'pung', tiles: arr.slice(0, 3) } }; });
          setResult(null);
          return;
        }
      }

      const suits = Array.from(new Set(hand.map(t => t.suit)));
      for (const suit of suits) {
        // only numeric suits can form sequences
        const vals = hand.filter(t => t.suit === suit).map(t => ({ id: t.id, value: t.value }));
        if (vals.length < 3) continue;
        for (let start = 1; start <= 7; start++) {
          const need = [start, start + 1, start + 2];
          const taken: Tile[] = [];
          const remaining: Tile[] = [];
          for (const t of hand) {
            if (t.suit === suit && need.includes(t.value) && !taken.some(x => x.value === t.value && x.suit === t.suit)) {
              taken.push(t);
            } else {
              remaining.push(t);
            }
          }
          if (taken.length === 3) {
            const seqKey = `${suit}_${start}`;
            const seqStorage = `${seqKey}@shang`;
            setHand(remaining);
            setMeldMap(prev => { let key = seqStorage; let i = 1; while (prev[key]) { key = `${seqStorage}.${i++}`; } return { ...prev, [key]: { kind: 'shang', tiles: taken } }; });
            setResult(null);
            return;
          }
        }
      }

      setErrorMessage('請先選擇牌或手牌中沒有可成的組（3/4 張相同或 3 張順子）。');
      return;

    }

    // If selection exists, fall back to previous behaviour (detect kong/pung/shang from selection)

    // detect kong
    const first = tiles[0];
    const allSame = tiles.every(t => t.suit === first.suit && t.value === first.value);
    if (tiles.length === 4 && allSame) {
      const key = `${first.suit}_${first.value}`;
      const storageKey = `${key}@kong`;
      const remaining = hand.filter(t => !selection.includes(t.id));
      setHand(remaining);
      setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'kong', tiles, concealed: false } }));
      setSelection([]);
      setResult(null);
      return;
    }

    // detect pung
    if (tiles.length === 3 && allSame) {
      const key = `${first.suit}_${first.value}`;
      const storageKey = `${key}@pung`;
      const remaining = hand.filter(t => !selection.includes(t.id));
      setHand(remaining);
      setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'pung', tiles } }));
      setSelection([]);
      setResult(null);
      return;
    }

    // detect shang (sequence)
    if (tiles.length === 3) {
      const suit = tiles[0].suit;
      const vals = tiles.map(t => t.value).sort((a, b) => a - b);
      if (tiles.every(t => t.suit === suit) && vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1) {
        const seqKey = `${suit}_${vals[0]}`;
        const storageKey = `${seqKey}@shang`;
        const remaining = hand.filter(t => !selection.includes(t.id));
        setHand(remaining);
        setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'shang', tiles } }));
        setSelection([]);
        setResult(null);
        return;
      }
    }

    setErrorMessage('無法自動辨識成組類型；請確認選擇是否為 3/4 張相同或 3 張順子。');
  };

  const createHuFromSelection = () => {
    if (selection.length !== 1) {
      setErrorMessage('請選擇一張牌作為胡。');
      return;
    }
    const id = selection[0];
    setHuTileId(id);
    setSelection([]);
    setResult(null);
  };

  const handleSelectTile = (tile: Tile) => {
    setErrorMessage(null);

    // Check duplicate limit (flowers limited to 1)
    const isFlower = tile.suit === 'flower';
    const perTypeLimit = isFlower ? 1 : MAX_TILES_PER_TYPE;
    const currentCount = getTileCount(hand, tile);
    // include tiles already moved into melds for per-type limit
    const key = `${tile.suit}_${tile.value}`;
    const meldCountForKey = Object.values(meldMap).reduce((s, m) => s + m.tiles.filter(t => `${t.suit}_${t.value}` === key).length, 0);
    const totalCountForType = currentCount + meldCountForKey;

    if (totalCountForType >= perTypeLimit) {
      setErrorMessage(`「${tile.label}」已達上限 (最多 ${perTypeLimit} 張)，無法再加入。`);
      return;
    }

    // Check total tile limit (hand + melds). Flowers do NOT count toward total.
    const meldCount = Object.values(meldMap).reduce((s, m) => s + (m.kind === 'flower' ? 0 : m.tiles.length), 0);
    const totalTiles = hand.length + meldCount;
    const kongCount = Object.values(meldMap).filter(m => m.kind === 'kong').length;
    const totalLimit = 17 + kongCount;
    if (totalTiles >= totalLimit) {
      setErrorMessage(`已達總牌數上限 ${totalLimit} 張（包含已成組），請先移除或取消成組。`);
      return;
    }

    const updatedHand = [...hand, tile];
    setHand(updatedHand);

    // No automatic pung->kong upgrade any more. Upgrades must be explicit via UI.
  };

  const handleRemoveTile = (id: string) => {
    const updated = hand.filter(t => t.id !== id);
    setHand(updated);
    setResult(null);
    // clear hu if the hu tile was removed
    if (huTileId === id) setHuTileId(null);
  };

  // Hu is set via selection action `createHuFromSelection`

  const handleClear = () => {
    setHand([]);
    setResult(null);
    setErrorMessage(null);
    setMeldMap({});
  };

  function createOrToggleMeld(key: string, kind: 'kong' | 'pung' | 'shang') {
    // Normalize key and decide whether caller passed a full storage key (with @kind)
    const baseKey = key.includes('@') ? key.split('@')[0] : key;
    const storageKey = key.includes('@') ? key : `${baseKey}@${kind}`;

    // Special handling for 'shang' (sequence)
    if (kind === 'shang') {
      const [suit, valStr] = baseKey.split('_');
      const value = parseInt(valStr, 10);

      // If caller passed an exact meld key, remove that exact meld
      if (key.includes('@') && meldMap[key] && meldMap[key].kind === 'shang') {
        const tiles = meldMap[key].tiles;
        setHand(prev => [...prev, ...tiles]);
        setMeldMap(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        setResult(null);
        return;
      }

      // If any existing shang meld contains this tile, remove that meld
      const existingKey = Object.keys(meldMap).find(k => meldMap[k].kind === 'shang' && meldMap[k].tiles.some(t => `${t.suit}_${t.value}` === baseKey));
      if (existingKey) {
        const tiles = meldMap[existingKey].tiles;
        setHand(prev => [...prev, ...tiles]);
        setMeldMap(prev => {
          const copy = { ...prev };
          delete copy[existingKey];
          return copy;
        });
        setResult(null);
        return;
      }

      // Try to find a sequence of three that includes `value`
      for (let start = Math.max(1, value - 2); start <= Math.min(value, 7); start++) {
        const needVals = [start, start + 1, start + 2];
        const taken: Tile[] = [];
        const remaining: Tile[] = [];
        for (const t of hand) {
          if (t.suit === suit && needVals.includes(t.value) && !taken.some(x => x.id === t.id)) {
            const alreadyForValue = taken.find(x => x.value === t.value && x.suit === t.suit);
            if (!alreadyForValue) taken.push(t);
            else remaining.push(t);
          } else {
            remaining.push(t);
          }
        }

        if (taken.length === 3) {
          const seqKey = `${suit}_${start}`;
          const seqStorage = `${seqKey}@shang`;
          setHand(remaining);
          setMeldMap(prev => { let key = seqStorage; let i = 1; while (prev[key]) { key = `${seqStorage}.${i++}`; } return { ...prev, [key]: { kind: 'shang', tiles: taken } }; });
          setResult(null);
          return;
        }
      }

      setErrorMessage(`無法標記為上：未找到包含此牌的順子 (例如 一二三)。`);
      return;
    }

    // For kong/pung: if exists under the storage key, remove it
    if (meldMap[storageKey]) {
      const tiles = meldMap[storageKey].tiles;
      setHand(prev => [...prev, ...tiles]);
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[storageKey];
        return copy;
      });
      setResult(null);
      return;
    }

    // create meld: pull tiles from hand (kong/pung require identical tiles)
    const need = kind === 'kong' ? 4 : 3;
    const taken: Tile[] = [];
    const remaining: Tile[] = [];
    for (const t of hand) {
      const k = `${t.suit}_${t.value}`;
      if (k === baseKey && taken.length < need) taken.push(t);
      else remaining.push(t);
    }
    if (taken.length < need) {
      setErrorMessage(`無法標記 ${baseKey} 為 ${kind}：手牌中沒有足夠的牌 (需要 ${need} 張)。`);
      return;
    }

    setHand(remaining);
    setMeldMap(prev => ({ ...prev, [storageKey]: { kind, tiles: taken } }));
    setResult(null);
  }

  const upgradePungToKong = (storageKey: string) => {
    const entry = meldMap[storageKey];
    if (!entry || entry.kind !== 'pung') return;
    // Need one matching tile in hand to complete kong
    const tileKey = `${entry.tiles[0].suit}_${entry.tiles[0].value}`;
    // Prefer consuming a tile from hand that's not currently set as hu
    const idx = hand.findIndex(t => `${t.suit}_${t.value}` === tileKey && t.id !== huTileId);
    if (idx !== -1) {
      const tileToMove = hand[idx];
      const remainingHand = [...hand.slice(0, idx), ...hand.slice(idx + 1)];
      // replace pung storageKey with kong storage key
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[storageKey];
        const baseKey = storageKey.split('@')[0];
        copy[`${baseKey}@kong`] = { kind: 'kong', tiles: [...entry.tiles, tileToMove] };
        return copy;
      });
      setHand(remainingHand);
      setResult(null);
      return;
    }

    // If no tile in hand, allow upgrade if there exists an unused tile (total occurrences < 4)
    const key = `${entry.tiles[0].suit}_${entry.tiles[0].value}`;
    const totalOccurrences = hand.filter(t => `${t.suit}_${t.value}` === key).length + Object.values(meldMap).flatMap(m => m.tiles).filter(t => `${t.suit}_${t.value}` === key).length + (huTileId ? (huTile && `${huTile.suit}_${huTile.value}` === key ? 1 : 0) : 0);
    if (totalOccurrences < 4) {
      // create a synthetic tile to represent the unseen 4th tile
      // helper to create Chinese label for synthetic tile
    const CHINESE_NUM = ['零','一','二','三','四','五','六','七','八','九'];
    const suitLabel = (s: string, v: number) => {
      if (s === 'wan') return `${CHINESE_NUM[v]}萬`;
      if (s === 'tong') return `${CHINESE_NUM[v]}筒`;
      if (s === 'sou') return `${CHINESE_NUM[v]}索`;
      if (s === 'wind') {
        const map: Record<number,string> = { 1: '東', 2: '南', 3: '西', 4: '北' };
        return map[v] || `${v}`;
      }
      if (s === 'dragon') {
        const map: Record<number,string> = { 5: '中', 6: '發', 7: '白' };
        return map[v] || `${v}`;
      }
      return `${v}${s}`;
    };
    const virtualTile: Tile = { id: `${entry.tiles[0].suit}_${entry.tiles[0].value}@virt${Date.now()}`, suit: entry.tiles[0].suit, value: entry.tiles[0].value, label: suitLabel(entry.tiles[0].suit, entry.tiles[0].value) };
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[storageKey];
        const baseKey = storageKey.split('@')[0];
        copy[`${baseKey}@kong`] = { kind: 'kong', tiles: [...entry.tiles, virtualTile] };
        return copy;
      });
      setResult(null);
      return;
    }

    setErrorMessage('手牌中沒有可用的相同牌來升級為槓。');
  };

  // Meld tiles are no longer clickable; keep no-op handler removed.

  const [prevalentWind, setPrevalentWind] = useState<'east'|'south'|'west'|'north'>('east');
  const [seatWind, setSeatWind] = useState<'east'|'south'|'west'|'north'>('east');

  const handleCalculate = () => {
    const res = calculateHandFan(hand, meldMap, huIsZimo);
    setResult(res);
    if (!res.isValid) {
      setErrorMessage(res.reason || '無法計算牌型。');
    } else {
      setErrorMessage(null);
    }
  };

  // compute counted total and kong count for button enabling and validator parity
  const countedTotalForCalculate = hand.length + Object.values(meldMap).reduce((s, m) => s + (m.kind === 'flower' ? 0 : m.tiles.length), 0);
  const kongCountForCalculate = Object.values(meldMap).filter(m => m.kind === 'kong').length;
  const canCalculate = (countedTotalForCalculate === 17 + kongCountForCalculate);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-emerald-400">港式台灣麻將 16張 算牌器 (hktwmjcal)</h1>
        <p className="text-slate-400 text-sm">Open Source HK Taiwanese Mahjong Fan Calculator</p>
      </header>

      <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />

      <div className="space-y-4">
        {/* Row 1: Melds */}
        <div>
            <MeldArea
              meldMap={meldMap}
              onToggleMeld={(k: string) => {
                const kind = meldMap[k]?.kind;
                if (!kind) return;
                // Allow removing flower melds directly (UI cancel on flowers should work)
                if (kind === 'flower') {
                  setMeldMap(prev => {
                    const copy = { ...prev };
                    delete copy[k];
                    return copy;
                  });
                  setResult(null);
                  return;
                }
                createOrToggleMeld(k, kind as 'kong' | 'pung' | 'shang');
              }}
              onUpgradePung={(k: string) => upgradePungToKong(k)}
              onToggleConcealed={(mk: string) => setMeldMap(prev => {
                const copy = { ...prev };
                if (!copy[mk] || copy[mk].kind !== 'kong') return prev;
                copy[mk] = { ...copy[mk], concealed: !copy[mk].concealed };
                return copy;
              })}
            />
        </div>

        {/* Row 2: Current hand (left) and Hu tile (right) */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
              <HandRack
                hand={hand}
                onRemoveTile={handleRemoveTile}
                huTileId={huTileId}
                onClear={handleClear}
                meldMap={meldMap}
                onToggleSelect={toggleSelect}
                selection={selection}
                totalTiles={hand.length + Object.values(meldMap).reduce((s, m) => s + (m.kind === 'flower' ? 0 : m.tiles.length), 0)}
                totalLimit={17 + Object.values(meldMap).filter(m => m.kind === 'kong').length}
              />
          </div>

          <div className="w-64">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="flex gap-2 mb-2">
                <button onClick={() => createMeldFromSelection()} className="flex-1 px-2 py-1 bg-emerald-600 text-white rounded">成組</button>
              </div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => createHuFromSelection()} className="flex-1 px-2 py-1 bg-amber-400 text-slate-900 rounded">Set 胡</button>
                <button onClick={() => { setSelection([]); setErrorMessage(null); }} className="flex-1 px-2 py-1 bg-slate-700 text-white rounded">Clear Selection</button>
              </div>
              <div className="text-slate-400 text-sm">已選：{selection.length} 張</div>
            </div>
          </div>

          <div className="w-40">
            <div className="space-y-2">
              <WindSelector prevalent={prevalentWind} seat={seatWind} onSetPrevalent={setPrevalentWind} onSetSeat={setSeatWind} />
            </div>
            <HuArea huTile={huTile} onClearHu={() => { setHuTileId(null); setHuIsZimo(false); }} huIsZimo={huIsZimo} onToggleZimo={(next: boolean) => setHuIsZimo(next)} />
          </div>
        </div>

        {/* Row 3: Tile selector (single column) */}
        <div>
          <TilePicker onSelectTile={handleSelectTile} onAddFlower={(t) => {
            // Add flower directly to melds as a 'flower' meld entry
            const key = `${t.suit}_${t.value}`;
            const storageKey = `${key}@flower`;
            setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'flower', tiles: (prev[storageKey]?.tiles || []).concat([t]) } }));
          }} hand={hand} meldMap={meldMap} />
          
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={handleCalculate}
          disabled={!canCalculate}
          className={
            `w-full md:w-auto px-10 py-3 font-bold text-lg rounded-xl shadow-lg transition ${!canCalculate ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'}`
          }
        >
          算番 (Calculate Fan)
        </button>
      </div>

      <ResultCard result={result} />
    </div>
  );
}
