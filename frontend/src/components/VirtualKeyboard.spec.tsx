import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VirtualKeyboard, KeyStatus } from './VirtualKeyboard';

describe('VirtualKeyboard', () => {
  it('renders all letter keys', () => {
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Letter Q/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Letter A/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Letter Z/i })).toBeInTheDocument();
  });

  it('renders ENTER and BACKSPACE action keys', () => {
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Submit word/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete last letter/i })).toBeInTheDocument();
  });

  it('calls onKeyPress with correct letter when key is clicked', () => {
    const onKeyPress = vi.fn();
    render(<VirtualKeyboard onKeyPress={onKeyPress} onEnter={vi.fn()} onBackspace={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Letter Q/i }));
    expect(onKeyPress).toHaveBeenCalledWith('Q');
  });

  it('calls onEnter when ENTER is clicked', () => {
    const onEnter = vi.fn();
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={onEnter} onBackspace={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('calls onBackspace when BACKSPACE is clicked', () => {
    const onBackspace = vi.fn();
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={onBackspace} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete last letter/i }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('applies correct green background for correct status', () => {
    const keyStatuses: Record<string, KeyStatus> = { A: 'correct' };
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} keyStatuses={keyStatuses} />);
    const key = screen.getByRole('button', { name: /Letter A/i });
    expect(key.className).toContain('bg-green-600');
  });

  it('applies yellow background for present status', () => {
    const keyStatuses: Record<string, KeyStatus> = { B: 'present' };
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} keyStatuses={keyStatuses} />);
    const key = screen.getByRole('button', { name: /Letter B/i });
    expect(key.className).toContain('bg-yellow-500');
  });

  it('applies dark gray background for absent status', () => {
    const keyStatuses: Record<string, KeyStatus> = { C: 'absent' };
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} keyStatuses={keyStatuses} />);
    const key = screen.getByRole('button', { name: /Letter C/i });
    expect(key.className).toContain('bg-gray-600');
  });

  it('disables all keys when disabled prop is true', () => {
    render(<VirtualKeyboard onKeyPress={vi.fn()} onEnter={vi.fn()} onBackspace={vi.fn()} disabled />);
    const keys = screen.getAllByRole('button');
    keys.forEach((key) => {
      expect(key).toBeDisabled();
    });
  });

  it('does not call handlers when disabled', () => {
    const onKeyPress = vi.fn();
    const onEnter = vi.fn();
    const onBackspace = vi.fn();
    render(<VirtualKeyboard onKeyPress={onKeyPress} onEnter={onEnter} onBackspace={onBackspace} disabled />);
    fireEvent.click(screen.getByRole('button', { name: /Letter Q/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit word/i }));
    fireEvent.click(screen.getByRole('button', { name: /Delete last letter/i }));
    expect(onKeyPress).not.toHaveBeenCalled();
    expect(onEnter).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
  });
});
