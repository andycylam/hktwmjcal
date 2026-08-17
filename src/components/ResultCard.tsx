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
        {result.isValid ? (
          <span className="text-3xl font-black text-amber-400">{result.totalFan} 番</span>
        ) : (
          <span className="text-sm font-bold text-red-400">無效</span>
        )}
      </div>

      {!result.isValid ? (
        <div className="space-y-2">
          <p className="text-red-400 text-sm">{result.reason}</p>
          <p className="text-slate-500 text-xs">請確認手牌滿 17 張且無超出上限的牌型。</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2 text-sm text-slate-300">
            {result.breakdown.map((item, i) => (
              <li key={i} className="flex justify-between items-center border-b border-slate-700/50 py-1 last:border-0">
                <span className="text-slate-300">{item.rule}</span>
                <span className="font-bold text-amber-400">+{item.fan} 番</span>
              </li>
            ))}
            <li className="flex justify-between items-center pt-2 border-t-2 border-slate-700 mt-2 text-base font-bold">
              <span className="text-emerald-400">總計</span>
              <span className="text-2xl text-amber-400">{result.totalFan} 番</span>
            </li>
          </ul>

          {result.possibleCombinations && result.possibleCombinations.length > 0 && (
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <h4 className="text-sm font-bold text-amber-300">可胡組合</h4>
              <ul className="space-y-1 text-xs text-slate-200 list-disc pl-5">
                {result.possibleCombinations.map((combo, i) => (
                  <li key={i}>{combo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
