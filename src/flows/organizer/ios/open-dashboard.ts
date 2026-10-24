import { browser } from '@wdio/globals';
import { appId, timeoutMs } from '@config/test-settings.ts';
import { organizerDashboardPage } from '@screens/native/ios/organizer/dashboard.ts';
import { iosLoginPage } from '@screens/native/ios/auth/login.ts';
import { buyerAccountPage } from '@screens/native/ios/buyer/account.ts';
import { buyerBottomBar } from '@screens/native/ios/buyer/bottom-navigation.ts';
import { mainMenuPage } from '@screens/native/ios/main-menu.ts';
import { organizationSelectionPage } from '@screens/native/ios/organizer/organization.ts';
import { dismissPresentIosSystemPrompt } from '@support/permissions/ios-system-prompts.ts';

const organizationName =
  process.env.SHOWPASS_ORGANIZATION_NAME ?? 'Organization For System Gateway Payment Intent';

const screens = {
  dashboard: () => organizerDashboardPage.prompt.isDisplayed(),
  organization: () => organizationSelectionPage.title.isDisplayed(),
  menu: () => mainMenuPage.title.isDisplayed(),
  login: () => iosLoginPage.email.isDisplayed(),
  buyer: () => buyerBottomBar.tab('Account').isDisplayed(),
};
type Screen = keyof typeof screens;

async function waitForScreen(candidates: Screen[], timeout: number, timeoutMsg: string): Promise<Screen> {
  let screen: Screen | undefined;
  await browser.waitUntil(
    async () => {
      if (await dismissPresentIosSystemPrompt(browser)) return false;
      for (const candidate of candidates) {
        if (await screens[candidate]()) {
          screen = candidate;
          return true;
        }
      }
      return false;
    },
    { timeout, timeoutMsg },
  );
  if (!screen) throw new Error(timeoutMsg);
  return screen;
}

async function selectOrganization(): Promise<void> {
  await dismissPresentIosSystemPrompt(browser);
  await organizationSelectionPage.select(organizationName);
  await waitForScreen(['dashboard'], timeoutMs.pageLoad, 'The Organizer dashboard did not render.');
}

export async function openOrganizerDashboard({ allowLogin }: { allowLogin: boolean }): Promise<void> {
  const started = performance.now();
  const reportReady = (authentication: 'retained session' | 'login submitted') => {
    console.log(
      `Organizer dashboard ready in ${((performance.now() - started) / 1000).toFixed(1)}s (${authentication}).`,
    );
  };
  await browser.activateApp(appId);
  const screen = await waitForScreen(
    ['dashboard', 'organization', 'menu', 'login', 'buyer'],
    timeoutMs.pageLoad,
    'The app did not show a usable starting screen.',
  );
  if (screen === 'dashboard') return reportReady('retained session');
  if (screen === 'organization') {
    await selectOrganization();
    return reportReady('retained session');
  }
  if (screen === 'menu' && (await mainMenuPage.dashboard.isDisplayed())) {
    await mainMenuPage.openDashboard();
    const destination = await waitForScreen(
      ['dashboard', 'organization'],
      timeoutMs.uiNavigation,
      'Dashboard did not open after selecting it.',
    );
    if (destination === 'organization') await selectOrganization();
    return reportReady('retained session');
  }

  if (!allowLogin) {
    throw new Error('The organizer session was not retained after restarting the app.');
  }
  const emailAddress = process.env.SHOWPASS_ORGANIZER_EMAIL;
  const password = process.env.SHOWPASS_ORGANIZER_PASSWORD;
  if (!emailAddress || !password) {
    throw new Error('Set SHOWPASS_ORGANIZER_EMAIL and SHOWPASS_ORGANIZER_PASSWORD.');
  }

  if (screen !== 'login') {
    if (screen === 'menu') {
      await mainMenuPage.openLogin();
    } else {
      await buyerBottomBar.open('Account');
      await buyerAccountPage.openLogin();
    }
  }
  await iosLoginPage.signIn(emailAddress, password);
  const destination = await waitForScreen(
    ['dashboard', 'organization'],
    timeoutMs.customerLogin,
    'Organizer login did not reach organization selection or the dashboard.',
  );
  if (destination === 'organization') await selectOrganization();
  reportReady('login submitted');
}
