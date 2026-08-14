import { useState } from 'react';
import { Tile, CalculationResult } from './types/mahjong';
import { TilePicker } from './components/TilePicker';
import { HandRack } from './components/HandRack';
import { ResultCard } from './components/ResultCard';
import { calculateHandFan } from './engine/validator';
import { HuArea } from './components/HuArea';

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

  const handleSelectTile = (tile: Tile) => {
    setErrorMessage(null);

    // Check duplicate limit (flowers limited to 1)
    const isFlower = tile.suit === 'flower';
    const limit = isFlower ? 1 : MAX_TILES_PER_TYPE;
    const currentCount = getTileCount(hand, tile);

    if (currentCount >= limit) {
      setErrorMessage(`「${tile.label}」已達上限 (最多 ${limit} 張)，無法再加入。`);
      return;
    }

    // Check total hand size
    if (hand.length >= 17) {
      setErrorMessage(`手牌已滿 17 張 (16張手牌 + 1張胡牌)，請先移除牌。`);
      return;
    }

    setHand([...hand, tile]);
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

      {/* Error / feedback banner */}
      {errorMessage && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm text-center animate-fadeIn">
          {errorMessage}
        </div>
      )}

      <HandRack hand={hand} onRemoveTile={handleRemoveTile} onSetHu={handleSetHu} huTileId={huTileId} onClear={handleClear} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HuArea huTile={huTile} onClearHu={() => setHuTileId(null)} />
        <TilePicker onSelectTile={handleSelectTile} hand={hand} />
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
