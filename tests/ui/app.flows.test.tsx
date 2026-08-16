import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('App flows (melds, flowers, hu)', () => {
  it('can create and cancel a shang (sequence) via selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    // find tile picker and click 一萬, 二萬, 三萬 to add them to hand
    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);
    await user.click(p.getByText('一萬'));
    await user.click(p.getByText('二萬'));
    await user.click(p.getByText('三萬'));

    // select three tiles in hand
    const selectButtons = screen.getAllByTitle(/選取/);
    // click the first three selection buttons
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);
    await user.click(selectButtons[2]);

    // create meld
    const createBtn = screen.getByText('成組');
    await user.click(createBtn);

    // expect a shang label '上' to appear
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

    // find the flower tile element rendered in the meld area (look for an ancestor with the meld tile bg class)
    const allF1 = screen.getAllByText('🀦1');
    let flower1El = allF1.find(el => el.closest('div')?.className.includes('bg-slate-700')) || allF1[0];
    // climb ancestors to find the tile container that has the cancel button
    let node: HTMLElement | null = flower1El as HTMLElement;
    while (node && !node.className?.includes('bg-slate-700')) {
      node = node.parentElement;
    }
    const flower1Container = node!;
    const cancelBtn = within(flower1Container).getByTitle('取消');
    await user.click(cancelBtn);

    // 🀦1 should be removed from the meld area; there may still be occurrences in the picker
    const remainingF1 = screen.queryAllByText('🀦1').filter(el => el.closest('div')?.className.includes('bg-slate-700'));
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
    await user.click(p.getByText('一萬'));

    // select the tile in hand
    const selectButtons = screen.getAllByTitle(/選取/);
    await user.click(selectButtons[0]);

    // click Set 胡 (there may be multiple buttons; pick the first)
    const setHuBtn = screen.getAllByText('Set 胡')[0];
    await user.click(setHuBtn);

    // hu area should show the selected tile label (scope to HuArea container)
    const huHeaders = screen.getAllByText('胡牌 (Winning Tile)');
    const huHeader = huHeaders[0];
    const huContainer = huHeader.closest('div')!;
    expect(within(huContainer).getByText('一萬')).toBeTruthy();
    // the HuArea displays the label inside an amber tile, ensure that exists
    const huTile = within(huContainer).getByText('一萬');
    expect(huTile).toBeTruthy();
  });
});
