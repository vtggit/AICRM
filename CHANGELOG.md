# Changelog

All notable changes to AICRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses **semantic-ish versioning** (see [VERSION](VERSION)).

---

## [0.1.0] — 2025-01-01

### Added

- Canonical application version source (`VERSION` file at repo root).
- Backend version reporting via `GET /api/health`.
- Frontend version visibility in sidebar footer and Settings page.
- Release-process documentation (`docs/operations/release-process.md`).
- Changelog structure for tracking release notes.

---

## [0.1.5] — 2025-09-12

### Added

- **Quick Activity Logging from Contact Cards** — One-click activity logging buttons (📞 Call, 📧 Email, 🤝 Meeting, 📝 Note) directly on each contact card. Opens activity modal with type pre-filled and contact auto-selected, enabling rapid activity creation without navigating away from the list view.
- Playwright E2E test suite for Quick Activity Logging (`docs/testing/test-quick-activity-logging.js`, 9 tests).

---

## [Unreleased]
