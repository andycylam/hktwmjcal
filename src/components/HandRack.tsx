import React from 'react';
import { Tile } from '../types/mahjong';

interface Props {
  hand: Tile[];
  onRemoveTile: (index: number) => void;
  onClear: () => void;
}

export const HandRack: React.FC<Props> = ({ hand, onRemoveTile, onClear }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-amber-400">
          🀄 當前手牌 ({hand.length}/17 張)
        </h2>
        <button
          onClick={onClear}
          className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-xs text-white font-semibold rounded transition"
        >
          清空手牌
        </button>
      </div>

      <div className="min-h-[72px] p-3 bg-slate-900 border border-slate-700 rounded-lg flex flex-wrap gap-2 items-center">
        {hand.length === 0 ? (
          <span className="text-slate-500 text-sm italic">請在下方點擊牌型加入手牌...</span>
        ) : (
          hand.map((tile, idx) => (
            <button
              key={tile.id}
              onClick={() => onRemoveTile(idx)}
              className="w-11 h-15 bg-amber-50 border-2 border-amber-600 rounded-md text-slate-900 font-bold hover:bg-red-100 transition flex items-center justify-center"
              title="點擊移除"
            >
              {tile.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
