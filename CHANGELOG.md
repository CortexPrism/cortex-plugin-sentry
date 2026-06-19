# Changelog

## [Unreleased]

### Added

- Structured logging via ctx.logger in lifecycle hooks

### Changed

- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added

- Initial release

## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-sentry
- `sentry_list_issues` — List error issues
- `sentry_get_issue` — Get issue details
- `sentry_analyze_stacktrace` — Analyze stack trace
- `sentry_suggest_fix` — Suggest fix for error
- `sentry_create_github_issue` — Create GitHub issue from Sentry
