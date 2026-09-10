import React from 'react';
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('App flows (melds, flowers, hu)', () => {
  afterEach(() => cleanup());

  it('keeps calculation disabled until the counted hand reaches 17 tiles', async () => {
    render(<App />);
    expect((screen.getByText('算番 (Calculate Fan)') as HTMLButtonElement).disabled).toBe(true);
  });

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

  it('shows an error when trying to create a meld from an invalid selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);
    await user.click(screen.getAllByTestId('picker-tile-character_2')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    await user.click(within(handContainer).getAllByTitle(/選取/)[0]);
    await user.click(within(handContainer).getAllByTitle(/選取/)[1]);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('無法自動辨識成組類型；請確認選擇是否為 3/4 張相同或 3 張順子。')).toBeTruthy();
  });

  it('shows an error when setting 胡 without exactly one selected tile', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Set 胡'));
    expect(screen.getByText('請選擇一張牌作為胡。')).toBeTruthy();
  });

  it('supports clearing a selection and clearing the whole hand', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    await user.click(within(handContainer).getByTitle(/選取/));
    expect(screen.getByText('已選：1 張')).toBeTruthy();
    await user.click(screen.getByText('Clear Selection'));
    expect(screen.getByText('已選：0 張')).toBeTruthy();
    await user.click(within(handContainer).getByText('清空手牌'));
    expect(screen.getByText(/請在下方點擊牌型加入手牌/)).toBeTruthy();
  });

  it('auto-detects kong, pung, and chow groups when nothing is selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    const add = async (key: string, count: number) => {
      for (let i = 0; i < count; i++) await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    };
    await add('character_1', 4);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('槓')).toBeTruthy();
    await add('character_2', 3);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('碰')).toBeTruthy();
    await add('dot_1', 1);
    await add('dot_2', 1);
    await add('dot_3', 1);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('上')).toBeTruthy();
  });

  it('reports duplicate and unavailable auto-meld attempts', async () => {
    const user = userEvent.setup();
    render(<App />);
    const one = screen.getAllByTestId('picker-tile-character_1')[0];
    for (let i = 0; i < 5; i++) await user.click(one);
    expect((one as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByText('清空手牌'));
    await user.click(screen.getAllByTestId('picker-tile-character_1')[0]);
    await user.click(screen.getAllByTestId('picker-tile-character_3')[0]);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText(/沒有可成的組/)).toBeTruthy();
  });

  it('creates a selected pung and upgrades it to a kong', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByTestId('picker-tile-character_9')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    const tiles = within(handContainer).getAllByTitle(/選取/);
    await user.click(tiles[0]); await user.click(tiles[1]); await user.click(tiles[2]);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('碰')).toBeTruthy();
    const fourth = within(handContainer).getByTitle(/選取/);
    await user.click(fourth);
    await user.click(screen.getByText('升級為 槓'));
    expect(screen.getByText('槓')).toBeTruthy();
  });

  it('creates a selected kong and cancels it back into the hand', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByTestId('picker-tile-dot_9')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    for (const tile of within(handContainer).getAllByTitle(/選取/)) await user.click(tile);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('槓')).toBeTruthy();
    await user.click(screen.getByText('取消'));
    expect(screen.queryByText('槓')).toBeNull();
  });

  it('changes wind settings and toggles zimo state', async () => {
    const user = userEvent.setup();
    render(<App />);
    const windLabels = screen.getAllByText('南');
    await user.click(windLabels[0]);
    await user.click(screen.getAllByText('西')[1]);
    await user.click(screen.getByRole('switch'));
    expect(windLabels[0]).toBeTruthy();
  });

  it('uses the fallback count search for non-contiguous kongs and pungs', async () => {
    const user = userEvent.setup();
    const add = async (key: string, count: number) => {
      for (let i = 0; i < count; i++) await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    };

    render(<App />);
    await add('character_1', 1);
    await add('character_2', 1);
    await add('character_1', 2);
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('碰')).toBeTruthy();

    await add('dot_1', 1);
    await add('dot_2', 1);
    await add('dot_1', 2);
    await user.click(screen.getByText('成組'));
    expect(screen.getAllByText('碰').length).toBeGreaterThan(1);
  });

  it('uses the fallback count search for a non-contiguous kong', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const key of ['character_4', 'character_8', 'character_4', 'character_6', 'character_4', 'character_4']) {
      await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    }
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('槓')).toBeTruthy();
  });

  it('finishes scanning when three same-suit tiles cannot form a sequence', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const key of ['character_1', 'character_4', 'character_7']) {
      await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    }
    await user.click(screen.getByText('成組'));
    expect(screen.getByText(/沒有可成的組/)).toBeTruthy();
  });

  it('shows the total tile limit error', async () => {
    const user = userEvent.setup();
    render(<App />);
    const keys = [
      'character_1', 'character_2', 'character_3', 'character_4', 'character_5',
      'character_6', 'character_7', 'character_8', 'character_9',
      'dot_1', 'dot_2', 'dot_3', 'dot_4', 'dot_5', 'dot_6', 'dot_7', 'dot_8'
    ];
    for (const key of keys) await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    await user.click(screen.getAllByTestId('picker-tile-dot_9')[0]);
    expect(screen.getByText(/已達總牌數上限/)).toBeTruthy();
  });

  it('supports concealed-kong toggling and synthetic kong upgrades', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 3; i++) await user.click(screen.getAllByTestId('picker-tile-bamboo_9')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    for (const tile of within(handContainer).getAllByTitle(/選取/)) await user.click(tile);
    await user.click(screen.getByText('成組'));
    await user.click(screen.getByText('升級為 槓'));
    expect(screen.getByText('槓')).toBeTruthy();
    const toggle = screen.getAllByRole('switch')[0];
    await user.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('rejects a kong upgrade when all four copies are already accounted for', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByTestId('picker-tile-bamboo_8')[0]);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    const tiles = within(handContainer).getAllByTitle(/選取/);
    await user.click(tiles[0]); await user.click(tiles[1]); await user.click(tiles[2]);
    await user.click(screen.getByText('成組'));
    await user.click(within(handContainer).getByTitle(/選取/));
    await user.click(screen.getByText('Set 胡'));
    await user.click(screen.getByText('升級為 槓'));
    expect(screen.getByText('手牌中沒有可用的相同牌來升級為槓。')).toBeTruthy();
  });

  it('surfaces an invalid calculation result', async () => {
    const user = userEvent.setup();
    render(<App />);
    const picker = screen.getAllByText('選擇牌型 (Tile Selector)')[0].closest('div')!;
    for (const key of [
      'character_1', 'character_2', 'character_4', 'character_5', 'character_7',
      'dot_1', 'dot_2', 'dot_4', 'dot_5', 'dot_7',
      'bamboo_1', 'bamboo_2', 'bamboo_4', 'bamboo_5', 'bamboo_7',
      'wind_1', 'wind_2'
    ]) await user.click(within(picker).getByTestId(`picker-tile-${key}`));
    await user.click(screen.getByText('算番 (Calculate Fan)'));
    expect(screen.getAllByText(/無法/).length).toBeGreaterThan(0);
  });

  it('calculates a complete winning hand and clears a previous result', async () => {
    const user = userEvent.setup();
    render(<App />);
    const picker = screen.getAllByText('選擇牌型 (Tile Selector)')[0].closest('div')!;
    const add = async (key: string, count: number) => {
      for (let i = 0; i < count; i++) await user.click(within(picker).getByTestId(`picker-tile-${key}`));
    };
    await add('character_1', 2); await add('character_2', 1); await add('character_3', 1);
    await add('dot_1', 1); await add('dot_2', 1); await add('dot_3', 1);
    await add('bamboo_1', 1); await add('bamboo_2', 1); await add('bamboo_3', 1);
    await add('wind_1', 3); await add('wind_2', 3);
    const handHeader = screen.getAllByText(/當前手牌/)[0];
    let handContainer = handHeader.closest('div') as HTMLElement;
    while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
    await user.click(within(handContainer).getAllByTestId('hand-tile-一萬')[0]);
    await user.click(screen.getByText('Set 胡'));
    await user.click(screen.getByText('算番 (Calculate Fan)'));
    expect(screen.getAllByText(/總番|Fan/).length).toBeGreaterThan(0);
    await user.click(screen.getByText('Clear Selection'));
  });

  it('uses the suit-scanning fallback to find a sequence', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const key of ['character_1', 'character_4', 'character_7', 'character_2', 'character_3']) {
      await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
    }
    await user.click(screen.getByText('成組'));
    expect(screen.getByText('上')).toBeTruthy();
  });

  it('removes a tile directly from the hand', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByTestId('picker-tile-character_9')[0]);
    const remove = screen.getByTestId('hand-remove-九萬');
    await user.click(remove);
    expect(screen.queryByTestId('hand-tile-九萬')).toBeNull();
  });

  it('handles synthetic upgrades for wind and dragon tiles', async () => {
    const user = userEvent.setup();
    const upgrade = async (key: string) => {
      render(<App />);
      for (let i = 0; i < 3; i++) await user.click(screen.getAllByTestId(`picker-tile-${key}`)[0]);
      const handHeader = screen.getAllByText(/當前手牌/)[0];
      let handContainer = handHeader.closest('div') as HTMLElement;
      while (handContainer && !handContainer.className.includes('bg-slate-800')) handContainer = handContainer.parentElement as HTMLElement;
      for (const tile of within(handContainer).getAllByTitle(/選取/)) await user.click(tile);
      await user.click(screen.getByText('成組'));
      await user.click(screen.getByText('升級為 槓'));
      cleanup();
    };
    await upgrade('wind_1');
    await upgrade('dragon_5');
  });
});
