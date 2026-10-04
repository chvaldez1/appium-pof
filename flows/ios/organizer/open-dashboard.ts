import { browser } from '@wdio/globals';
import { appId, timeoutMs } from '@config/test-settings.ts';
import { organizerDashboardPage } from '@screens/ios/organizer/dashboard.ts';
import { iosLoginPage } from '@screens/ios/auth/login.ts';
import { buyerAccountPage } from '@screens/ios/buyer/account.ts';
import { buyerBottomBar } from '@screens/ios/buyer/bottom-navigation.ts';
import { mainMenuPage } from '@screens/ios/main-menu.ts';
import { organizationSelectionPage } from '@screens/ios/organizer/organization.ts';

const organizationName =
  process.env.SHOWPASS_ORGANIZATION_NAME ?? 'Organization For System Gateway Payment Intent';

async function selectOrganization(): Promise<void> {
  await organizationSelectionPage.select(organizationName);
  await organizerDashboardPage.prompt.waitForDisplayed({ timeout: timeoutMs.pageLoad });
}

export async function openOrganizerDashboard({ allowLogin }: { allowLogin: boolean }): Promise<void> {
  await browser.activateApp(appId);
  await browser.waitUntil(
    async () =>
      (await organizerDashboardPage.prompt.isDisplayed()) ||
      (await organizationSelectionPage.title.isDisplayed()) ||
      (await mainMenuPage.title.isDisplayed()) ||
      (await iosLoginPage.email.isDisplayed()) ||
      (await buyerBottomBar.tab('Account').isDisplayed()),
    { timeout: timeoutMs.pageLoad, timeoutMsg: 'The app did not show a usable starting screen.' },
  );
  if (await organizerDashboardPage.prompt.isDisplayed()) return;
  if (await organizationSelectionPage.title.isDisplayed()) return selectOrganization();
  if ((await mainMenuPage.title.isDisplayed()) && (await mainMenuPage.dashboard.isDisplayed())) {
    await mainMenuPage.openDashboard();
    await browser.waitUntil(
      async () =>
        (await organizerDashboardPage.prompt.isDisplayed()) ||
        (await organizationSelectionPage.title.isDisplayed()),
      { timeout: timeoutMs.uiNavigation, timeoutMsg: 'Dashboard did not open after selecting it.' },
    );
    if (await organizerDashboardPage.prompt.isDisplayed()) return;
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

  if (!(await iosLoginPage.email.isDisplayed())) {
    if (await mainMenuPage.title.isDisplayed()) {
      await mainMenuPage.openLogin();
    } else {
      await buyerBottomBar.open('Account');
      await buyerAccountPage.openLogin();
    }
  }
  await iosLoginPage.signIn(emailAddress, password);
  await browser.waitUntil(
    async () =>
      (await organizationSelectionPage.title.isDisplayed()) ||
      (await organizerDashboardPage.prompt.isDisplayed()),
    {
      timeout: timeoutMs.customerLogin,
      timeoutMsg: 'Organizer login did not reach organization selection or the dashboard.',
    },
  );
  if (!(await organizerDashboardPage.prompt.isDisplayed())) await selectOrganization();
}
