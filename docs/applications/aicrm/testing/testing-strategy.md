# Testing Strategy

## Purpose

This document describes the current testing approach for AICRM and defines the target testing strategy.

## Current State

- **E2E Tests**: Playwright-based end-to-end tests exist in `docs/testing/`. Tests cover features such as activity due-date tracking, backup/restore, CSV import/export, email templates, keyboard shortcuts, lead scoring, revenue summary, and version display.
- **Unit Tests**: None. There are no unit tests for individual functions or modules.
- **Integration Tests**: None. There are no tests for API contracts, database operations, or authentication flows (because no backend exists yet).
- **Test Execution**: Tests are run against the browser-rendered application. Screenshots and result JSON files are stored in `test-results/`.

## Gaps

- No unit test coverage for business logic in `app.js` or the data-source modules.
- No API-level tests for the FastAPI backend endpoints.
- No authentication or authorization tests.
- No performance or load testing.
- No accessibility testing automation.
- No test coverage reporting or quality gates.

## Target Direction

The target testing strategy will include:

- Unit tests for backend business logic and data access layer.
- Integration tests for API endpoints and database operations.
- Authentication and authorization tests for identity provider integration.
- Continued E2E tests for frontend workflows, expanded to multi-user scenarios.
- Automated test execution in CI/CD pipeline with coverage thresholds.
- Accessibility testing as part of the test suite.
- Performance and load testing for the backend API.

## Related Enterprise Standards

- Software testing standard
- Test coverage requirements
- CI/CD quality gate policy
- Accessibility testing requirements
