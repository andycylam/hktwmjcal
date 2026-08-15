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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-200">自摸</span>
                </div>
                <button
                  onClick={() => onToggleZimo && onToggleZimo(!huIsZimo)}
                  aria-pressed={!!huIsZimo}
                  className={`w-12 h-7 rounded-full p-1 transition ${huIsZimo ? 'bg-emerald-400' : 'bg-slate-600'}`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transform transition ${huIsZimo ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </>
        ) : (
          <span className="text-slate-400 italic text-sm">尚未選擇胡牌，點擊牌上的「胡」來設置。</span>
        )}
      </div>
    </div>
  );
};

export default HuArea;
