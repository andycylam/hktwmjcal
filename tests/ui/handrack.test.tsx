import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('removing a selected tile clears selection', async () => {
    const user = userEvent.setup();
    const t1 = makeTile('wan',1,1);
    const t2 = makeTile('wan',2,2);

    function TestWrapper() {
      const [hand, setHand] = React.useState<Tile[]>([t1, t2]);
      const [selection, setSelection] = React.useState<string[]>([]);
      const onToggleSelect = (id: string) => {
        setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
      };
      const onRemoveTile = (id: string) => {
        setHand(prev => prev.filter(t => t.id !== id));
        // parent should also clean up selection when a tile is removed
        setSelection(prev => prev.filter(x => x !== id));
      };

      return (
        <>
          <HandRack hand={hand} onRemoveTile={onRemoveTile} onClear={() => {}} onToggleSelect={onToggleSelect} selection={selection} totalTiles={hand.length} totalLimit={17} />
          <div data-testid="selection-count">{selection.length}</div>
        </>
      );
    }

    const { container } = render(<TestWrapper />);

    // select first tile (within this render only)
    const selectCandidates = within(container).getAllByTitle(/選取/);
    const tileBtn = selectCandidates.find(el => el.getAttribute('data-tile-id') === t1.id);
    expect(tileBtn).toBeDefined();
    await user.click(tileBtn!);
    await waitFor(() => expect(screen.getByTestId('selection-count').textContent).toBe('1'));

    // remove the selected tile using the remove button (within this render)
    const removeBtnCandidates = within(container).getAllByTestId(`hand-remove-${t1.label}`);
    const removeBtn = removeBtnCandidates.find(el => el.getAttribute('data-tile-id') === t1.id);
    expect(removeBtn).toBeDefined();
    await user.click(removeBtn!);

    // tile should be removed from DOM within this render and selection cleared
    expect(within(container).queryByTestId(`hand-tile-${t1.label}`)).toBeNull();
    await waitFor(() => expect(within(container).getByTestId('selection-count').textContent).toBe('0'));
  });

});
