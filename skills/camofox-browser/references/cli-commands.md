# Camofox CLI Commands (43 Total)

Complete, source-verified CLI command reference for `camofox` v2.0.0.

Related:
- `../SKILL.md`
- `./api-endpoints.md`
- `./authentication.md`

Source of truth for development: `AGENTS.md`

## Table of Contents

1. Core Commands (5)
2. Navigation Commands (4)
3. Content Commands (7)
4. Interaction Commands (6)
5. Session Commands (4)
6. Download/Cookie Commands (4)
7. Auth Commands (5)
8. Server Commands (3)
9. Advanced Commands (4)
10. Pipeline Command (1)
11. Global Options
12. Full Command Index Table
13. Fallback/Compatibility Notes

---

## 1) Core Commands (5)

### `camofox open <url>`
Open URL in a new tab and mark tab as active.

Syntax:
```bash
camofox open <url> [--user <user>] [--viewport <WxH>] [--geo <preset>]
```
Options:
- `--user <user>` user id
- `--viewport <WxH>` e.g. `1280x720`
- `--geo <preset>` geo preset name

Examples:
```bash
camofox open https://example.com
camofox open https://mail.google.com --user inbox-a
camofox open https://example.com --viewport 1440x900 --geo us-east
```

### `camofox close [tabId]`
Close a tab (defaults to active tab).

```bash
camofox close [tabId] [--user <user>]
```

### `camofox snapshot [tabId]`
Capture accessibility snapshot.

```bash
camofox snapshot [tabId] [--user <user>]
```

### `camofox click <ref> [tabId]`
Click element by ref or selector string.

```bash
camofox click <ref> [tabId] [--user <user>]
```

Examples:
```bash
camofox click e5
camofox click "#submit" --user form-a
```

### `camofox type <ref> <text> [tabId]`
Type text into element.

```bash
camofox type <ref> <text> [tabId] [--user <user>]
```

---

## 2) Navigation Commands (4)

### `camofox navigate <url> [tabId]`
Navigate an existing tab.

```bash
camofox navigate <url> [tabId] [--user <user>]
```

### `camofox screenshot [tabId]`
Take screenshot and save PNG file.

```bash
camofox screenshot [tabId] [--path <file>] [--output <file>] [--full-page] [--user <user>]
```
Options:
- `--path <file>` output path alias
- `--output <file>` output path alias
- `--full-page` full-page capture
- `--user <user>` user id

Examples:
```bash
camofox screenshot --output page.png
camofox screenshot abc123 --full-page --user agent1
```

### `camofox go-back [tabId]`
```bash
camofox go-back [tabId] [--user <user>]
```

### `camofox go-forward [tabId]`
```bash
camofox go-forward [tabId] [--user <user>]
```

---

## 3) Content Commands (7)

### `camofox get-text [tabId]`
Get text from page or selector.

```bash
camofox get-text [tabId] [--selector <selector>] [--user <user>]
```

### `camofox get-url [tabId]`
Get current URL.

```bash
camofox get-url [tabId] [--user <user>]
```

### `camofox get-links [tabId]`
Get links from current page.

```bash
camofox get-links [tabId] [--user <user>]
```

### `camofox get-tabs`
List tabs for user.

```bash
camofox get-tabs [--user <user>]
```

### `camofox eval <expression> [tabId]`
Evaluate JavaScript in page context.

```bash
camofox eval <expression> [tabId] [--user <user>]
```

Example:
```bash
camofox eval "document.title"
```

### `camofox wait <condition> [tabId]`
Wait for selector, navigation, or network idle.

```bash
camofox wait <condition> [tabId] [--timeout <ms>] [--user <user>]
```
Examples:
```bash
camofox wait navigation
camofox wait networkidle --timeout 15000
camofox wait "#results" --user agent1
```

### `camofox search <query> [tabId]`
Search using one of 8 CLI engines.

```bash
camofox search <query> [tabId] [--engine <engine>] [--user <user>]
```
Engines:
- `google`
- `youtube`
- `amazon`
- `bing`
- `reddit`
- `duckduckgo`
- `github`
- `stackoverflow`

