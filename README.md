# cortex-plugin-sentry

Triage error groups, analyze stack traces, suggest fixes, and create GitHub issues from Sentry
errors.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-sentry
cortex plugin install github:CortexPrism/cortex-plugin-sentry
cortex plugin install ./manifest.json
```

## Quick Start

```bash
cortex tools list
cortex chat --plugin cortex-plugin-sentry
```

## Tools

### sentry_list_issues — List error issues

- `project` (string, required)
- `status` (enum: unresolved/resolved/ignored/all, unresolved)
- `limit` (number, 20)
- `environment` (string)

### sentry_get_issue — Get issue details

- `issue_id` (string, required)

### sentry_analyze_stacktrace — Analyze stack trace

- `issue_id` (string, required)

### sentry_suggest_fix — Suggest fix for error

- `issue_id` (string, required)

### sentry_create_github_issue — Create GitHub issue from Sentry

- `issue_id` (string, required)
- `repo` (string, required — owner/repo)

## Configuration

```json
{
  "plugins": {
    "cortex-plugin-sentry": {
      "enabled": true,
      "config": {
        "sentryAuthToken": "",
        "sentryOrg": "",
        "sentryDefaultProject": ""
      }
    }
  }
}
```

## Development

```bash
deno task test
deno task lint
deno task validate
```

## License

MIT
