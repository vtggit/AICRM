# Release Process

This document explains how AICRM versions are defined, bumped, and released.

## Version Source of Truth

The canonical application version lives in the **`VERSION`** file at the repository root.

```
0.1.0
```

Both the backend and frontend derive their version from this single source:

- **Backend**: reads `VERSION` at startup (config.py) and exposes it via `GET /api/health`.
- **Frontend**: fetches the version from the backend health endpoint at runtime.

There are no separate frontend or backend version constants.

## Versioning Model

AICRM uses **semantic-ish versioning** with three components: `MAJOR.MINOR.PATCH`.

| Component | When to bump |
|-----------|--------------|
| **MAJOR** | Breaking architectural or behavioral changes that require migration or retraining. |
| **MINOR** | Meaningful new feature or domain capability additions. |
| **PATCH** | Bug fixes, polish, documentation, and non-breaking improvements. |

Because the frontend and backend are one application, they always share the same version.

## Automated CI Checks

The following release checks are now **enforced by CI** (job: `release-metadata`):

| Check | What It Validates | Tool |
|-------|-------------------|------|
| VERSION exists | File is present and non-empty | `scripts/check_release_metadata.py` |
| VERSION format | Matches `MAJOR.MINOR.PATCH` (e.g. `0.1.0`, `1.3.2`) | `scripts/check_release_metadata.py` |
| CHANGELOG.md exists | File is present at repo root | `scripts/check_release_metadata.py` |
| Version in changelog | VERSION appears in CHANGELOG.md, or `[Unreleased]` section exists | `scripts/check_release_metadata.py` |
| PR drift detection | If VERSION changes in a PR, CHANGELOG.md must also change | `scripts/check_release_metadata.py` |

Run these checks locally before pushing:

```bash
python3 scripts/check_release_metadata.py
```

**What is NOT yet automated:**

- Creating git tags
- Publishing releases
- Deploying to environments
- Branching strategy enforcement

These remain manual steps (see below).

## How to Bump the Version

1. Edit the `VERSION` file at repo root.
2. Add a new section to `CHANGELOG.md` with the version number, date, and summary of changes.
3. Commit both files together with a message like `chore(release): bump version to 0.2.0`.
4. **CI will automatically validate** that both files are consistent and the version format is correct.

## Release Notes

All notable changes are tracked in **`CHANGELOG.md`** at the repository root.

Each release entry should include:

- Version number and date
- Summary of changes grouped by category (Added, Changed, Fixed, etc.)
- Any notable breaking changes

See the existing CHANGELOG.md for format examples.

## Creating a Release Tag (Manual)

Once the version bump and changelog are committed and CI passes:

```bash
# Create an annotated tag
git tag -a v0.2.0 -m "Release v0.2.0"

# Push the tag
git push origin v0.2.0
```

Tags follow the format `v<VERSION>` (e.g., `v0.2.0`).

## Verifying the Running Version

- **Backend**: `curl http://localhost:9000/api/health` — check the `app_version` field.
- **Frontend**: Look at the sidebar footer or Settings page — the version is displayed there.
- **Container deployment**: Set the `APP_VERSION` environment variable to override the VERSION file.

### Build / Revision Traceability

When `GIT_SHA` and/or `BUILD_TIMESTAMP` environment variables are set (e.g. by CI or a
Docker build step), the health endpoint also returns traceability metadata:

```json
{
  "status": "ok",
  "app_version": "0.1.0",
  "service": "aicrm-backend",
  "git_sha": "abc1234",
  "build_timestamp": "2025-01-15T10:30:00Z"
}
```

This allows you to trace a running instance back to the exact git commit and build time.
These values are injected at build time via environment variables — they are never
hardcoded in source.

## Container Deployments

When building containers, the `VERSION` file is baked into the backend image.
You can also override the version at runtime by setting the `APP_VERSION` environment variable:

```bash
docker run -e APP_VERSION=0.2.0 aicrm-backend
```

This is useful for CI/CD pipelines that inject version information dynamically.
