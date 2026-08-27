# Guide: Writing Storybook Component Stories

> Resolves #1299

## Overview

Storybook lets you develop and test UI components in isolation. DeWordle has Storybook configured for the frontend with an existing example at `frontend/src/components/SessionResultCard.stories.tsx`.

## Setup

Storybook is already installed. Run it:

```bash
cd frontend
npm run storybook
```

This opens the Storybook UI at `http://localhost:6000`.

## File Naming Convention

Stories live **colocated** with their component:

```
frontend/src/components/
├── SessionResultCard.tsx
├── SessionResultCard.stories.tsx    ← story file
├── SettingsPanel.tsx
├── SettingsPanel.stories.tsx        ← your new story
```

Pattern: `<ComponentName>.stories.tsx`

## Basic Story Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import MyComponent from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Category/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    // Define controls for props
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default prop values
    label: 'Click me',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary',
    variant: 'secondary',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    disabled: true,
  },
};
```

## Organizing Stories

Use the `title` field to organize in the sidebar:

| Title Pattern | Sidebar Location |
|---------------|-----------------|
| `'Game/SessionResultCard'` | Game → SessionResultCard |
| `'Layout/Header'` | Layout → Header |
| `'UI/Button'` | UI → Button |

## Best Practices

### 1. Test All Visual States

Include stories for every variant, size, and state:

```tsx
export const Loading: Story = {
  args: { loading: true },
};

export const WithError: Story = {
  args: { error: 'Something went wrong' },
};
```

### 2. Use Autodocs

Add `tags: ['autodocs']` to auto-generate documentation pages.

### 3. Mock External Dependencies

If your component uses React Context or API calls, wrap it:

```tsx
export const WithProvider: Story = {
  decorators: [
    (Story) => (
      <SettingsProvider>
        <Story />
      </SettingsProvider>
    ),
  ],
};
```

### 4. Accessibility Testing

Storybook has built-in a11y addon. Test keyboard navigation and screen reader compatibility.

### 5. Responsive Design

Use the viewport addon to test different screen sizes:

```tsx
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
```

## Existing Stories

| File | Component | Description |
|------|-----------|-------------|
| `SessionResultCard.stories.tsx` | SessionResultCard | Game result display card |

## Adding a New Story: Step by Step

1. Create `<ComponentName>.stories.tsx` next to the component
2. Import the component and define `Meta`
3. Export stories for each visual state
4. Run `npm run storybook` to preview
5. Use Storybook's controls to interact with props
6. Take snapshots for visual regression (if configured)

## Running Tests

```bash
# Visual regression tests
npx playwright test visual-regression.spec.ts

# Accessibility tests
npx playwright test accessibility.spec.ts
```
