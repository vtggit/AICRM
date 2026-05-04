# Component Library

## Purpose

This document catalogs the UI components used in AICRM and defines the target component library.

## Current State

AICRM currently has no formal component library. UI elements are built inline within `app/index.html` and rendered dynamically via template literals in `app/js/app.js`. Recurring UI patterns include:

- Cards (stat cards, dashboard cards, entity detail cards)
- Modals (add/edit forms, confirmation dialogs, shortcuts help)
- Tables and grids (contacts list, leads grid, activities timeline)
- Forms (contact form, lead form, activity form, template form)
- Navigation (sidebar nav, top header bar)
- Buttons (primary, secondary, danger variants)
- Badges and status indicators (lead temperature, activity overdue)
- Notifications (toast-style messages)

## Gaps

- No reusable component definitions or abstraction layer.
- No component documentation or usage examples.
- No consistent props/API for components.
- No component-level testing.
- Duplicate markup and logic for similar UI patterns.

## Target Direction

The target component library will include:

- Documented, reusable components with consistent interfaces.
- Component variants (sizes, states, themes).
- Component-level unit and visual regression tests.
- Storybook or equivalent for interactive documentation.
- Accessibility compliance baked into each component.

## Related Enterprise Standards

- Enterprise design system guidelines
- Component library standards
- Accessibility compliance requirements
