const LIGHT_RING_COLOR = '#4361ee';
const DARK_RING_COLOR = '#818cf8';

const DARK_BG = '#0a0a0a';
const LIGHT_BG = '#ffffff';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getFocusRingContrast(ringColor: string, bgColor: string): number {
  const [r1, g1, b1] = hexToRgb(ringColor);
  const [r2, g2, b2] = hexToRgb(bgColor);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function applyFocusRingStyles(
  element: HTMLElement,
  isDark: boolean
): void {
  const ringColor = isDark ? DARK_RING_COLOR : LIGHT_RING_COLOR;
  element.style.outlineColor = ringColor;
  element.style.outlineWidth = '2px';
  element.style.outlineOffset = '2px';
  element.style.borderRadius = '2px';

  if (isDark) {
    element.style.boxShadow = '0 0 0 4px rgba(129, 140, 248, 0.3)';
  } else {
    element.style.boxShadow = 'none';
  }
}
