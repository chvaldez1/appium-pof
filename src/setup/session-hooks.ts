import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browser } from '@wdio/globals';
import { requiredSetting } from '@config/local-env.ts';
import { verifyIosAppBuild } from '@config/ios-app-build.ts';
import {
  dismissOptionalLocationPrompt,
  dismissOptionalNotificationPrompt,
} from '@support/permissions/ios-system-prompts.ts';

export function createSessionHooks({
  target,
  output,
  sensitiveRun,
}: {
  target: string;
  output: string;
  sensitiveRun: boolean;
}): Pick<WebdriverIO.Config, 'before' | 'afterTest'> {
  return {
    before: async function () {
      if (target === 'ios-app') {
        verifyIosAppBuild({ udid: requiredSetting('IOS_UDID', target) });
        await dismissOptionalLocationPrompt();
        await dismissOptionalNotificationPrompt();
      }
      writeFileSync(
        resolve(output, 'session.json'),
        JSON.stringify(
          {
            target,
            node: process.version,
            platform: process.platform,
            architecture: process.arch,
            capabilities: browser.capabilities,
          },
          null,
          2,
        ),
      );
    },
    afterTest: async function (test, context, { passed }) {
      // These sessions enter card or account details; retain JUnit without command logs or UI captures.
      if (sensitiveRun) return;
      const name = test.title.replace(/[^a-z0-9-]/gi, '_').slice(0, 90);
      try {
        await browser.saveScreenshot(
          resolve(output, 'screenshots', `${Date.now()}-${passed ? 'pass' : 'fail'}-${name}.png`),
        );
      } catch (error) {
        console.warn(`Screenshot unavailable: ${String(error)}`);
      }
    },
  };
}
