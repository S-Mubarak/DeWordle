# ADR 0007: Dark Mode Theme Implementation

## Status

Proposed

## Context

DeWordle's frontend uses Next.js with Tailwind CSS. A `SettingsProvider` context manages user preferences, and the app needs a consistent dark mode implementation. Currently, there is no formal dark mode strategy — components may or may not have dark variants.

## Decision

### 1. Tailwind CSS `dark:` Variant with `class` Strategy

Configure Tailwind to use the `class` strategy for dark mode:

```js
// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  // ...
};
```

This toggles dark mode by adding/removing the `dark` class on the `<html>` element.

### 2. System Preference as Default

On first visit, detect `prefers-color-scheme: dark` and set the theme accordingly:

```tsx
// In SettingsProvider or layout
useEffect(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');
}, []);
```

### 3. localStorage Persistence

Store the user's theme preference in `localStorage` so it persists across sessions:

```tsx
const savedTheme = localStorage.getItem('theme');
// Apply on mount
```

### 4. Manual Toggle

Provide a theme toggle in the `SettingsPanel` component:

```tsx
<button onClick={toggleTheme}>
  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
</button>
```

### 5. CSS Custom Properties for Complex Colors

For colors that need more nuance than Tailwind's palette, define CSS custom properties in `globals.css`:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #111827;
  --border-color: #e5e7eb;
}

.dark {
  --bg-primary: #111827;
  --text-primary: #f9fafb;
  --border-color: #374151;
}
```

### 6. Component Audit Required

All existing components should be audited for dark mode support:

- Components using `bg-white` need `dark:bg-gray-900`
- Components using `text-gray-900` need `dark:text-white`
- Components using `border-gray-200` need `dark:border-gray-700`
- Existing `globals.css` has some dark styles — consolidate them

## Consequences

- Users get automatic dark mode based on system preference with manual override.
- Tailwind's `class` strategy is the most compatible with Next.js SSG/SSR.
- No additional CSS-in-JS runtime or theming library required.
- localStorage persistence is simple and requires no backend changes.
- The CSS custom properties approach allows complex color tokens beyond Tailwind's utility classes.

## Migration Notes

- Update `tailwind.config.ts` to set `darkMode: 'class'`.
- Add `className="dark"` handling in `layout.tsx` based on settings.
- Audit all components for `dark:` variants — this is the main effort.
- No breaking changes to existing functionality.
