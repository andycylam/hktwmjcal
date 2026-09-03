import React from 'react';
import { Tile, MELD } from '../types/mahjong';
import type { MeldKind } from '../types/mahjong';

interface MeldEntry {
  kind: MeldKind;
  tiles: Tile[];
  concealed?: boolean;
}

interface Props {
  meldMap: Record<string, MeldEntry>;
  onToggleMeld: (key: string) => void;
  onUpgradePung?: (key: string) => void;
  onToggleConcealed?: (meldKey: string) => void;
}

export const MeldArea: React.FC<Props> = ({ meldMap, onToggleMeld, onUpgradePung, onToggleConcealed }) => {
  const keys = Object.keys(meldMap);
  if (keys.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-amber-300">已成組 (Melds)</h3>
        <div className="text-slate-400 italic">尚無成組</div>
      </div>
    );
  }

  const flowerKeys = keys.filter(k => meldMap[k].kind === MELD.FLOWER);
  const regularKeys = keys.filter(k => meldMap[k].kind !== MELD.FLOWER);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-300">已成組 (Melds)</h3>
      <div className="flex flex-col gap-3">
        {flowerKeys.length > 0 && (
          <div>
            <div className="text-xs text-amber-200 mb-2">花牌</div>
            <div className="flex flex-wrap gap-2">
              {flowerKeys.map(k => {
                const m = meldMap[k];
                const t = m.tiles[0];
                return (
                  <div key={k} className="relative w-12 h-12 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold">
                    <button
                      onClick={() => onToggleMeld(k)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500"
                      title="取消"
                    >
                      ×
                    </button>
                    <div>{t?.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {regularKeys.map(k => {
          const m = meldMap[k];
          return (
            <div key={k} className="flex items-center gap-3">
              <div className="flex gap-2">
                {m.tiles.map(t => (
                  <div
                    key={t.id}
                    className="w-10 h-14 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold"
                  >
                    {t.label}
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-300">{m.kind === MELD.KONG ? '槓' : m.kind === MELD.PUNG ? '碰' : '上'}</div>
              {m.kind === MELD.KONG && (
                <div className="ml-2 text-sm text-slate-300 flex items-center gap-3">
                  <span className="text-xs">暗槓</span>
                  <button
                    role="switch"
                    aria-checked={!!m.concealed}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleConcealed && onToggleConcealed(k); } }}
                    onClick={() => onToggleConcealed && onToggleConcealed(k)}
                    className={`relative inline-flex items-center h-6 w-10 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${m.concealed ? 'bg-emerald-400' : 'bg-slate-600'}`}>
                    <span className={`absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${m.concealed ? 'translate-x-4' : 'translate-x-0'}`} style={{ top: '50%', transform: `${m.concealed ? 'translateY(-50%) translateX(100%)' : 'translateY(-50%) translateX(0)'}` }} />
                  </button>
                </div>
              )}
              {m.kind === MELD.PUNG && (
                <button
                  onClick={() => onUpgradePung && onUpgradePung(k)}
                  className="ml-auto px-3 py-1 bg-yellow-500 text-slate-900 rounded hover:bg-yellow-400 mr-2"
                >
                  升級為 槓
                </button>
              )}
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
