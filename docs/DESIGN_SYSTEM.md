# Agent Workspace · Soft Orbit

The application uses a local, source-owned design system. Shared foundations live in `src/tokens.css`, reusable controls in `src/components/ui/`, layout in `src/App.css`, and the interactive gallery at `/?view=design-system`.

Visual direction: the soft surfaces and restrained use of accent color of [Work Management App](https://dribbble.com/shots/27683694-Work-Management-App-UI-UX-Design), with grouped navigation and panel interaction inspired by [React Bits Pro](https://pro.reactbits.dev/). No paid React Bits source is included.

## Typography

Inter is a variable, locally served font used for headings, controls and long reading. Roles include the family, size, weight and line height, so components should use `font: var(--type-ROLE)` instead of inventing a local type scale.

| Role | Family | Size at default root | Weight | Line height | Use |
| --- | --- | --- | --- | --- | --- |
| `type-display` | Inter | 32–44 px, fluid | 600 | 1.14 | Chat welcome and prominent statements |
| `type-title` | Inter | 28–34 px, fluid | 600 | 1.2 | Page titles |
| `type-heading` | Inter | 18 px | 600 | 1.4 | Card and section headings |
| `type-body` | Inter | 15 px | 400 | 1.65 | Supporting page content |
| `type-reading` | Inter | 16 px | 400 | 1.75 | Conversation and long reading |
| `type-label` | Inter | 13 px | 500 | 1.5 | Navigation and controls |
| `type-caption` | Inter | 12 px | 400 | 1.5 | Metadata and supporting hints |
| `type-overline` | Inter | 11 px | 600 | 1.5 | Short uppercase section labels |

Sizes use rems and fluid clamps. Keep body text to roughly 65 characters per line. Display tracking is `-.035em`, title tracking `-.025em`, and uppercase tracking `.11em`. Headings balance lines; continuous text retains natural wrapping. The chat heading adapts to its container as the workspace is resized.

The gallery hero has a deliberate larger display variant, capped at 64 px on desktop. Compact account captions use 11 px; reading text must not use these compact treatments. Reference: [semantic typography and responsive scaling](https://uxdesign.cc/mastering-typography-in-design-systems-with-semantic-tokens-and-responsive-scaling-6ccd598d9f21).

## Color and surfaces

Edit both `:root` and `:root.dark` when changing a semantic color. Use `color-canvas` for the page, `color-surface` for cards and fields, `color-sidebar` for navigation, and `color-surface-muted` for recessed content. Primary actions use `color-primary` and `color-on-primary`. The Neutral Monochrome palette matches Spec Agent Workspace: black text (#000000), canvas #f8f7f5, sidebar #f0efec, white surfaces and primary #101820. Supporting text also uses the ink token; font size, weight and spacing establish hierarchy. Dark mode uses white text and slate surfaces. Semantic success, warning, danger and info colors communicate status. Selected chats use navigation-active with on-navigation-active text, including their delete action.

Existing `qaa-*` names are compatibility aliases in the token file. New components use canonical `color-*` tokens. Do not place palette literals in feature CSS.

## Controls and composition

| Component | Contract |
| --- | --- |
| `Button` | Primary / secondary / ghost / danger; sm / md / lg; pill / icon. Defaults to `type="button"`; form submission must use `type="submit"`. Icon actions require an accessible label. |
| `Surface` | Shared card surface, border, 24 px radius and restrained shadow. Features own placement and padding. |
| `StatusBadge` | Neutral / success / warning / danger / info. Meaning stays readable in both themes. |
| `Select` | Radix-backed value selection with a styled trigger, popover, option descriptions, selected indicator, typeahead, keyboard navigation and focus return. Portals stay inside a containing native dialog when necessary. Used in workspace selection, chat reply style and the gallery. |
| `Switch` | Labelled controlled switch with optional description and native keyboard button behavior. |
| `Dialog` | Native modal dialog; title/description relationships, Escape, outside click and native focus return. Mark the initial field with `data-autofocus`. |
| `.ui-field` | Shared native input, select and textarea styling. Use visible labels and connect hint/error text through `aria-describedby`. |

The app's navigation, rail actions, chat suggestions, composer actions, integration cards and agent diagram consume these same components. Use feature components for product behavior; avoid building independent copies of controls on each page.

`WorkspaceFiles` is an Overview feature below the workspace tab bar, leaving navigation free for future views. It reuses `Surface` and `Button`, supports a multiple-file picker and drag-and-drop, lists name/size, removes files and deduplicates by name/size/last-modified. File objects remain in component memory across panel changes and navigation; they are not read, uploaded or persisted to a backend. Reloading ends that local session.

## Space, shape and motion

- Spacing: 4, 8, 12, 16, 24, 32 and 48 px.
- Corners: 14 px controls, 24 px panels, 28 px composer, pill actions.
- Standard control height: 42 px; compact 34 px; large 48 px.
- Panel headers: 58 px. Chat and workspace share the same top and bottom alignment.
- Chat can collapse on desktop into a 56 px rail with a vertical Chatt button, using the header button or dragging the divider to within 132 px of the left edge of the split area. Drag the rail divider right to reopen at a new width. The conversation stays mounted, preserving drafts and streaming; reopening with the button restores composer focus. Selecting a chat or discussing a research task reopens it. Narrow screens retain the mobile panel switcher.
- Panel rails: 64 px desktop and 56 px mobile workspace. Keep drag-to-collapse, keyboard resizing and stored split width intact.
- Controls transition in 160 ms; panels in 420 ms with the shared easing. All motion respects `prefers-reduced-motion`.

## Validation

Use lint, typecheck/build and appropriate Playwright tests when changing shared components. Review light and dark themes, populated and empty conversation states, expanded and collapsed panels, desktop and narrow mobile views. The gallery tests exercise modal focus/return, theme switching, font selection, mobile layout and 200% root text enlargement. These checks support iteration; they are not a claim of a complete accessibility audit.
