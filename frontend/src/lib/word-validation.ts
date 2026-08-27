export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const WORD_LENGTH = 5;
const VALID_LETTERS = /^[A-Z]+$/;

export function validateGuess(guess: string, validWords: string[]): ValidationResult {
  const normalizedGuess = guess.trim().toUpperCase();

  if (!normalizedGuess) {
    return { isValid: false, error: 'Guess cannot be empty' };
  }

  if (normalizedGuess.length !== WORD_LENGTH) {
    return {
      isValid: false,
      error: `Guess must be exactly ${WORD_LENGTH} letters. Got ${normalizedGuess.length}.`,
    };
  }

  if (!VALID_LETTERS.test(normalizedGuess)) {
    return { isValid: false, error: 'Guess must contain only letters A-Z' };
  }

  const normalizedWords = new Set(validWords.map((word) => word.trim().toUpperCase()));
  if (!normalizedWords.has(normalizedGuess)) {
    return { isValid: false, error: `"${normalizedGuess}" is not a valid word` };
  }

  return { isValid: true };
}

export function calculateLetterStatuses(
  guess: string,
  targetWord: string
): ('correct' | 'present' | 'absent')[] {
  const result: ('correct' | 'present' | 'absent')[] = new Array(guess.length).fill('absent');
  const targetLetters = targetWord.toUpperCase().split('');
  const guessLetters = guess.toUpperCase().split('');
  const used = new Array(targetLetters.length).fill(false);

  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  for (let i = 0; i < guessLetters.length; i++) {
    if (result[i] === 'correct') continue;

    for (let j = 0; j < targetLetters.length; j++) {
      if (!used[j] && guessLetters[i] === targetLetters[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

export function isGameWon(statuses: ('correct' | 'present' | 'absent')[]): boolean {
  return statuses.every((s) => s === 'correct');
}
