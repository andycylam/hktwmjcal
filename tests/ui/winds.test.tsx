import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Winds UI', () => {
  it('renders wind selectors and allows selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Prevailing wind section
    const prevailingHeader = screen.getByText('場風 (Prevailing Wind)');
    expect(prevailingHeader).toBeTruthy();
    let prevailingContainer = prevailingHeader.closest('div')! as HTMLElement;
    // climb to the wrapper with bg-slate-900 class
    while (prevailingContainer && !prevailingContainer.className.includes('bg-slate-900')) {
      prevailingContainer = prevailingContainer.parentElement as HTMLElement;
    }
    const southBtn = within(prevailingContainer).getByText('南');
    await user.click(southBtn);
    // After clicking, button should have selected styling (bg-emerald-500)
    expect(southBtn.className).toContain('bg-emerald-500');

    // Seat selection
    const seatHeader = screen.getByText('座位 (Your Seat)');
    expect(seatHeader).toBeTruthy();
    let seatContainer = seatHeader.closest('div')! as HTMLElement;
    while (seatContainer && !seatContainer.className.includes('bg-slate-900')) {
      seatContainer = seatContainer.parentElement as HTMLElement;
    }
    const westBtn = within(seatContainer).getByText('西');
    await user.click(westBtn);
    expect(westBtn.className).toContain('bg-emerald-500');

  });
});
