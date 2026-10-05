import assert from 'node:assert/strict';
import { test } from 'node:test';
import appiumSensitiveConfig from '@config/appium-sensitive.json' with { type: 'json' };

await test('sensitive Appium logs preserve readiness and redact command payloads', () => {
  const [rule] = appiumSensitiveConfig.server['log-filters'];
  const redact = (message: string) => message.replace(new RegExp(rule.pattern, 'g'), rule.replacer);
  const ready = 'Appium REST http interface listener started on http://127.0.0.1:4723';
  assert.equal(redact(ready), ready);
  for (const message of [
    'POST /session/abc/element/def/value {"text":"test-secret"}',
    'Request failed\nprivate payment data',
    `${ready}\nprivate payment data`,
    `${ready}?secret=private`,
  ]) {
    assert.equal(redact(message), '[REDACTED]');
  }
});
