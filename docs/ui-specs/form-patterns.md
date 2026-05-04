# Form Patterns

## Purpose

This document describes the form patterns used in AICRM and defines the target form standards.

## Current State

AICRM uses modal-based forms for creating and editing entities. The current form patterns include:

- **Contact Form**: Fields for name, email, phone, company, role, tags, and notes.
- **Lead Form**: Fields for name, company, email, phone, source, stage, value, and score (auto-calculated).
- **Activity Form**: Fields for type, description, date, due date, status, and associated contact/lead.
- **Template Form**: Fields for name, category, subject, and body (with variable substitution support).

All forms are rendered dynamically via template literals in JavaScript and displayed in a shared modal container.

## Gaps

- No form validation feedback beyond basic HTML5 required attributes.
- No server-side validation (no backend exists).
- No consistent error message patterns or inline field-level validation.
- No form state persistence (drafts are lost if the browser is closed).
- No progressive disclosure for complex forms.

## Target Direction

The target form patterns will include:

- Consistent validation with inline error messages and field-level feedback.
- Server-side validation at the API layer.
- Form state management with draft persistence.
- Progressive disclosure for optional or advanced fields.
- Accessible form labels, error announcements, and keyboard navigation.
- Consistent form layout patterns across all entity types.

## Related Enterprise Standards

- Enterprise UX guidelines
- Form design patterns and standards
- Accessibility requirements for forms
