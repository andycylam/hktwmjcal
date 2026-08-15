import { useState } from 'react';
import { Tile, CalculationResult } from './types/mahjong';
import { TilePicker } from './components/TilePicker';
import { HandRack } from './components/HandRack';
import { ResultCard } from './components/ResultCard';
import { calculateHandFan } from './engine/validator';
import { HuArea } from './components/HuArea';
import MeldArea from './components/MeldArea';
import ErrorDialog from './components/ErrorDialog';

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
  const [meldMap, setMeldMap] = useState<Record<string, { kind: 'kong' | 'pung' | 'shang'; tiles: Tile[]; concealed?: boolean }>>({});
  const [selection, setSelection] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createMeldFromSelection = () => {
    // auto-detect kind from selection: kong > pung > shang
    setErrorMessage(null);
    const tiles = hand.filter(t => selection.includes(t.id));
    if (tiles.length === 0) {
      setErrorMessage('請先選擇牌再按「成組」。');
      return;
    }

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

    // Check total tile limit (hand + melds). Base 17, each declared kong increases limit by 1.
    const meldCount = Object.values(meldMap).reduce((s, m) => s + m.tiles.length, 0);
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
    // Normalize key to always use a storage key with @kind suffix
    const baseKey = key.includes('@') ? key.split('@')[0] : key;
    const storageKey = `${baseKey}@${kind}`;

    // Special handling for 'shang' (sequence)
    if (kind === 'shang') {
      const [suit, valStr] = baseKey.split('_');
      const value = parseInt(valStr, 10);

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
          setMeldMap(prev => ({ ...prev, [seqStorage]: { kind: 'shang', tiles: taken } }));
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
    const idx = hand.findIndex(t => `${t.suit}_${t.value}` === tileKey);
    if (idx === -1) {
      setErrorMessage('手牌中沒有可用的相同牌來升級為槓。');
      return;
    }
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
  };

  const handleMeldTileClick = (meldKey: string, tileId: string) => {
    const entry = meldMap[meldKey];
    if (!entry) return;

    // If kong: downgrade to pung by removing one tile from meld back to hand
    if (entry.kind === 'kong') {
      // remove the clicked tile from meld and convert to pung (3 tiles)
      const remainingTiles = entry.tiles.filter(t => t.id !== tileId);
      const baseKey = meldKey.split('@')[0];
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[meldKey];
        // create pung entry
        copy[`${baseKey}@pung`] = { kind: 'pung', tiles: remainingTiles };
        return copy;
      });
      // add clicked tile back to hand (avoid duplicates)
      const tile = entry.tiles.find(t => t.id === tileId);
      if (tile) setHand(prev => {
        const ids = new Set(prev.map(t => t.id));
        if (ids.has(tile.id)) return prev;
        return [...prev, tile];
      });
      setResult(null);
      return;
    }

    // For pung or shang: remove the clicked tile from the meld (discard it),
    // and move the remaining tiles of the meld back to the hand.
    if (entry.kind === 'pung' || entry.kind === 'shang') {
      const remainingTiles = entry.tiles.filter(t => t.id !== tileId);
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[meldKey];
        return copy;
      });
      if (remainingTiles.length > 0) setHand(prev => {
        const ids = new Set(prev.map(t => t.id));
        const toAdd = remainingTiles.filter(t => !ids.has(t.id));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      });
      setResult(null);
      return;
    }
  };

  const handleCalculate = () => {
    const res = calculateHandFan(hand);
    setResult(res);
    if (!res.isValid) {
      setErrorMessage(res.reason || '無法計算牌型。');
    } else {
      setErrorMessage(null);
    }
  };

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
              onToggleMeld={(k: string) => createOrToggleMeld(k, meldMap[k].kind)}
              onUpgradePung={(k: string) => upgradePungToKong(k)}
              onMeldTileClick={(mk, tid) => handleMeldTileClick(mk, tid)}
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
                totalTiles={hand.length + Object.values(meldMap).reduce((s, m) => s + m.tiles.length, 0)}
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
            <HuArea huTile={huTile} onClearHu={() => { setHuTileId(null); setHuIsZimo(false); }} />
            <div className="text-xs text-slate-400 mt-2">自摸：{huIsZimo ? '是' : '否'}</div>
          </div>
        </div>

        {/* Row 3: Tile selector (single column) */}
        <div>
          <TilePicker onSelectTile={handleSelectTile} hand={hand} />
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={handleCalculate}
          disabled={hand.length !== 17}
          className={`
            w-full md:w-auto px-10 py-3 font-bold text-lg rounded-xl shadow-lg transition
            ${hand.length !== 17
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'}
          `}
        >
          算番 (Calculate Fan)
        </button>
      </div>

      <ResultCard result={result} />
    </div>
  );
}
