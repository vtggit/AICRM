# Navigation Structure

## Purpose

This document describes the current navigation structure of AICRM and defines the target navigation model.

## Current State

AICRM uses a sidebar-based navigation model with the following pages:

1. **Dashboard** — Overview stats, recent activities, and lead pipeline summary.
2. **Contacts** — Contact list with search, filter, and CRUD operations.
3. **Leads** — Lead pipeline with stage filtering, scoring, and CSV import/export.
4. **Activities** — Activity timeline with type and status filtering.
5. **Templates** — Email template library with category filtering and variable substitution.
6. **Settings** — Backup/restore, data management, and application info.

Navigation is handled by clicking sidebar items, which triggers a `navigate()` function that swaps visible page sections. Mobile users can toggle the sidebar with a hamburger menu button. Keyboard shortcuts (1-5) provide quick navigation.

## Gaps

- No breadcrumbs or hierarchical navigation context.
- No deep linking or URL-based routing (browser back/forward does not navigate pages).
- No navigation state persistence across sessions.
- No permission-based navigation (all pages always visible — no auth exists).
- No search result navigation or cross-page linking.

## Target Direction

The target navigation model will include:

- URL-based routing with browser history support (back/forward navigation).
- Breadcrumb navigation for contextual hierarchy.
- Permission-aware navigation (hide pages based on user role).
- Persistent navigation state across sessions.
- Search result navigation with cross-page links.
- Responsive navigation patterns for all screen sizes.

## Related Enterprise Standards

- Enterprise UX guidelines
- Information architecture standards
- Responsive design requirements
