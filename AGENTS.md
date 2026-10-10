# Appium QA Agent Guide

## Code boundaries

- `tests/native/`, `tests/hybrid/`, and `tests/mobile-web/` contain runnable `.spec.ts` E2E tests. Put iOS-only journeys under `ios/` within their business area. `tests/unit/` contains `.test.ts` Node tests and is excluded from WebdriverIO.
- `src/screens/native/<platform>/` contains native controls and selectors. Keep `XCUIElementType` selectors in `ios/` and Android selectors in `android/` when implemented.
- `src/screens/webviews/` contains WebView page objects shared across platforms. A WebView is embedded web content inside a native app; switch into its context before calling those page objects.
- `src/flows/<business-area>/ios/` joins iOS screens into a journey. Keep a native and WebView journey cohesive. Platform-independent purchase verification lives in `src/flows/purchase/`.
- `src/api/` owns backend requests. `src/data/` owns typed inputs, fixed fixtures, account-source parsing, and small functions for generated values. `src/support/` owns driver utilities, device selection, assertions, and run artifacts. `src/setup/` owns runner hooks.
- `config/` owns WebdriverIO options, platform capabilities, app-build verification, targets, and waits. Root `wdio.conf.ts` remains the compatibility entry point; register E2E spec paths in `config/specs.ts`.
- Use the `@screens/`, `@flows/`, `@api/`, `@data/`, `@support/`, `@setup/`, `@config/`, `@scripts/`, and `@tests/` aliases defined in `tsconfig.json` for internal imports. Do not add deep relative imports or forwarding helper modules to hide paths.
- Model a screen or WebView as a small, stateless WebdriverIO page object with lazy selector getters and meaningful user actions. Specs assert outcomes, flows coordinate screens and native/WebView contexts, and page objects own their own selectors. Keep credentials, API calls, fixture data, and session lifecycle out of page objects.
- Share code only when behavior and selectors are actually common. Pass a scenario into shared purchase checks; do not import one Event fixture inside a reusable verifier.
- Use typed objects for fixed fixtures and a small function for values generated per run. Do not add a factory class for static data.
- Load local settings through `config/local-env.ts`; keep `.env.local` ignored and preserve shell/CI overrides. Do not commit device UUIDs or private accounts.
- Keep Xcode simulator signing enabled so the executable embeds Keychain entitlements. Do not replace it with a plain unsigned build plus post-build signing, and never use simulator signing instructions for a physical device build.

## Local resource use

- Run one operation at a time. Do not overlap builds, test runs, formatting, or quality checks.
- Keep only the selected simulator booted. Run the iOS version matrix sequentially and shut down each owned simulator before starting the next.
- After an interruption, inspect owned work before starting more. Never terminate unrelated processes.

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
