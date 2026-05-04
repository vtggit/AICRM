# Design System Overview

## Purpose

This document provides an overview of the design system for AICRM, including visual language, theming, and component consistency.

## Current State

AICRM uses a single CSS file (`app/css/styles.css`) with CSS custom properties for theming. The application supports a light and dark theme toggle. Styling is applied directly to semantic HTML elements and utility classes. There is no formal design system, component library, or design token registry.

## Gaps

- No documented design tokens (colors, spacing, typography scale).
- No component library or reusable UI component definitions.
- No design system documentation or style guide.
- No design-to-development handoff process.
- Inconsistent spacing and sizing patterns across pages.

## Target Direction

The target design system will include:

- Documented design tokens for colors, typography, spacing, and breakpoints.
- A reusable component library with consistent styling.
- Design system documentation accessible to both designers and developers.
- Automated visual regression testing.
- Accessibility-compliant color contrast and focus indicators.

## Related Enterprise Standards

- Enterprise design system guidelines
- Brand identity and visual standards
- Accessibility compliance requirements (WCAG)
