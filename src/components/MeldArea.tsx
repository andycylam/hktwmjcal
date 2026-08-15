import React from 'react';
import { Tile } from '../types/mahjong';

interface MeldEntry {
  kind: 'kong' | 'pung' | 'shang';
  tiles: Tile[];
}

interface Props {
  meldMap: Record<string, MeldEntry>;
  onToggleMeld: (key: string) => void;
}

export const MeldArea: React.FC<Props> = ({ meldMap, onToggleMeld }) => {
  const keys = Object.keys(meldMap);
  if (keys.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-amber-300">已成組 (Melds)</h3>
        <div className="text-slate-400 italic">尚無成組</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-300">已成組 (Melds)</h3>
      <div className="flex flex-col gap-3">
        {keys.map(k => {
          const m = meldMap[k];
          return (
            <div key={k} className="flex items-center gap-3">
              <div className="flex gap-2">
                {m.tiles.map(t => (
                  <div key={t.id} className="w-10 h-14 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold">
                    {t.label}
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-300">{m.kind}</div>
              <button
                onClick={() => onToggleMeld(k)}
                className="ml-auto px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
              >
                取消
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeldArea;
