import { useCallback, useEffect, useRef } from "react";

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onBackspace?: () => void;
  onEscape?: () => void;
  onQuestionMark?: () => void;
  enabled?: boolean;
  isSubmitting?: boolean;
}

const ENTER_DEBOUNCE_MS = 300;

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onBackspace,
    onEscape,
    onQuestionMark,
    enabled = true,
    isSubmitting = false,
  } = options;

  const lastEnterTime = useRef(0);
  const handlersRef = useRef({ ...options, isSubmitting });
  handlersRef.current = { ...options, isSubmitting };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!handlersRef.current.enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          handlersRef.current.onArrowUp?.();
          break;
        case "ArrowDown":
          event.preventDefault();
          handlersRef.current.onArrowDown?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlersRef.current.onArrowLeft?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlersRef.current.onArrowRight?.();
          break;
        case "Enter":
          event.preventDefault();
          if (!handlersRef.current.isSubmitting) {
            const now = Date.now();
            if (now - lastEnterTime.current >= ENTER_DEBOUNCE_MS) {
              lastEnterTime.current = now;
              handlersRef.current.onEnter?.();
            }
          }
          break;
        case "Backspace":
          event.preventDefault();
          handlersRef.current.onBackspace?.();
          break;
        case "Escape":
          event.preventDefault();
          handlersRef.current.onEscape?.();
          break;
        case "?":
          event.preventDefault();
          handlersRef.current.onQuestionMark?.();
          break;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
