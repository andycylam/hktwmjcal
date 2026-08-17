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
    const prevailingContainer = prevailingHeader.closest('div')!;
    const southBtn = within(prevailingContainer).getByText('南');
    await user.click(southBtn);
    // After clicking, button should have selected styling (bg-emerald-500)
    expect(southBtn.className).toContain('bg-emerald-500');

    // Seat selection
    const seatHeader = screen.getByText('座位 (Your Seat)');
    expect(seatHeader).toBeTruthy();
    const seatContainer = seatHeader.closest('div')!;
    const westBtn = within(seatContainer).getByText('西');
    await user.click(westBtn);
    expect(westBtn.className).toContain('bg-emerald-500');

  });
});
