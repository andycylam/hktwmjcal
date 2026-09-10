import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MeldArea } from '../../src/components/MeldArea';
import { MELD, SUIT, Tile } from '../../src/types/mahjong';

const tile = (value: number, id: number): Tile => ({
  id: `kong-${value}-${id}`,
  suit: SUIT.CHARACTER,
  value,
  label: `${value}萬`
});

describe('MeldArea', () => {
  it('exposes concealed-kong state and forwards toggle events', () => {
    const onToggleConcealed = vi.fn();
    render(
      <MeldArea
        meldMap={{
          kong: { kind: MELD.KONG, concealed: true, tiles: [1, 1, 1, 1].map((_, id) => tile(1, id)) }
        }}
        onToggleMeld={vi.fn()}
        onToggleConcealed={onToggleConcealed}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    toggle.click();
    expect(onToggleConcealed).toHaveBeenCalledWith('kong');
  });
});
