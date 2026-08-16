import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Calculate button', () => {
  it('remains enabled when melds present and total counted tiles == 17', async () => {
    const user = userEvent.setup();
    render(<App />);

    // add tiles: make sure 一萬, 二萬, 三萬 are added first so selection picks them
    const pickers = screen.getAllByText('選擇牌型 (Tile Selector)');
    const picker = pickers[0].closest('div')!;
    const p = within(picker);

    await user.click(p.getByText('一萬'));
    await user.click(p.getByText('二萬'));
    await user.click(p.getByText('三萬'));

    const others = ['四萬','五萬','六萬','七萬','八萬','九萬','一筒','二筒','三筒','一索','二索','三索','東','中'];
    for (const lbl of others) {
      await user.click(p.getByText(lbl));
    }

    // Calculate should be enabled when there are 17 counted tiles in hand
    const calcBtn = screen.getByText('算番 (Calculate Fan)');
    expect((calcBtn as HTMLButtonElement).disabled).toBe(false);

    // select first three tiles in hand (these correspond to the three we added first)
    const selectButtons = screen.getAllByTitle(/選取/);
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);
    await user.click(selectButtons[2]);

    // create meld
    const createBtn = screen.getByText('成組');
    await user.click(createBtn);

    // After forming a meld, hand length drops but meld tiles are counted — Calculate should still be enabled
    const calcBtnAfter = screen.getByText('算番 (Calculate Fan)');
    expect((calcBtnAfter as HTMLButtonElement).disabled).toBe(false);
  });
});
