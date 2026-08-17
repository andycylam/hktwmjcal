import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  hand: Tile[];
  onRemoveTile: (id: string) => void;
  huTileId?: string | null;
  onClear: () => void;
  onToggleSelect?: (id: string) => void;
  selection?: string[];
  meldMap?: Record<string, { kind: 'kong' | 'pung' | 'shang' | 'flower'; tiles: Tile[] }>;
  totalTiles?: number;
  totalLimit?: number;
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

export const HandRack: React.FC<Props> = ({ hand, onRemoveTile, huTileId, onClear, totalTiles, totalLimit, onToggleSelect, selection }) => {
  // Filter out hu tile from display
  const displayHand = huTileId ? hand.filter(t => t.id !== huTileId) : hand;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-amber-400">🀄 當前手牌 ({totalTiles ?? displayHand.length}/{totalLimit ?? 17} 張)</h2>
        <button
          onClick={onClear}
          className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-xs text-white font-semibold rounded transition disabled:opacity-50"
          disabled={displayHand.length === 0}
        >
          清空手牌
        </button>
      </div>

      <div className="min-h-[72px] p-3 bg-slate-900 border border-slate-700 rounded-lg flex flex-wrap gap-3 items-center">
        {displayHand.length === 0 ? (
          <span className="text-slate-500 text-sm italic">請在下方點擊牌型加入手牌...</span>
        ) : (
          displayHand.map(t => {
            const colors = SUIT_COLORS[t.suit as Suit];
            const isSelected = selection ? selection.includes(t.id) : false;
            const toggleTitle = isSelected ? `取消 選取 ${t.label}` : `選取 ${t.label}`;
            return (
              <div key={t.id} className="relative p-1">
                  <button
                      onClick={() => onToggleSelect ? onToggleSelect(t.id) : onRemoveTile(t.id)}
                    className={`
                      relative w-14 h-18 ${colors.base} ${colors.border} border-2 rounded-md
                      flex items-center justify-center font-bold text-slate-900 shadow
                      hover:brightness-95 active:scale-95 transition
                        ${isSelected ? 'ring-2 ring-amber-400' : ''}
                      `}
                      title={toggleTitle}
                    >
                      {t.label}
                    </button>

                    <div className="absolute -top-3 -left-1 flex gap-1">
                      <button
                        onClick={() => onRemoveTile(t.id)}
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center bg-red-600 text-white shadow transition hover:scale-105 active:scale-95`}
                        title={`移除 ${t.label}`}
                      >
                        ×
                      </button>

                      {/* removed per-tile meld buttons; use selection + 成組 in the action area */}
                    </div>

                  {/* badges moved to MeldArea; do not show meld badges on tiles in hand */}
                </div>
            );
          })
        )}
      </div>
    </div>
  );
};
