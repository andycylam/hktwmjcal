import { useState } from 'react';
import { Tile, CalculationResult } from './types/mahjong';
import { TilePicker } from './components/TilePicker';
import { HandRack } from './components/HandRack';
import { ResultCard } from './components/ResultCard';
import { calculateHandFan } from './engine/validator';

export default function App() {
  const [hand, setHand] = useState<Tile[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleSelectTile = (tile: Tile) => {
    if (hand.length >= 17) {
      alert('16張台灣麻將手牌不可超過 17 張 (16手牌 + 1胡牌)。');
      return;
    }
    setHand([...hand, tile]);
  };

  const handleRemoveTile = (index: number) => {
    const updated = [...hand];
    updated.splice(index, 1);
    setHand(updated);
  };

  const handleClear = () => {
    setHand([]);
    setResult(null);
  };

  const handleCalculate = () => {
    setResult(calculateHandFan(hand));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-emerald-400">港式台灣麻將 16張 算牌器 (hktwmjcal)</h1>
        <p className="text-slate-400 text-sm">Open Source HK Taiwanese Mahjong Fan Calculator</p>
      </header>

      <HandRack hand={hand} onRemoveTile={handleRemoveTile} onClear={handleClear} />
      <TilePicker onSelectTile={handleSelectTile} />

      <div className="flex justify-center pt-2">
        <button
          onClick={handleCalculate}
          className="w-full md:w-auto px-10 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg rounded-xl shadow-lg transition active:scale-95"
        >
          算番 (Calculate Fan)
        </button>
      </div>

      <ResultCard result={result} />
    </div>
  );
}
