import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  hand: Tile[];
  onRemoveTile: (id: string) => void;
  onSetHu: (id: string) => void;
  huTileId?: string | null;
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

// Render tiles individually in the hand (no grouping)

export const HandRack: React.FC<Props> = ({ hand, onRemoveTile, onClear }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-amber-400">🀄 當前手牌 ({hand.length}/17 張)</h2>
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
          hand.map(t => {
            const colors = SUIT_COLORS[t.suit as Suit];
            const isHu = huTileId === t.id;
            return (
              <div key={t.id} className="relative">
                <button
                  onClick={() => onRemoveTile(t.id)}
                  className={`
                    relative w-11 h-15 ${colors.base} ${colors.border} border-2 rounded-md
                    flex items-center justify-center font-bold text-slate-900 shadow
                    hover:brightness-95 active:scale-95 transition
                    ${isHu ? 'ring-2 ring-amber-400' : ''}
                  `}
                  title={`移除 ${t.label}`}
                >
                  {t.label}
                </button>

                <button
                  onClick={() => onSetHu(t.id)}
                  className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center bg-amber-500 text-slate-900 shadow transition
                    hover:scale-105 active:scale-95`}
                  title={isHu ? '取消 胡牌' : '設為 胡牌'}
                >
                  胡
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
