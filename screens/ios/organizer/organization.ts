import { $ } from '@wdio/globals';
import { timeoutMs } from '@config/test-settings.ts';

class OrganizationSelectionPage {
  get title() {
    return $('~Select organization');
  }

  get search() {
    return $('//XCUIElementTypeTextField[contains(@name,"Search organization")]');
  }

  organization(name: string) {
    return $(`~${name}`);
  }

  async select(name: string): Promise<void> {
    await this.title.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    if (!(await this.organization(name).isDisplayed())) {
      await this.search.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
      await this.search.setValue(name);
    }
    await this.organization(name).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.organization(name).click();
  }
}

export const organizationSelectionPage = new OrganizationSelectionPage();
