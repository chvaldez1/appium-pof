import { $, browser } from '@wdio/globals';
import { pauseMs, timeoutMs } from '@config/test-settings.ts';
import { xpathLiteral } from '@shared/helpers/xpath-literal.ts';
import { enterIosText } from '@shared/ios/text-input.ts';

class IosExplorePage {
  get searchButton() {
    return $('~Search location or event');
  }
  get searchField() {
    return $('//XCUIElementTypeTextField[@placeholderValue="Search location or event"]');
  }
  get searchSubmit() {
    return $('//XCUIElementTypeButton[@name="Search"]');
  }
  eventBanner(name: string) {
    return $(
      `//XCUIElementTypeOther[contains(@name,"banner") and contains(@name,${xpathLiteral(name)}) and @accessible="true"]`,
    );
  }
  async openSearch(): Promise<void> {
    await this.searchButton.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.searchButton.click();
  }
  async enterEventName(name: string): Promise<void> {
    await enterIosText(await this.searchField, name);
    await browser.pause(pauseMs.searchSuggestions);
  }
  async submitSearch(): Promise<void> {
    await this.searchSubmit.waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.searchSubmit.waitForEnabled({ timeout: timeoutMs.uiControl });
    await this.searchSubmit.click();
    await browser.pause(pauseMs.searchResults);
  }
  async openEventResult(name: string): Promise<void> {
    await this.eventBanner(name).waitForDisplayed({ timeout: timeoutMs.uiNavigation });
    await this.eventBanner(name).click();
  }
}

export const iosExplorePage = new IosExplorePage();
