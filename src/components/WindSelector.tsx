import React from 'react';

type Wind = 'east'|'south'|'west'|'north';

interface Props {
  prevalent: Wind;
  seat: Wind;
  onSetPrevalent: (w: Wind) => void;
  onSetSeat: (w: Wind) => void;
}

export const WindSelector: React.FC<Props> = ({ prevalent, seat, onSetPrevalent, onSetSeat }) => {
  const WINDS: Wind[] = ['east','south','west','north'];
  const label = (v: Wind) => v === 'east' ? '東' : v === 'south' ? '南' : v === 'west' ? '西' : '北';

  return (
    <div className="md:flex md:gap-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 md:flex-1">
        <div className="text-xs text-amber-200 mb-2">場風 (Prevailing Wind)</div>
        <div className="flex gap-2">
          {WINDS.map(v => (
            <button key={v} onClick={() => onSetPrevalent(v)} className={`px-2 py-1 rounded ${prevalent===v ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'}`}>
              {label(v)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mt-2 md:mt-0 md:flex-1">
        <div className="text-xs text-amber-200 mb-2">座位 (Your Seat)</div>
        <div className="flex gap-2">
          {WINDS.map(v => (
            <button key={v} onClick={() => onSetSeat(v)} className={`px-2 py-1 rounded ${seat===v ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'}`}>
              {label(v)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WindSelector;
