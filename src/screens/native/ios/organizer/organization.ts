import { $, browser } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';
import { enterIosText } from '@support/input/ios-text-input.ts';

class OrganizationSelectionPage {
  get title() {
    return $('~Select organization');
  }

  get search() {
    return $(
      '//XCUIElementTypeTextField[contains(@name,"Search organization") or @value="Search organization"]',
    );
  }

  organization(name: string) {
    return $(`-ios predicate string:name == "list-item-avatar" AND label == ${JSON.stringify(name)}`);
  }

  async select(name: string): Promise<void> {
    await this.title.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    if (!(await this.organization(name).isDisplayed())) {
      await this.search.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
      await enterIosText(await this.search, name);
      if (await browser.isKeyboardShown()) {
        await browser.execute('mobile: hideKeyboard', { keys: ['search', 'Search'] });
      }
    }
    await this.organization(name).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.organization(name).click();
  }
}

export const organizationSelectionPage = new OrganizationSelectionPage();
