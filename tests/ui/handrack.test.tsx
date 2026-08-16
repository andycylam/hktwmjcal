import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandRack } from '../../src/components/HandRack';
import { Tile } from '../../src/types/mahjong';

function makeTile(suit: string, value: number, idSuffix: number): Tile {
  return { id: `${suit}_${value}_${idSuffix}`, suit: suit as any, value, label: `${value}${suit}` };
}

describe('HandRack UI', () => {
  it('renders hand tiles and allows selection toggle', async () => {
    const user = userEvent.setup();
    const hand: Tile[] = [makeTile('wan',1,1), makeTile('wan',2,2)];
    const toggle = vi.fn();
    render(<HandRack hand={hand} onRemoveTile={() => {}} onClear={() => {}} onToggleSelect={toggle} selection={[]} totalTiles={2} totalLimit={17} />);

    // Expect tile labels to be present
    expect(screen.getByText('1wan')).toBeTruthy();
    expect(screen.getByText('2wan')).toBeTruthy();

    // Click first tile's select button
    const selectButtons = screen.getAllByTitle(/選取/);
    await user.click(selectButtons[0]);
    expect(toggle).toHaveBeenCalled();
  });
});
