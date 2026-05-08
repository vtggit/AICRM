# Accessibility Guidelines

## Purpose

This document outlines the current accessibility posture of AICRM and defines the target accessibility standards.

## Current State

AICRM includes some basic accessibility features:

- `aria-label` attributes on icon buttons (menu toggle, theme toggle, shortcuts, modal close).
- Semantic HTML elements (`nav`, `main`, `header`, `button`).
- Keyboard shortcuts for navigation and common actions.
- A `lang="en"` attribute on the `<html>` element.

However, there is no systematic accessibility testing or compliance verification.

## Gaps

- No automated accessibility auditing (no axe, Lighthouse, or pa11y integration).
- No keyboard navigation support for all interactive elements (some modals and forms may not be fully keyboard accessible).
- No screen reader testing or testing with assistive technologies.
- No documented color contrast ratios.
- No focus management for modal dialogs or dynamic content changes.
- No ARIA live regions for dynamic updates (notifications, search results).

## Target Direction

The target accessibility model will include:

- WCAG 2.1 Level AA compliance as the minimum target.
- Automated accessibility testing integrated into the CI/CD pipeline.
- Manual accessibility audits with screen readers and keyboard-only navigation.
- Focus management for all dynamic content (modals, page transitions).
- ARIA live regions for status updates and notifications.
- Documented color contrast ratios meeting WCAG requirements.
- Accessibility statement published with the application.

## Related Enterprise Standards

- Enterprise accessibility policy
- WCAG compliance requirements
- Inclusive design guidelines
