/**
 * Performance benchmarks for session result calculation.
 * Run with: npx ts-node backend/src/game/session-result.bench.ts
 */

function calculateSessionResult(guess: string, target: string): string[] {
  const result: string[] = Array(guess.length).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");

  // Mark correct positions
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "correct";
      targetArr[i] = "#";
      guessArr[i] = "*";
    }
  }

  // Mark present letters
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === "*") continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = "present";
      targetArr[idx] = "#";
    }
  }

  return result;
}

const ITERATIONS = 100_000;
const pairs = [
  ["crane", "trace"],
  ["slate", "stale"],
  ["arise", "raise"],
];

for (const [guess, target] of pairs) {
  const start = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    calculateSessionResult(guess, target);
  }
  const duration = Date.now() - start;
  console.log(`${guess} vs ${target}: ${ITERATIONS} iterations in ${duration}ms (${(duration / ITERATIONS).toFixed(4)}ms/op)`);
}