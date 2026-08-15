import React from 'react';
import { Tile } from '../types/mahjong';

interface Props {
  huTile?: Tile | null;
  onClearHu: () => void;
}

export const HuArea: React.FC<Props> = ({ huTile, onClearHu }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-amber-300">胡牌 (Winning Tile)</h3>
      <div className="min-h-[56px] flex items-center gap-3">
        {huTile ? (
          <>
            <div className="w-12 h-16 rounded-lg bg-amber-300 border border-amber-600 flex items-center justify-center font-bold text-amber-950 shadow">
              {huTile.label}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClearHu}
                className="px-3 py-1 bg-red-600 text-white rounded transition hover:bg-red-500"
              >
                清除
              </button>
              <label className="flex items-center gap-2 px-2 py-1 bg-slate-700 rounded">
                <input type="checkbox" />
                <span className="text-sm text-slate-200">自摸</span>
              </label>
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
