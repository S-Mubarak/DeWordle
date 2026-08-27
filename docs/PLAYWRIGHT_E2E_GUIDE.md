# Guide: Setting Up Local Playwright E2E Testing Environment

> Resolves #1302

## Prerequisites

- Node.js 18+
- npm
- Git

## Installation

```bash
cd frontend
npm install
```

### Install Playwright Browsers

```bash
cd frontend
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers (~400MB total).

To install only specific browsers:

```bash
npx playwright install chromium     # Chromium only
npx playwright install firefox       # Firefox only
npx playwright install webkit        # WebKit (Safari) only
```

## Configuration

The Playwright config is at `frontend/playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

### Key Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `testDir` | `./e2e` | Test files location |
| `baseURL` | `http://localhost:3000` | Override via `PLAYWRIGHT_BASE_URL` |
| `retries` | 0 (local), 2 (CI) | Retry failed tests |
| `workers` | auto (local), 1 (CI) | Parallel test execution |
| `trace` | `on-first-retry` | Capture trace on first failure |

## Running Tests

### Run All Tests

```bash
cd frontend
npx playwright test
```

Or via npm script:

```bash
npm run test:cross-browser
```

### Run a Specific Test File

```bash
npx playwright test accessibility.spec.ts
npx playwright test visual-regression.spec.ts
```

### Run Tests for a Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

This opens the Playwright Inspector for step-by-step debugging.

## Viewing Results

### HTML Report

```bash
npx playwright show-report
```

Opens the report at `http://localhost:9323`.

### Trace Viewer

When a test fails, a trace is saved. View it:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Game Page', () => {
  test('should display the game board', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });

  test('should submit a guess', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="guess-input"]', 'HELLO');
    await page.click('[data-testid="submit-guess"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best Practices

1. **Use `data-testid`** selectors instead of CSS classes or text content
2. **Avoid hard-coded waits** — use `expect(...).toBeVisible()` which auto-waits
3. **Use `page.goto()`** for navigation, not click chains
4. **Keep tests independent** — each test should work in isolation
5. **Use `test.describe()`** to group related tests
6. **Mock API calls** when testing UI without a real backend

### Page Object Model

For complex pages, create page objects:

```typescript
// e2e/pages/GamePage.ts
export class GamePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async submitGuess(word: string) {
    await this.page.fill('[data-testid="guess-input"]', word);
    await this.page.click('[data-testid="submit-guess"]');
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | App URL to test against |
| `CI` | — | Set in CI for retry/workers config |

## CI Integration

Playwright tests run in CI with:
- 2 retries on failure
- Single worker (sequential execution)
- Chromium only (fastest)
- HTML report artifact

```yaml
# In GitHub Actions
- run: cd frontend && npx playwright test --project=chromium
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Browser not found | Run `npx playwright install` |
| Timeout on navigation | Check `PLAYWRIGHT_BASE_URL` and app is running |
| Flaky tests | Use auto-waiting assertions, avoid `setTimeout` |
| `test.use()` error | Call it inside `test.describe()` block |
