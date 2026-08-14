import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  onSelectTile: (tile: Tile) => void;
}

const TILE_GROUPS: { name: string; suit: Suit; items: { val: number; label: string }[] }[] = [
  {
    name: '萬子 (Characters)',
    suit: 'wan',
    items: [1,2,3,4,5,6,7,8,9].map(v => ({ val: v, label: `${v}萬` }))
  },
  {
    name: '筒子 (Dots)',
    suit: 'tong',
    items: [1,2,3,4,5,6,7,8,9].map(v => ({ val: v, label: `${v}筒` }))
  },
  {
    name: '索子 (Bamboo)',
    suit: 'sou',
    items: [1,2,3,4,5,6,7,8,9].map(v => ({ val: v, label: `${v}索` }))
  },
  {
    name: '字牌 (Winds & Dragons)',
    suit: 'wind',
    items: [
      { val: 1, label: '東' }, { val: 2, label: '南' }, { val: 3, label: '西' }, { val: 4, label: '北' },
      { val: 5, label: '中' }, { val: 6, label: '發' }, { val: 7, label: '白' }
    ]
  }
];

export const TilePicker: React.FC<Props> = ({ onSelectTile }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-bold text-emerald-400">選擇牌型 (Tile Selector)</h2>
      {TILE_GROUPS.map(group => (
        <div key={group.name} className="space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">{group.name}</span>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item, idx) => (
              <button
                key={`${group.suit}_${item.val}_${idx}`}
                onClick={() => onSelectTile({ id: Math.random().toString(), suit: group.suit, value: item.val, label: item.label })}
                className="w-12 h-16 bg-emerald-50 border-2 border-emerald-700 hover:bg-emerald-100 rounded-lg shadow font-bold text-slate-900 transition active:scale-95 flex items-center justify-center text-lg"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
