import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyFocusRingStyles, getFocusRingContrast } from '../lib/focus-ring-utils';

describe('focus-ring-utils', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.className = 'dark';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  it('returns accessible contrast ratio for dark mode focus ring', () => {
    const ratio = getFocusRingContrast('#818cf8', '#0a0a0a');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('returns accessible contrast ratio for light mode focus ring', () => {
    const ratio = getFocusRingContrast('#4361ee', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('applies dark mode focus ring styles to element', () => {
    const button = document.createElement('button');
    root.appendChild(button);
    applyFocusRingStyles(button, true);
    expect(button.style.outlineColor).toBe('#818cf8');
  });

  it('applies light mode focus ring styles to element', () => {
    const button = document.createElement('button');
    root.appendChild(button);
    applyFocusRingStyles(button, false);
    expect(button.style.outlineColor).toBe('#4361ee');
  });

  it('dark mode focus ring has box-shadow', () => {
    const button = document.createElement('button');
    root.appendChild(button);
    applyFocusRingStyles(button, true);
    expect(button.style.boxShadow).toContain('rgba(129, 140, 248');
  });
});
