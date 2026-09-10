import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HuArea } from '../../src/components/HuArea';
import { SUIT } from '../../src/types/mahjong';

const huTile = {
  id: 'hu',
  suit: SUIT.CHARACTER,
  value: 1,
  label: '一萬',
};

describe('HuArea', () => {
  afterEach(() => cleanup());

  it('toggles self-draw with click and keyboard and removes the winning tile', async () => {
    const user = userEvent.setup();
    const onToggleZimo = vi.fn();
    const onRemoveHu = vi.fn();
    render(
      <HuArea
        huTile={huTile}
        huIsZimo={false}
        onToggleZimo={onToggleZimo}
        onRemoveHu={onRemoveHu}
      />
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);
    await user.type(toggle, '{enter}');
    await user.keyboard(' ');
    await user.click(screen.getByTestId('hu-remove'));
    expect(onToggleZimo).toHaveBeenCalledTimes(4);
    expect(onRemoveHu).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state and tolerates an omitted toggle callback', async () => {
    const user = userEvent.setup();
    render(<HuArea onRemoveHu={vi.fn()} />);
    expect(screen.getByText(/尚未選擇胡牌/)).toBeTruthy();
    await user.click(screen.getByRole('switch'));
  });
});
