import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Winds UI', () => {
  it('renders wind selectors and allows selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Prevailing wind section
    expect(screen.getByText('場風 (Prevailing Wind)')).toBeTruthy();
    const southBtn = screen.getAllByText('南').find(btn => btn.tagName === 'BUTTON');
    if (!southBtn) throw new Error('南 button not found');
    await user.click(southBtn);
    // After clicking, button should have selected styling (bg-emerald-500)
    expect(southBtn.className).toContain('bg-emerald-500');

    // Seat selection
    expect(screen.getByText('座位 (Your Seat)')).toBeTruthy();
    const westBtn = screen.getAllByText('西').find(btn => btn.tagName === 'BUTTON');
    if (!westBtn) throw new Error('西 button not found');
    await user.click(westBtn);
    expect(westBtn.className).toContain('bg-emerald-500');

  });
});
