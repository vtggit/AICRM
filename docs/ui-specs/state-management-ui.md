# State Management (UI)

## Purpose

This document describes how AICRM manages application state in the UI layer and defines the target state management approach.

## Current State

AICRM manages state through a combination of:

- **Global Object**: The `App` object holds current page state (`currentPage`, `editId`, `editType`).
- **Backend APIs**: All business data (contacts, leads, activities, templates, settings) is fetched from and persisted to the backend FastAPI server. The frontend maintains no persistent business state.
- **sessionStorage**: Used only for transient client-side concerns — auth token and theme preference. No business data is stored client-side.
- **DOM State**: UI state (active page, open modals, applied filters) is reflected directly in DOM class names and element visibility.
- **Re-render Pattern**: Navigation and data changes trigger full re-renders of the current page section by clearing and rebuilding innerHTML.

There is no reactive state management, no state store, and no state synchronization mechanism.

## Gaps

- No centralized state management or store pattern.
- No reactive UI updates — changes require manual DOM re-rendering.
- No state synchronization between tabs or sessions.
- No undo/redo or state history.
- No optimistic updates — all mutations wait for backend confirmation.
- Limited loading/error states for async operations.

## Target Direction

The target state management approach will include:

- Centralized state management (store pattern or state management library).
- Reactive UI updates tied to state changes.
- Server-side state as the source of truth, with client-side caching.
- Loading, error, and empty states for all data-dependent UI sections.
- Optimistic updates for improved perceived performance.
- State synchronization for multi-user scenarios.

## Related Enterprise Standards

- Frontend architecture guidelines
- State management patterns
- Performance and UX standards
