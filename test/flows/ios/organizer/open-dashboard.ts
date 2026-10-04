import { $, browser } from '@wdio/globals';
import { appId, timeoutMs } from '../../../settings.ts';
import { dashboardPrompt } from '../../../screens/ios/organizer/dashboard.ts';
import { submitIphoneLogin } from '../../../screens/ios/auth/login.ts';

const organizationName =
  process.env.SHOWPASS_ORGANIZATION_NAME ?? 'Organization For System Gateway Payment Intent';

async function isVisible(name: string): Promise<boolean> {
  return (await $(`~${name}`)).isDisplayed();
}

async function selectOrganization(): Promise<void> {
  await $('~Select organization').waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  const organization = await $(`~${organizationName}`);
  if (!(await organization.isDisplayed())) {
    const search = await $('//XCUIElementTypeTextField[contains(@name,"Search organization")]');
    await search.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await search.setValue(organizationName);
  }
  await organization.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
  await organization.click();
  await $(`~${dashboardPrompt}`).waitForDisplayed({ timeout: timeoutMs.pageLoad });
}

export async function openOrganizerDashboard({ allowLogin }: { allowLogin: boolean }): Promise<void> {
  await browser.activateApp(appId);
  const alert = await browser.getAlertText().catch(() => '');
  if (/location/i.test(alert)) await browser.dismissAlert();
  const account = await $('//XCUIElementTypeButton[contains(@name,"Account")]');
  const email = await $('//XCUIElementTypeTextField[contains(@name,"Email")]');
  await browser.waitUntil(
    async () =>
      (await isVisible(dashboardPrompt)) ||
      (await isVisible('Select organization')) ||
      (await isVisible('Main menu')) ||
      (await email.isDisplayed()) ||
      (await account.isDisplayed()),
    { timeout: timeoutMs.pageLoad, timeoutMsg: 'The app did not show a usable starting screen.' },
  );
  if (await isVisible(dashboardPrompt)) return;
  if (await isVisible('Select organization')) return selectOrganization();
  if ((await isVisible('Main menu')) && (await isVisible('Dashboard'))) {
    await $('~Dashboard').click();
    await browser.waitUntil(
      async () => (await isVisible(dashboardPrompt)) || (await isVisible('Select organization')),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Dashboard did not open after selecting it.' },
    );
    if (await isVisible(dashboardPrompt)) return;
    return selectOrganization();
  }

  if (!allowLogin) {
    throw new Error('The organizer session was not retained after restarting the app.');
  }
  const emailAddress = process.env.SHOWPASS_ORGANIZER_EMAIL;
  const password = process.env.SHOWPASS_ORGANIZER_PASSWORD;
  if (!emailAddress || !password) {
    throw new Error('Set SHOWPASS_ORGANIZER_EMAIL and SHOWPASS_ORGANIZER_PASSWORD.');
  }

  if (!(await email.isDisplayed())) {
    if (await isVisible('Main menu')) {
      await $('~Login').click();
    } else {
      await account.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
      await account.click();
      await $('~Login').click();
    }
  }
  await submitIphoneLogin(emailAddress, password);
  await browser.waitUntil(
    async () => (await isVisible('Select organization')) || (await isVisible(dashboardPrompt)),
    {
      timeout: timeoutMs.customerLogin,
      timeoutMsg: 'Organizer login did not reach organization selection or the dashboard.',
    },
  );
  if (!(await isVisible(dashboardPrompt))) await selectOrganization();
}
