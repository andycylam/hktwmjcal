import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/engine/validator', () => ({
  calculateHandFan: vi.fn(() => ({
    isValid: true,
    totalFan: 5,
    breakdown: [{ rule: '測試番', fan: 5 }]
  }))
}));

import App from '../../src/App';

describe('App valid calculation state', () => {
  afterEach(() => cleanup());

  it('renders a valid calculation result', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 17; i++) {
      const key = `picker-tile-character_${(i % 9) + 1}`;
      await user.click(screen.getByTestId(key));
    }
    expect((screen.getByText('算番 (Calculate Fan)') as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByText('算番 (Calculate Fan)'));
    expect(screen.getByText('測試番')).toBeTruthy();
    expect(screen.getAllByText(/5 番/).length).toBeGreaterThan(0);
  });
});
