# UI Style Guide

## Color tokens

All colors are CSS variables mapped to Tailwind utilities. Never use raw hex values in components.

| Token | Tailwind class | Value | Use for |
|---|---|---|---|
| `--color-canvas` | `bg-canvas` / `text-canvas` | `#0f1117` | Page background, input backgrounds |
| `--color-surface` | `bg-surface` | `#1a1d27` | Cards, panels, nav |
| `--color-border` | `border-border` / `bg-border` | `#2a2d3a` | Borders, dividers, muted badges |
| `--color-fg` | `text-fg` | `#f0f2f8` | Primary text |
| `--color-fg-secondary` | `text-fg-secondary` | `#9aa0b8` | Secondary / supporting text |
| `--color-fg-muted` | `text-fg-muted` | `#5a6080` | Placeholders, labels, hints |
| `--color-brand` | `text-brand` / `bg-brand` | `#5b8af5` | CTAs, links, focus rings |
| `--color-success` | `text-success` / `bg-success` | `#4ade80` | Paid status, positive values |
| `--color-danger` | `text-danger` / `bg-danger` | `#f87171` | Errors, destructive actions |
| `--color-warning` | `text-warning` / `bg-warning` | `#fbbf24` | Warnings, upcoming deadlines |

## Contrast rules

The theme is dark. Every foreground/background pairing must meet WCAG AA (4.5:1 for text).

**Valid pairings — use these:**

| Text | Background | Approx ratio |
|---|---|---|
| `text-fg` | `bg-canvas` | ~13:1 ✅ |
| `text-fg` | `bg-surface` | ~8:1 ✅ |
| `text-fg-secondary` | `bg-canvas` | ~4.7:1 ✅ |
| `text-fg-secondary` | `bg-surface` | ~3.0:1 ⚠️ large text / UI chrome only |
| `text-fg-muted` | `bg-canvas` | ~1.8:1 ❌ placeholders only — never body text |
| `text-brand` | `bg-canvas` | ~4.6:1 ✅ |
| `text-success` | `bg-canvas` | ~9:1 ✅ |
| `text-danger` | `bg-canvas` | ~6:1 ✅ |

**Rules:**
- Input/textarea backgrounds must be `bg-canvas`. Never use `bg-bg` (undefined — falls back to browser white, making `text-fg` invisible).
- Placeholder text uses `placeholder:text-fg-muted` — acceptable because it's secondary UI chrome, not content.
- Badge tints use `/15` opacity modifier (e.g. `bg-success/15 text-success`) — approved pattern.
- Never put `text-fg` or `text-fg-secondary` on a white or light background.

## Form input pattern

Every `<input>`, `<select>`, and `<textarea>` should use this base class string:

```
bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg
placeholder:text-fg-muted focus:outline-none focus:border-brand
```

For textareas add `resize-none`. For selects, no placeholder class needed.

## Layout hierarchy

```
bg-canvas        ← page / body
  bg-surface     ← cards, panels, sidebar
    bg-canvas    ← inputs inside cards (one step back to canvas for depth)
```

This one-step-back pattern is why inputs use `bg-canvas` even when they sit inside a `bg-surface` card.
