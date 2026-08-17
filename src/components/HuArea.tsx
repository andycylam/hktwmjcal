import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  huTile?: Tile | null;
  onRemoveHu: () => void;
  huIsZimo?: boolean;
  onToggleZimo?: (next: boolean) => void;
}

// Reuse same suit color scheme as TilePicker/HandRack
const SUIT_COLORS: Record<Suit, { base: string; border: string; text: string }> = {
  wan: { base: 'bg-amber-300', border: 'border-amber-600', text: 'text-amber-950' },
  tong: { base: 'bg-red-300', border: 'border-red-600', text: 'text-red-950' },
  sou: { base: 'bg-emerald-300', border: 'border-emerald-600', text: 'text-emerald-950' },
  wind: { base: 'bg-blue-300', border: 'border-blue-600', text: 'text-blue-950' },
  dragon: { base: 'bg-purple-300', border: 'border-purple-600', text: 'text-purple-950' },
  flower: { base: 'bg-lime-300', border: 'border-lime-600', text: 'text-lime-950' }
};

export const HuArea: React.FC<Props> = ({ huTile, onRemoveHu, huIsZimo, onToggleZimo }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-amber-300">胡牌 (Winning Tile)</h3>
      <div className="min-h-[56px]">
        <div className="flex items-center gap-3">
          {huTile ? (
            <>
              <div className="relative">
                <div data-testid="hu-tile" className={`w-12 h-16 rounded-lg ${SUIT_COLORS[huTile.suit as Suit].base} ${SUIT_COLORS[huTile.suit as Suit].border} flex items-center justify-center font-bold ${SUIT_COLORS[huTile.suit as Suit].text} shadow`}>
                  {huTile.label}
                </div>
                {/* Cross button to remove hu tile and return to hand - matches HandRack style */}
                <button
                  onClick={onRemoveHu}
                  data-testid="hu-remove"
                  className="absolute -top-3 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center bg-red-600 text-white shadow transition hover:scale-105 active:scale-95"
                  title={`移除胡牌，回到手牌 ${huTile.label}`}
                >
                  ×
                </button>
              </div>
            </>
          ) : (
            <span className="text-slate-400 italic text-sm">尚未選擇胡牌，點擊牌上的「胡」來設置。</span>
          )}
        </div>

        {/* Zimo switch should appear on its own line below the content */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-slate-200">自摸</span>
          <button
            role="switch"
            aria-checked={!!huIsZimo}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleZimo && onToggleZimo(!huIsZimo); } }}
            onClick={() => onToggleZimo && onToggleZimo(!huIsZimo)}
            className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${huIsZimo ? 'bg-emerald-400' : 'bg-slate-600'}`}
          >
            <span
              className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-200 ${huIsZimo ? 'translate-x-8' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HuArea;
