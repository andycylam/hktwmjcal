import React from 'react';
import { Tile } from '../types/mahjong';

interface Props {
  declaredKongs: string[];
  declaredPungs: string[];
  declaredShangs: string[];
  hand: Tile[];
}

export const MeldArea: React.FC<Props> = ({ declaredKongs, declaredPungs, declaredShangs, hand }) => {
  function renderSet(keys: string[], label: string) {
    if (keys.length === 0) return <div className="text-slate-400 italic">無</div>;
    return (
      <div className="flex flex-col gap-2">
        {keys.map(k => {
          const [suit, val] = k.split('_');
          const tile = hand.find(t => `${t.suit}_${t.value}` === k);
          return (
            <div key={k} className="flex items-center gap-2">
              <div className="w-10 h-14 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-sm font-bold">{tile?.label ?? `${val}${suit}`}</div>
              <div className="text-sm text-slate-300">{label}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-300">已成組 (Melds)</h3>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="text-xs text-slate-400 uppercase">槓 (Kongs)</div>
          {renderSet(declaredKongs, '槓')}
        </div>
        <div>
          <div className="text-xs text-slate-400 uppercase">碰 (Pungs)</div>
          {renderSet(declaredPungs, '碰')}
        </div>
        <div>
          <div className="text-xs text-slate-400 uppercase">上 (Shang)</div>
          {renderSet(declaredShangs, '上')}
        </div>
      </div>
    </div>
  );
};

export default MeldArea;
