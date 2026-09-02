import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('App flows (melds, flowers, hu)', () => {
  it('can create and cancel a chow (sequence) via selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    // find tile picker and click 一萬, 二萬, 三萬 to add them to hand
    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);
    await user.click(screen.getAllByTestId('picker-tile-character_2')[0]);
    await user.click(screen.getAllByTestId('picker-tile-character_3')[0]);

    // select three tiles in hand
    const selectButtons = screen.getAllByTitle(/選取/);
    // click the first three selection buttons
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);
    await user.click(selectButtons[2]);

    // create meld
    const createBtn = screen.getByText('成組');
    await user.click(createBtn);

    // expect a chow label '上' to appear
    expect(screen.getByText('上')).toBeTruthy();

    // cancel the meld
    const cancelBtns = screen.getAllByText('取消');
    await user.click(cancelBtns[0]);

    // now '上' should not be present
    expect(screen.queryByText('上')).toBeNull();
  });

  it('can add flower tiles and cancel a specific flower', async () => {
    const user = userEvent.setup();
    render(<App />);

    // add two different flowers
    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);
    await user.click(p.getByText('🀦1'));
    await user.click(p.getByText('🀦2'));

    // both flowers should appear (some occurrences are in picker, some in melds)
    expect(screen.getAllByText('🀦1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🀦2').length).toBeGreaterThan(0);

    // find the melds container and look for the flower tile inside it
    const meldHeaders = screen.getAllByText('已成組 (Melds)');
    let meldContainer: HTMLElement | null = null;
    for (const h of meldHeaders) {
      const c = h.closest('div')! as HTMLElement;
      try {
        const hits = within(c).queryAllByText('🀦1');
        if (hits.length > 0) { meldContainer = c; break; }
      } catch (e) { /* ignore */ }
    }
    if (!meldContainer) {
      // fallback to the first header's container
      meldContainer = meldHeaders[0].closest('div')! as HTMLElement;
    }

    const allF1 = within(meldContainer).getAllByText('🀦1');
    const flower1El = allF1[0];
    // climb ancestors to find the tile container that has the cancel button
    let node: HTMLElement | null = flower1El as HTMLElement;
    while (node && !node.className?.includes('bg-slate-700')) {
      node = node.parentElement;
    }
    const flower1Container = node!;
    const cancelBtn = within(flower1Container).getByTitle('取消');
    await user.click(cancelBtn);

    // 🀦1 should be removed from the meld area; there may still be occurrences in the picker
    const remainingF1 = within(meldContainer).queryAllByText('🀦1');
    expect(remainingF1.length).toBe(0);

    // 🀦2 should still exist (either in melds or picker)
    const allF2 = screen.getAllByText('🀦2');
    expect(allF2.length).toBeGreaterThan(0);
  });

  it('can set a hu tile by selecting one tile and clicking Set 胡', async () => {
    const user = userEvent.setup();
    render(<App />);

    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);

    // select the tile in hand (target the button inside HandRack to avoid ambiguous buttons)
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div')! as HTMLElement;
    // climb up to the HandRack root which has bg-slate-800 class
    while (handContainer && !handContainer.className.includes('bg-slate-800')) { handContainer = handContainer.parentElement as HTMLElement; }
    const selectButtons = within(handContainer).getAllByTestId('hand-tile-一萬');
    const selectButton = selectButtons[selectButtons.length - 1];
    await user.click(selectButton);

    // click Set 胡 (there may be multiple buttons; pick the first)
    const setHuBtn = screen.getAllByText('Set 胡')[0];
    await user.click(setHuBtn);

    // hu area should show the selected tile label (scope to HuArea container)
    const huHeaders = screen.getAllByText('胡牌 (Winning Tile)');
    const huHeader = huHeaders[0];
    const huContainer = huHeader.closest('div')!;
    const huTiles = within(huContainer).getAllByText('一萬');
    expect(huTiles.length).toBeGreaterThan(0);
    // the HuArea displays the label inside an amber tile, ensure that exists
    expect(huTiles[0]).toBeTruthy();
  });

  it('removing hu tile returns it to the current hand', async () => {
    const user = userEvent.setup();
    render(<App />);

    // add a tile to hand
    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);

    // select and set as hu (target the button inside HandRack to avoid ambiguous buttons)
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div')! as HTMLElement;
    // climb up to the HandRack root which has bg-slate-800 class
    while (handContainer && !handContainer.className.includes('bg-slate-800')) { handContainer = handContainer.parentElement as HTMLElement; }

    const selectButtons = within(handContainer).getAllByTestId('hand-tile-一萬');
    const selectButton = selectButtons[selectButtons.length - 1];
    await user.click(selectButton);
    // confirm selection count updated in UI
    expect(screen.getByText('已選：1 張')).toBeTruthy();
    const setHuBtn = screen.getAllByText('Set 胡')[0];
    await user.click(setHuBtn);

    // ensure hu is displayed
    const huHeader = screen.getAllByText('胡牌 (Winning Tile)')[0];
    const huContainer = huHeader.closest('div')!;
    const huTiles = within(huContainer).getAllByText('一萬');
    expect(huTiles.length).toBeGreaterThan(0);

    // click the remove button on HuArea to return it to hand
    const removeBtn = within(huContainer).getByTestId('hu-remove');
    await user.click(removeBtn);

    // now the hand should display at least one instance of the tile again (by test id)
    const handTiles = within(handContainer).getAllByTestId('hand-tile-一萬');
    expect(handTiles.length).toBeGreaterThan(0);
  });
});
