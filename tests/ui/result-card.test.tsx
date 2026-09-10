import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ResultCard } from '../../src/components/ResultCard';
import { ErrorDialog } from '../../src/components/ErrorDialog';

describe('result and error feedback', () => {
  afterEach(() => cleanup());

  it('renders valid fan breakdown and combinations', () => {
    render(
      <ResultCard
        result={{
          isValid: true,
          totalFan: 120,
          breakdown: [{ rule: '十三么', fan: 100 }, { rule: '十三扉十三么', fan: 20 }],
          possibleCombinations: ['一萬x2, 東x3']
        }}
      />
    );

    expect(screen.getAllByText('120 番')).toHaveLength(2);
    expect(screen.getByText('十三么')).toBeTruthy();
    expect(screen.getByText('十三扉十三么')).toBeTruthy();
    expect(screen.getByText('一萬x2, 東x3')).toBeTruthy();
  });

  it('renders invalid reason without valid-hand details', () => {
    render(<ResultCard result={{ isValid: false, totalFan: 0, breakdown: [], reason: '手牌不足' }} />);
    expect(screen.getByText('無效')).toBeTruthy();
    expect(screen.getByText('手牌不足')).toBeTruthy();
    expect(screen.queryByText('可胡組合')).toBeNull();
  });

  it('does not render when there is no calculation result', () => {
    const { container } = render(<ResultCard result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('closes the error dialog from its button and backdrop', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ErrorDialog message="錯誤" onClose={onClose} />);
    fireEvent.click(screen.getByText('關閉'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('錯誤').parentElement?.previousElementSibling as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(<ErrorDialog message={null} onClose={onClose} />);
    expect(screen.queryByText('錯誤')).toBeNull();
  });
});
