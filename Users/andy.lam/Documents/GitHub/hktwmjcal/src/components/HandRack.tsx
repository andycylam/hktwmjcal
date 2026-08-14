import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  hand: Tile[];
  onRemoveType: (suit: string, value: number) => void;
  onClear: () => void;
}

// Vibrant mid-tone palette visible on dark background
const SUIT_COLORS: Record<Suit, { base: string; border: string; text: string }> = {
  wan: { base: 'bg-amber-300', border: 'border-amber-600', text: 'text-amber-950' },
  tong: { base: 'bg-red-300', border: 'border-red-600', text: 'text-red-950' },
  sou: { base: 'bg-emerald-300', border: 'border-emerald-600', text: 'text-emerald-950' },
  wind: { base: 'bg-blue-300', border: 'border-blue-600', text: 'text-blue-950' },
  dragon: { base: 'bg-purple-300', border: 'border-purple-600', text: 'text-purple-950' },
  flower: { base: 'bg-lime-300', border: 'border-lime-600', text: 'text-lime-950' }
};

export const HandRack: React.FC<Props> = ({ hand, onRemoveType, onClear }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-amber-400">
          🀄 當前手牌 ({hand.length}/17 張)
        </h2>
        <button
          onClick={onClear}
          className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-xs text-white font-semibold rounded transition disabled:opacity-50"
          disabled={hand.length === 0}
        >
          清空手牌
        </button>
      </div>

      <div className="min-h-[72px] p-3 bg-slate-900 border border-slate-700 rounded-lg flex flex-wrap gap-3 items-center">
        {hand.length === 0 ? (
          <span className="text-slate-500 text-sm italic">請在下方點擊牌型加入手牌...</span>
        ) : (
          hand.map((tile) => (
            <button
              key={tile.id}
              onClick={() => onRemoveType(tile.suit, tile.value)}
              className={`
                w-11 h-15 ${SUIT_COLORS[tile.suit].base} ${SUIT_COLORS[tile.suit].border} border-2 rounded-md
                flex items-center justify-center font-bold ${SUIT_COLORS[tile.suit].text} shadow
                hover:brightness-95 active:scale-95 transition
              `}
              title={`移除 ${tile.label}`}
            >
              {tile.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
