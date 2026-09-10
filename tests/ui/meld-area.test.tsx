import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MeldArea } from '../../src/components/MeldArea';
import { MELD, SUIT, Tile } from '../../src/types/mahjong';

const tile = (value: number, id: number): Tile => ({
  id: `kong-${value}-${id}`,
  suit: SUIT.CHARACTER,
  value,
  label: `${value}萬`
});

describe('MeldArea', () => {
  afterEach(() => cleanup());

  it('exposes concealed-kong state and forwards toggle events', async () => {
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
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onToggleConcealed).toHaveBeenCalledTimes(3);
  });

  it('forwards pung upgrade and meld cancellation actions', () => {
    const onUpgradePung = vi.fn();
    const onToggleMeld = vi.fn();
    render(
      <MeldArea
        meldMap={{
          pung: { kind: MELD.PUNG, tiles: [1, 1, 1].map((_, id) => tile(1, id)) }
        }}
        onToggleMeld={onToggleMeld}
        onUpgradePung={onUpgradePung}
      />
    );

    screen.getByRole('button', { name: '升級為 槓' }).click();
    screen.getAllByText('取消')[0].click();
    expect(onUpgradePung).toHaveBeenCalledWith('pung');
    expect(onToggleMeld).toHaveBeenCalledWith('pung');
  });
});
