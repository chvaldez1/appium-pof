# Appium QA Agent Guide

## Code boundaries

- `tests/` contains runnable tests. Put a platform-specific journey under `ios/` or `android/`; the root smoke specs are cross-platform or browser setup checks.
- `screens/<platform>/` contains native controls and selectors. Keep `XCUIElementType` selectors in `ios/` and Android selectors in `android/`.
- `flows/<platform>/` joins that platform's screens into a user journey.
- `screens/webview/` contains WebView page objects shared across platforms. A WebView is embedded web content inside a native app; switch into its context before calling those page objects.
- `shared/` contains data, purchase assertions/API reads, and helpers. `config/test-settings.ts` contains targets and waits.
- Use the `@screens/`, `@flows/`, `@shared/`, `@config/`, `@scripts/`, and `@tests/` aliases defined in `tsconfig.json` for internal imports. Do not add deep relative imports or forwarding helper modules to hide paths.
- Model a screen or WebView as a small, stateless WebdriverIO page object with lazy selector getters and meaningful user actions. Specs assert outcomes, flows coordinate screens and native/WebView contexts, and page objects own their own selectors. Keep credentials, API calls, fixture data, and session lifecycle out of page objects.
- Move code into `shared/` when its behavior and selectors are actually common. Pass a scenario into shared checks; do not import one Event fixture inside a reusable verifier.
- Use typed objects for fixed fixtures and a small function for values generated per run. Do not add a factory class for static data.

## Blockers and queued work

- If a task reaches an **AI blocker** that prevents meaningful progress, stop that task promptly. Examples: missing build or credentials, an unavailable external service, a required approval or user decision, or a repeated tool failure with no safe workaround.
- A minor unknown is not a blocker: make a reasonable, stated assumption and finish the independent work.
- Preserve completed work, record the exact blocker and unverified state, and stop only processes started for that blocked task that can no longer make progress. Do not kill unrelated processes or discard user changes.
- Continue with the next independent queued user request when it arrives. Do not keep polling, retrying, or waiting on the blocked task while independent work is available. A later user answer can resume it.
- Never guess an answer, bypass approval, or call a blocked task complete. If no independent work remains, report the blocker and the precise next input needed.

## Purchase-test guardrails

- Use beta test-mode payments and a unique Customer email for each order. Submit a payment once; read the saved order before considering any retry.
- Keep real card details and credentials out of committed files, logs, screenshots, and shared artifacts. The approved Stripe test-card fixture may be committed, but do not log its full number or CVC during a run.
- State clearly whether a change was checked statically, tested without payment, or proved by a completed order and issued ticket.
