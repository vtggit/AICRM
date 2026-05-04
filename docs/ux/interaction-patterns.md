# Interaction Patterns

## Purpose

This document describes the interaction patterns used in AICRM and defines the target interaction model.

## Current State

AICRM uses the following interaction patterns:

- **Click-driven navigation**: Sidebar items trigger page swaps via the `navigate()` function.
- **Modal-based forms**: All create/edit operations open in a shared modal overlay.
- **Inline notifications**: Toast-style notifications appear for success, error, and warning states.
- **Keyboard shortcuts**: Number keys (1-5) for navigation, Ctrl+N for new contact, Ctrl+L for new lead, Ctrl+E for CSV export, / for search focus, ? for shortcuts help.
- **Theme toggle**: Light/dark mode switch persisted in sessionStorage.
- **Global search**: Debounced text search across contacts and leads.
- **Filter controls**: Dropdown filters on lists (contacts, leads, activities, templates).
- **Drag-and-drop**: Not implemented; pipeline stage changes use dropdown selection.

## Gaps

- No drag-and-drop for pipeline stage management.
- No inline editing — all edits require opening a modal.
- No bulk actions (select multiple records to update or delete).
- No undo/confirm for destructive actions beyond the clear-all confirmation.
- No loading states or skeleton screens for async operations.
- No gesture support for touch devices beyond basic tap interactions.

## Target Direction

The target interaction patterns will include:

- Drag-and-drop for pipeline stage management.
- Inline editing for quick field updates.
- Bulk actions with multi-select support.
- Undo/confirm patterns for all destructive actions.
- Loading states, skeleton screens, and optimistic updates.
- Touch-friendly interactions and gesture support.
- Consistent micro-interactions and transition animations.
- Command palette for power users.

## Related Enterprise Standards

- Enterprise UX interaction guidelines
- Responsive and mobile interaction standards
- Accessibility interaction requirements