Examples:
```bash
camofox search "playwright stealth" --engine duckduckgo
camofox search "rate limit express" --engine stackoverflow --user dev1
```

---

## 4) Interaction Commands (6)

### `camofox fill <assignments> [tabId]`
Fill multiple fields at once.

```bash
camofox fill '<assignments>' [tabId] [--user <user>]
```
Assignment format:
```text
[e1]="value1" [e2]="value2"
```

Example:
```bash
camofox fill '[e1]="John Doe" [e2]="john@example.com"'
```

### `camofox scroll [direction] [tabId]`
Scroll page.

```bash
camofox scroll [direction] [tabId] [--amount <N>] [--user <user>]
```
Directions: `up|down|left|right` (default `down`)

### `camofox select <ref> <value> [tabId]`
Select option in dropdown (or fallback typing behavior).

```bash
camofox select <ref> <value> [tabId] [--user <user>]
```

### `camofox hover <ref> [tabId]`
Hover over element.

```bash
camofox hover <ref> [tabId] [--user <user>]
```

### `camofox press <key> [tabId]`
Press keyboard key.

```bash
camofox press <key> [tabId] [--user <user>]
```

Examples:
```bash
camofox press Enter
camofox press Tab --user flow1
```

### `camofox drag <fromRef> <toRef> [tabId]`
Drag and drop.

```bash
camofox drag <fromRef> <toRef> [tabId] [--user <user>]
```

---

## 5) Session Commands (4)

### `camofox session save <name> [tabId]`
Save session cookies to local file.

```bash
camofox session save <name> [tabId] [--user <user>]
```

### `camofox session load <name> [tabId]`
Load session cookies from local file.

```bash
camofox session load <name> [tabId] [--user <user>]
```

### `camofox session list`
List saved sessions in `~/.camofox/sessions`.

```bash
camofox session list [--format <format>]
```

### `camofox session delete <name>`
Delete saved session file.

```bash
camofox session delete <name> [--force]
```

---

## 6) Download/Cookie Commands (4)

### `camofox cookie export [tabId]`
Export cookies as JSON.

```bash
camofox cookie export [tabId] [--path <file>] [--user <user>]
```

### `camofox cookie import <file> [tabId]`
Import cookies from JSON array.

```bash
camofox cookie import <file> [tabId] [--user <user>]
```

### `camofox download [url]`
Direct-download placeholder/stub command.

```bash
camofox download [url] [--path <dir>] [--user <user>]
```
Status:
- Current implementation returns informational message
- Does **not** execute direct download in current server wiring
- Use `camofox downloads` or `/tabs/:tabId/batch-download` API instead

### `camofox downloads`
List tracked downloads.

```bash
camofox downloads [--user <user>] [--format <format>]
```

---

## 7) Auth Commands (5)

### `camofox auth save <profile-name>`
Save encrypted credentials.

```bash
camofox auth save <profile-name> [--url <url>] [--notes <notes>]
```
Prompts for master password, username, and account password.

### `camofox auth load <profile-name>`
Load credentials.

```bash
camofox auth load <profile-name> [--inject [tabId]] [--username-ref <ref>] [--password-ref <ref>] [--user <user>]
```
Notes:
- Without `--inject`: prints username
- With `--inject`: fills username/password into specified refs

### `camofox auth list`
List profiles.

```bash
camofox auth list [--format <format>]
```

### `camofox auth delete <profile-name>`
Delete profile (master password confirmation via decryption check).

```bash
camofox auth delete <profile-name>
```

### `camofox auth change-password <profile-name>`
Rotate master password.

```bash
camofox auth change-password <profile-name>
```

---

## 8) Server Commands (3)

### `camofox server start`
```bash
camofox server start [--port <port>] [--background] [--idle-timeout <minutes>]
```

### `camofox server stop`
```bash
camofox server stop
```

### `camofox server status`
```bash
camofox server status [--format <format>]
```

---

## 9) Advanced Commands (4)

### `camofox annotate [tabId]`
Capture screenshot and ref map.

