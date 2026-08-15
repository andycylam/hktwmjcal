import React from 'react';
import { Tile } from '../types/mahjong';

interface Props {
  huTile?: Tile | null;
  onClearHu: () => void;
  huIsZimo?: boolean;
  onToggleZimo?: (next: boolean) => void;
}

export const HuArea: React.FC<Props> = ({ huTile, onClearHu, huIsZimo, onToggleZimo }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-amber-300">胡牌 (Winning Tile)</h3>
      <div className="min-h-[56px] flex items-center gap-3">
        {huTile ? (
          <>
            <div className="w-12 h-16 rounded-lg bg-amber-300 border border-amber-600 flex items-center justify-center font-bold text-amber-950 shadow">
              {huTile.label}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClearHu}
                  className="px-3 py-1 bg-red-600 text-white rounded transition hover:bg-red-500"
                >
                  清除
                </button>
              </div>
            </div>
          </>
        ) : (
          <span className="text-slate-400 italic text-sm">尚未選擇胡牌，點擊牌上的「胡」來設置。</span>
        )}

        {/* Always show zimo switch; disable when no huTile selected */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-200">自摸</span>
          <button
            role="switch"
            aria-checked={!!huIsZimo}
            aria-disabled={!huTile}
            tabIndex={0}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && huTile) { e.preventDefault(); onToggleZimo && onToggleZimo(!huIsZimo); } }}
            onClick={() => { if (huTile) onToggleZimo && onToggleZimo(!huIsZimo); }}
            className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${huIsZimo ? 'bg-emerald-400' : 'bg-slate-600'} ${!huTile ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${huIsZimo ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HuArea;
