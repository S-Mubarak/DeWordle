'use client';

import React from 'react';

export type KeyStatus = 'correct' | 'present' | 'absent' | 'idle';

export interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  keyStatuses?: Record<string, KeyStatus>;
  disabled?: boolean;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const STATUS_STYLES: Record<KeyStatus, string> = {
  correct: 'bg-green-600 text-white border-green-700',
  present: 'bg-yellow-500 text-white border-yellow-600',
  absent: 'bg-gray-600 text-white border-gray-700',
  idle: 'bg-dark-300 text-white border-dark-400 hover:bg-dark-400',
};

interface KeyButtonProps {
  label: string;
  status: KeyStatus;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}

function areKeyButtonPropsEqual(prev: KeyButtonProps, next: KeyButtonProps): boolean {
  return (
    prev.label === next.label &&
    prev.status === next.status &&
    prev.disabled === next.disabled &&
    prev.wide === next.wide &&
    prev.onClick === next.onClick
  );
}

const KeyButton = React.memo(function KeyButton({
  label,
  status,
  onClick,
  disabled = false,
  wide = false,
}: KeyButtonProps) {
  const isAction = label === 'ENTER' || label === 'BACKSPACE';
  const displayLabel = label === 'BACKSPACE' ? '⌫' : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === 'BACKSPACE' ? 'Delete last letter' : label === 'ENTER' ? 'Submit word' : `Letter ${label}`}
      className={`
        flex items-center justify-center rounded-md border font-bold uppercase select-none
        transition-colors duration-150
        ${wide ? 'w-16 sm:w-20 text-xs' : 'w-9 sm:w-11 text-sm'}
        h-12 sm:h-14
        ${STATUS_STYLES[status]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
    >
      {displayLabel}
    </button>
  );
}, areKeyButtonPropsEqual);

export function VirtualKeyboard({
  onKeyPress,
  onEnter,
  onBackspace,
  keyStatuses = {},
  disabled = false,
}: VirtualKeyboardProps) {
  const handleKeyClick = (key: string) => {
    if (disabled) return;
    if (key === 'ENTER') {
      onEnter();
    } else if (key === 'BACKSPACE') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5" role="group" aria-label="Virtual keyboard">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.map((key) => (
            <KeyButton
              key={key}
              label={key}
              status={keyStatuses[key] ?? 'idle'}
              onClick={() => handleKeyClick(key)}
              disabled={disabled}
              wide={key === 'ENTER' || key === 'BACKSPACE'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
