# Dogfood QA Testing — camofox-browser

> Systematic exploratory testing of web applications using camofox-browser's anti-detection browser automation.

## When to Use
- Testing web applications for bugs, UX issues, and accessibility problems
- QA validation before release
- Exploratory testing of new features
- Cross-browser verification with Firefox/Camoufox engine

## Prerequisites
- camofox-browser server running on port 9377
- Target application URL accessible

## Workflow

### Phase 1: Initialize Session
```bash
# Create a dedicated test session
camofox create_tab --user dogfood-qa --url "about:blank"

# Start trace recording for evidence capture
camofox trace start --user dogfood-qa --screenshots --snapshots
```

### Phase 2: Navigate & Orient
```bash
# Navigate to target application
camofox navigate <tabId> "https://target-app.com"

# Take initial snapshot to understand page structure
camofox snapshot <tabId>

# Capture annotated screenshot for visual baseline
camofox annotate <tabId>
```

### Phase 3: Systematic Exploration

#### 3.1 Happy Path Testing
Follow the primary user flows:
```bash
# Interact with elements using refs from snapshot
camofox click <tabId> e5
camofox type <tabId> e3 "test input"
camofox press <tabId> Enter

# Wait for navigation/loading
camofox wait <tabId> networkidle

# Capture state after each action
camofox snapshot <tabId>
```

#### 3.2 Edge Case Testing
```bash
# Test empty inputs
camofox type <tabId> e3 ""
camofox press <tabId> Enter

# Test long strings
camofox type <tabId> e3 "aaaa...very long string..."
camofox press <tabId> Enter

# Test special characters
camofox type <tabId> e3 "<script>alert('xss')</script>"
camofox press <tabId> Enter
```

#### 3.3 Error Discovery
```bash
# Check for console errors after interactions
camofox errors <tabId>

# Check console output for warnings
camofox console <tabId> --type warning

# Monitor all console messages
camofox console <tabId> --limit 50
```

#### 3.4 State & Navigation Testing
```bash
# Test back/forward navigation
camofox go_back <tabId>
camofox go_forward <tabId>

# Save session state for later comparison
camofox session save --user dogfood-qa

# Test page reload
camofox reload <tabId>
```

### Phase 4: Document Issues

When a bug is found:
```bash
# 1. Capture visual evidence
camofox annotate <tabId>

# 2. Capture page errors
camofox errors <tabId>

# 3. Capture console logs
camofox console <tabId>

# 4. Mark trace chunk for this specific issue
camofox trace chunk-start --user dogfood-qa
# ... reproduce the bug ...
camofox trace chunk-stop --user dogfood-qa

# 5. Take snapshot for element state
camofox snapshot <tabId>
```

### Phase 5: Wrap Up
```bash
# Stop trace recording
camofox trace stop --user dogfood-qa
# → Trace ZIP saved to ~/.camofox/traces/
# → View at https://trace.playwright.dev

# Final console/error summary
camofox errors <tabId>
camofox console <tabId> --type error

# Close session
camofox close_tab <tabId>
```

## Issue Reporting

Use the [issue taxonomy](references/issue-taxonomy.md) to classify findings.
Use the [report template](templates/dogfood-report-template.md) to document each issue.

## Key Differences from Standard Browser Testing

| Feature | Standard | camofox-browser |
|---|---|---|
| Detection | Easily flagged as bot | Anti-detection (C++ spoofing) |
| Browser | Chrome/Chromium | Firefox/Camoufox |
| Evidence | Screenshots only | Traces (screenshots + DOM + network) |
| Console | Manual DevTools | `console` / `errors` commands |
| Element refs | CSS selectors | Accessibility tree refs (eN) |

## Tips
- Use `trace chunk-start/stop` to isolate specific bug reproductions within a longer session
- Check `errors` frequently — many bugs show console errors before visual symptoms
- Use `annotate` for visual evidence — it numbers all interactive elements
- Trace ZIPs contain full reproduction data — share via trace.playwright.dev
- The `--user` flag isolates test sessions from each other
