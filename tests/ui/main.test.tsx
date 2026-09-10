import { beforeEach, describe, expect, it, vi } from 'vitest';

const render = vi.fn();
const createRoot = vi.fn(() => ({ render }));

vi.mock('react-dom/client', () => ({ default: { createRoot }, createRoot }));

describe('browser entrypoint', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
    render.mockClear();
    createRoot.mockClear();
  });

  it('mounts the React application into the root element', async () => {
    await import('../../src/main');
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
  });
});
