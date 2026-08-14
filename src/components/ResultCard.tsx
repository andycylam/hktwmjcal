import React from 'react';
import { CalculationResult } from '../types/mahjong';

interface Props {
  result: CalculationResult | null;
}

export const ResultCard: React.FC<Props> = ({ result }) => {
  if (!result) return null;

  return (
    <div className={`bg-slate-800 border rounded-xl p-6 space-y-4 shadow-xl ${result.isValid ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
      <div className="flex justify-between items-center border-b border-slate-700 pb-3">
        <h3 className="text-xl font-bold text-emerald-400">牌型分析結果</h3>
        {result.isValid && <span className="text-2xl font-black text-amber-400">{result.totalFan} 番</span>}
      </div>

      {!result.isValid ? (
        <p className="text-red-400 text-sm">{result.reason}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {result.breakdown.map((item, i) => (
            <li key={i} className="flex justify-between border-b border-slate-700/50 py-1">
              <span>{item.rule}</span>
              <span className="font-bold text-amber-400">+{item.fan} 番</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