```bash
camofox annotate [tabId] [--user <user>] [--output <file>] [--format <format>]
```

### `camofox health`
Show server/browser/vault health.

```bash
camofox health [--format <format>]
```

### `camofox version`
Show CLI/server/node versions.

```bash
camofox version [--format <format>]
```

### `camofox info`
Show active configuration and paths.

```bash
camofox info [--format <format>]
```

---

## 10) Pipeline Command (1)

### `camofox run <script-file>`
Sequential script runner.

```bash
camofox run <script-file> [--continue-on-error]
```

Behavior:
- Reads from file path, or `-` for stdin
- Supports quoted arguments and `#` comment lines
- Nested `run` is rejected

Example:
```bash
cat <<'EOF' > demo.cf
open https://example.com
snapshot
click e5
screenshot --output out.png
EOF

camofox run demo.cf
```

---

## 11) Global Options

Global options from `src/cli/index.ts`:

```bash
--user <user>        # default user id (overrides CAMOFOX_CLI_USER)
--port <port>        # server port (overrides CAMOFOX_PORT)
--format <format>    # json|text|plain (default text)
--local              # reserved for v2 (currently rejected)
-V, --version        # output version number
-h, --help           # show help
```

Practical tips:
- Use `--format json` for automations
- Keep same `--user` across a workflow for profile consistency
- Re-run `snapshot` after any major page transition

---

## 12) Full Command Index Table

This table lists all 43 commands in one place.

| # | Category | Command |
|---|---|---|
| 1 | core | `open` |
| 2 | core | `close` |
| 3 | core | `snapshot` |
| 4 | core | `click` |
| 5 | core | `type` |
| 6 | navigation | `navigate` |
| 7 | navigation | `screenshot` |
| 8 | navigation | `go-back` |
| 9 | navigation | `go-forward` |
| 10 | content | `get-text` |
| 11 | content | `get-url` |
| 12 | content | `get-links` |
| 13 | content | `get-tabs` |
| 14 | content | `eval` |
| 15 | content | `wait` |
| 16 | content | `search` |
| 17 | interaction | `fill` |
| 18 | interaction | `scroll` |
| 19 | interaction | `select` |
| 20 | interaction | `hover` |
| 21 | interaction | `press` |
| 22 | interaction | `drag` |
| 23 | session | `session save` |
| 24 | session | `session load` |
| 25 | session | `session list` |
| 26 | session | `session delete` |
| 27 | download | `cookie export` |
| 28 | download | `cookie import` |
| 29 | download | `download` |
| 30 | download | `downloads` |
| 31 | auth | `auth save` |
| 32 | auth | `auth load` |
| 33 | auth | `auth list` |
| 34 | auth | `auth delete` |
| 35 | auth | `auth change-password` |
| 36 | server | `server start` |
| 37 | server | `server stop` |
| 38 | server | `server status` |
| 39 | advanced | `annotate` |
| 40 | advanced | `health` |
| 41 | advanced | `version` |
| 42 | advanced | `info` |
| 43 | pipeline | `run` |

---

## 13) Fallback/Compatibility Notes

Several commands attempt API v2-style paths first and fall back to legacy/OpenClaw-compatible paths if needed.

Examples:
- `open`: tries `/api/create-tab`, falls back to `/tabs/open`
- `navigate`: tries `/api/navigate`, falls back to `/navigate`
- `snapshot`: tries `/api/snapshot-accessibility`, falls back to `/snapshot?...`
- `click`/`type`/`press`: can fall back to `/tabs/:tabId/...` or `/act`

What this means operationally:
- CLI is resilient across mixed server compatibility surfaces.
- If output shape differs between environments, use `--format json` and inspect keys rather than relying on free-form text.

Known command caveats:
- `download` command is intentionally placeholder in current CLI implementation.
- `run` is sequential script execution, not graph orchestration.
- `auth load --inject` requires both `--username-ref` and `--password-ref`.

Recommended automation profile:
```bash
camofox --format json --user agent1 open https://example.com
camofox --format json --user agent1 snapshot
camofox --format json --user agent1 click e4
```
