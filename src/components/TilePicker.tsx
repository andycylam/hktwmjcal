import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  onSelectTile: (tile: Tile) => void;
  hand: Tile[];
}

const MAX_PER_TYPE = 4;

const TILE_GROUPS: { name: string; suit: Suit; items: { val: number; label: string }[] }[] = [
  {
    name: '萬子 (Characters)',
    suit: 'wan',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${v}萬` }))
  },
  {
    name: '筒子 (Dots)',
    suit: 'tong',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${v}筒` }))
  },
  {
    name: '索子 (Bamboo)',
    suit: 'sou',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${v}索` }))
  },
  {
    name: '字牌 (Winds & Dragons)',
    suit: 'wind',
    items: [
      { val: 1, label: '東' }, { val: 2, label: '南' }, { val: 3, label: '西' }, { val: 4, label: '北' },
      { val: 5, label: '中' }, { val: 6, label: '發' }, { val: 7, label: '白' }
    ]
  },
  {
    name: '花牌 (Flowers)',
    suit: 'flower',
    items: [1, 2, 3, 4, 5, 6, 7, 8].map(v => ({ val: v, label: `🀦${v}` }))
  }
];

// Suit-specific color palette
const SUIT_COLORS: Record<Suit, { base: string; border: string; text: string; disabled: string }> = {
  wan: {
    base: 'bg-amber-50',
    border: 'border-amber-700',
    text: 'text-amber-900',
    disabled: 'bg-amber-100/40 border-amber-700/40 text-amber-900/40'
  },
  tong: {
    base: 'bg-red-50',
    border: 'border-red-700',
    text: 'text-red-800',
    disabled: 'bg-red-100/40 border-red-700/40 text-red-800/40'
  },
  sou: {
    base: 'bg-emerald-50',
    border: 'border-emerald-700',
    text: 'text-emerald-900',
    disabled: 'bg-emerald-100/40 border-emerald-700/40 text-emerald-900/40'
  },
  wind: {
    base: 'bg-blue-50',
    border: 'border-blue-700',
    text: 'text-blue-800',
    disabled: 'bg-blue-100/40 border-blue-700/40 text-blue-800/40'
  },
  dragon: {
    base: 'bg-purple-50',
    border: 'border-purple-700',
    text: 'text-purple-800',
    disabled: 'bg-purple-100/40 border-purple-700/40 text-purple-800/40'
  },
  flower: {
    base: 'bg-lime-50',
    border: 'border-lime-700',
    text: 'text-lime-800',
    disabled: 'bg-lime-100/40 border-lime-700/40 text-lime-800/40'
  }
};

function getTileCounts(hand: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  hand.forEach(t => {
    const key = `${t.suit}_${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

export const TilePicker: React.FC<Props> = ({ onSelectTile, hand }) => {
  const counts = getTileCounts(hand);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-bold text-emerald-400">選擇牌型 (Tile Selector)</h2>
      {TILE_GROUPS.map(group => (
        <div key={group.name} className="space-y-1">
          <span className="text-xs text-slate-400 uppercase font-semibold">{group.name}</span>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item, idx) => {
              const key = `${group.suit}_${item.val}`;
              const currentCount = counts.get(key) || 0;
              const isFlower = group.suit === 'flower';
              const effectiveMaxed = isFlower ? currentCount >= 1 : currentCount >= MAX_PER_TYPE;
              const colors = SUIT_COLORS[group.suit];

              return (
                <button
                  key={key}
                  onClick={() =>
                    onSelectTile({
                      id: `${key}_${Date.now()}_${idx}`,
                      suit: group.suit,
                      value: item.val,
                      label: item.label
                    })
                  }
                  disabled={effectiveMaxed}
                  className={`
                    relative w-12 h-16 rounded-lg shadow font-bold flex items-center justify-center text-lg
                    transition transform
                    ${effectiveMaxed
                      ? `${colors.disabled} cursor-not-allowed`
                      : `${colors.base} ${colors.border} hover:scale-105 active:scale-95`}
                  `}
                  title={effectiveMaxed ? `最多 ${isFlower ? 1 : MAX_PER_TYPE} 張` : item.label}
                >
                  {item.label}
                  {/* Count badge */}
                  {currentCount > 0 && (
                    <span
                      className={`
                        absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-black
                        flex items-center justify-center
                        ${effectiveMaxed ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-200'}
                      `}
                    >
                      {currentCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
