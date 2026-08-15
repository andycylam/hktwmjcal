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
  const huTile = hand.find(t => t.id === huTileId) || null;
  const [declaredKongs, setDeclaredKongs] = useState<string[]>([]);
  const [declaredPungs, setDeclaredPungs] = useState<string[]>([]);
  const [declaredShangs, setDeclaredShangs] = useState<string[]>([]);
  const [meldMap, setMeldMap] = useState<Record<string, { kind: 'kong' | 'pung' | 'shang'; tiles: Tile[] }>>({});

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

    // Auto-upgrade: if there's an existing pung meld and this selection makes total 4, convert pung -> kong
    const k = `${tile.suit}_${tile.value}`;
    const existingMeld = meldMap[k];
    if (existingMeld && existingMeld.kind === 'pung') {
      // count tiles of this key in meld + updatedHand
      const meldCount = existingMeld.tiles.length;
      const handCount = updatedHand.filter(t => `${t.suit}_${t.value}` === k).length;
      if (meldCount + handCount >= 4) {
        // move one matching tile from hand into the meld to form a kong
        const idx = updatedHand.findIndex(t => `${t.suit}_${t.value}` === k);
        if (idx !== -1) {
          const tileToMove = updatedHand[idx];
          const newHand = [...updatedHand.slice(0, idx), ...updatedHand.slice(idx + 1)];
          setHand(newHand);
          setMeldMap(prev => ({ ...prev, [k]: { kind: 'kong', tiles: [...existingMeld.tiles, tileToMove] } }));
          setDeclaredPungs(prev => prev.filter(x => x !== k));
          setDeclaredKongs(prev => (prev.includes(k) ? prev : [...prev, k]));
          setResult(null);
        }
      }
    }
  };

  const handleRemoveTile = (id: string) => {
    const updated = hand.filter(t => t.id !== id);
    setHand(updated);
    setResult(null);
    // clear hu if the hu tile was removed
    if (huTileId === id) setHuTileId(null);
  };

  const handleSetHu = (id: string) => {
    // toggle
    setHuTileId(prev => (prev === id ? null : id));
    setResult(null);
  };

  const handleClear = () => {
    setHand([]);
    setResult(null);
    setErrorMessage(null);
    setMeldMap({});
    setDeclaredKongs([]);
    setDeclaredPungs([]);
    setDeclaredShangs([]);
  };

  function createOrToggleMeld(key: string, kind: 'kong' | 'pung' | 'shang') {
    // Special handling for 'shang' (sequence)
    if (kind === 'shang') {
      const [suit, valStr] = key.split('_');
      const value = parseInt(valStr, 10);

      // If any existing shang meld contains this tile, remove that meld
      const existingKey = Object.keys(meldMap).find(k => meldMap[k].kind === 'shang' && meldMap[k].tiles.some(t => `${t.suit}_${t.value}` === key));
      if (existingKey) {
        const tiles = meldMap[existingKey].tiles;
        setHand(prev => [...prev, ...tiles]);
        setMeldMap(prev => {
          const copy = { ...prev };
          delete copy[existingKey];
          return copy;
        });
        setDeclaredShangs(prev => prev.filter(k => k !== existingKey));
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
            // take first matching tile for that value if not already taken
            const alreadyForValue = taken.find(x => x.value === t.value && x.suit === t.suit);
            if (!alreadyForValue) taken.push(t);
            else remaining.push(t);
          } else {
            remaining.push(t);
          }
        }

        if (taken.length === 3) {
          const seqKey = `${suit}_${start}`;
          setHand(remaining);
          setMeldMap(prev => ({ ...prev, [seqKey]: { kind: 'shang', tiles: taken } }));
          setDeclaredShangs(prev => [...prev, seqKey]);
          setResult(null);
          return;
        }
      }

      setErrorMessage(`無法標記為上：未找到包含此牌的順子 (例如 一二三)。`);
      return;
    }

    // For kong/pung: if exists under the exact key, remove it
    if (meldMap[key]) {
      const tiles = meldMap[key].tiles;
      setHand(prev => [...prev, ...tiles]);
      setMeldMap(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      if (kind === 'kong') setDeclaredKongs(prev => prev.filter(k => k !== key));
      if (kind === 'pung') setDeclaredPungs(prev => prev.filter(k => k !== key));
      setResult(null);
      return;
    }

    // create meld: pull tiles from hand (kong/pung require identical tiles)
    const need = kind === 'kong' ? 4 : 3;
    const taken: Tile[] = [];
    const remaining: Tile[] = [];
    for (const t of hand) {
      const k = `${t.suit}_${t.value}`;
      if (k === key && taken.length < need) taken.push(t);
      else remaining.push(t);
    }
    if (taken.length < need) {
      setErrorMessage(`無法標記 ${key} 為 ${kind}：手牌中沒有足夠的牌 (需要 ${need} 張)。`);
      return;
    }

    setHand(remaining);
    setMeldMap(prev => ({ ...prev, [key]: { kind, tiles: taken } }));
    if (kind === 'kong') setDeclaredKongs(prev => [...prev, key]);
    if (kind === 'pung') setDeclaredPungs(prev => [...prev, key]);
    setResult(null);
  }

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
          <MeldArea meldMap={meldMap} onToggleMeld={(k: string) => createOrToggleMeld(k, meldMap[k].kind)} />
        </div>

        {/* Row 2: Current hand (left) and Hu tile (right) */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
              <HandRack
                hand={hand}
                onRemoveTile={handleRemoveTile}
                onSetHu={handleSetHu}
                huTileId={huTileId}
                onClear={handleClear}
                declaredKongs={declaredKongs}
                onToggleKong={(key: string) => {
                  createOrToggleMeld(key, 'kong');
                }}
                declaredPungs={declaredPungs}
                onTogglePung={(key: string) => {
                  createOrToggleMeld(key, 'pung');
                }}
                declaredShangs={declaredShangs}
                onToggleShang={(key: string) => {
                  createOrToggleMeld(key, 'shang');
                }}
                meldMap={meldMap}
                totalTiles={hand.length + Object.values(meldMap).reduce((s, m) => s + m.tiles.length, 0)}
                totalLimit={17 + Object.values(meldMap).filter(m => m.kind === 'kong').length}
              />
          </div>

          <div className="w-40">
            <HuArea huTile={huTile} onClearHu={() => setHuTileId(null)} />
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
