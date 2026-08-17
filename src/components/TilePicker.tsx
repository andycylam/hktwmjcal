import React from 'react';
import { Tile, Suit } from '../types/mahjong';

interface Props {
  onSelectTile: (tile: Tile) => void;
  onAddFlower?: (tile: Tile) => void;
  hand: Tile[];
  meldMap?: Record<string, { kind: string; tiles: Tile[] }>;
}

const MAX_PER_TYPE = 4;

const CHINESE_NUM = ['零','一','二','三','四','五','六','七','八','九'];

const TILE_GROUPS: { name: string; suit: Suit; items: { val: number; label: string }[] }[] = [
  {
    name: '萬子 (Characters)',
    suit: 'wan',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${CHINESE_NUM[v]}萬` }))
  },
  {
    name: '筒子 (Dots)',
    suit: 'tong',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${CHINESE_NUM[v]}筒` }))
  },
  {
    name: '索子 (Bamboo)',
    suit: 'sou',
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => ({ val: v, label: `${CHINESE_NUM[v]}索` }))
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

// Vibrant colors for visibility on dark background
const SUIT_COLORS: Record<Suit, { base: string; border: string; text: string; disabled: string }> = {
  wan: {
    base: 'bg-amber-300',
    border: 'border-amber-600',
    text: 'text-amber-950',
    disabled: 'bg-amber-300/40 border-amber-600/40 text-amber-950/40'
  },
  tong: {
    base: 'bg-red-300',
    border: 'border-red-600',
    text: 'text-red-950',
    disabled: 'bg-red-300/40 border-red-600/40 text-red-950/40'
  },
  sou: {
    base: 'bg-emerald-300',
    border: 'border-emerald-600',
    text: 'text-emerald-950',
    disabled: 'bg-emerald-300/40 border-emerald-600/40 text-emerald-950/40'
  },
  wind: {
    base: 'bg-blue-300',
    border: 'border-blue-600',
    text: 'text-blue-950',
    disabled: 'bg-blue-300/40 border-blue-600/40 text-blue-950/40'
  },
  dragon: {
    base: 'bg-purple-300',
    border: 'border-purple-600',
    text: 'text-purple-950',
    disabled: 'bg-purple-300/40 border-purple-600/40 text-purple-950/40'
  },
  flower: {
    base: 'bg-lime-300',
    border: 'border-lime-600',
    text: 'text-lime-950',
    disabled: 'bg-lime-300/40 border-lime-600/40 text-lime-950/40'
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

export const TilePicker: React.FC<Props> = ({ onSelectTile, onAddFlower, hand, meldMap }) => {
  // Count tiles from hand + meldMap so flower buttons reflect already-added flowers
  const counts = getTileCounts(hand);
  if (meldMap) {
    Object.values(meldMap).forEach(m => {
      m.tiles.forEach(t => {
        const key = `${t.suit}_${t.value}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
  }

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
                  onClick={() => {
                    const tile = {
                      id: `${key}_${Date.now()}_${idx}`,
                      suit: group.suit,
                      value: item.val,
                      label: item.label
                    } as Tile;
                    if (group.suit === 'flower') {
                      if (onAddFlower) onAddFlower(tile);
                      return;
                    }
                    onSelectTile(tile);
                  }}
                  disabled={effectiveMaxed}
                  className={`
                    relative w-12 h-16 rounded-lg shadow font-bold flex items-center justify-center text-lg
                    transition transform
                    ${effectiveMaxed
                      ? `${colors.disabled} cursor-not-allowed`
                      : `${colors.base} ${colors.border} hover:scale-105 active:scale-95`}
                  `}
                  title={effectiveMaxed ? `最多 ${isFlower ? 1 : MAX_PER_TYPE} 張` : item.label}
                  data-testid={`picker-tile-${key}`}
                  data-tile-key={key}
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
