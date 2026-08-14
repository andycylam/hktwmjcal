import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  hand: Tile[];
  onRemoveType: (suit: string, value: number) => void;
  onClear: () => void;
}

// Reuse same suit color scheme as TilePicker
const SUIT_COLORS: Record<Suit, { base: string; border: string }> = {
  wan: { base: 'bg-amber-50', border: 'border-amber-700' },
  tong: { base: 'bg-red-50', border: 'border-red-700' },
  sou: { base: 'bg-emerald-50', border: 'border-emerald-700' },
  wind: { base: 'bg-blue-50', border: 'border-blue-700' },
  dragon: { base: 'bg-purple-50', border: 'border-purple-700' },
  flower: { base: 'bg-lime-50', border: 'border-lime-700' }
};

// Group tiles by type for display
function groupTiles(hand: Tile[]): { suit: string; value: number; label: string; count: number }[] {
  const map = new Map<string, { suit: string; value: number; label: string; count: number }>();
  hand.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { suit: t.suit, value: t.value, label: t.label, count: 1 });
    }
  });
  return Array.from(map.values());
}

export const HandRack: React.FC<Props> = ({ hand, onRemoveType, onClear }) => {
  const groups = groupTiles(hand);

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
          groups.map(g => {
            const colors = SUIT_COLORS[g.suit as Suit];
            return (
              <button
                key={`${g.suit}_${g.value}`}
                onClick={() => onRemoveType(g.suit, g.value)}
                className={`
                  relative w-11 h-15 ${colors.base} ${colors.border} border-2 rounded-md
                  flex items-center justify-center font-bold text-slate-900 shadow
                  hover:brightness-95 active:scale-95 transition
                `}
                title={`移除 1 張 ${g.label}`}
              >
                {g.label}
                {/* Count badge */}
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-black bg-amber-500 text-slate-900 flex items-center justify-center">
                  {g.count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
