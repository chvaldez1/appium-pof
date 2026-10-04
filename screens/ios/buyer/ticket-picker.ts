import assert from 'node:assert/strict';
import { $, $$, browser } from '@wdio/globals';
import { pauseMs, timeoutMs } from '@config/test-settings.ts';
import { xpathLiteral } from '@shared/helpers/xpath-literal.ts';

const emptyQuantity = '0';

class IosTicketPickerPage {
  get increment() {
    return $('~Increment item quantity');
  }
  get checkout() {
    return $('//XCUIElementTypeButton[starts-with(@name,"Checkout")]');
  }

  private ticketControls(name: string): string {
    const header = `//XCUIElementTypeOther[@name=${xpathLiteral(name)} and XCUIElementTypeStaticText[@name=${xpathLiteral(name)}]]`;
    return `${header}/following-sibling::XCUIElementTypeOther[.//XCUIElementTypeButton[@name="Increment item quantity"]][1]`;
  }
  selectedQuantity(name: string) {
    return $(`${this.ticketControls(name)}//XCUIElementTypeTextField[@name="Enter a quantity"]`);
  }
  incrementTicket(name: string) {
    return $(`${this.ticketControls(name)}//XCUIElementTypeButton[@name="Increment item quantity"]`);
  }
  get allQuantities() {
    return $$('~Enter a quantity');
  }

  async waitForOpen(timeout: number = timeoutMs.uiControl): Promise<void> {
    await this.increment.waitForDisplayed({ timeout });
  }
  async selectTicket(name: string, quantity: number): Promise<void> {
    await this.incrementTicket(name).waitForDisplayed({ timeout: timeoutMs.uiControl });
    const quantities = await this.allQuantities;
    assert.ok((await quantities.length) > 0, 'No ticket quantity controls were shown.');
    for (const field of quantities) {
      assert.equal(await field.getValue(), emptyQuantity, 'Start with an empty basket; set RESET_APP=1.');
    }
    for (let count = 0; count < quantity; count += 1) await this.incrementTicket(name).click();
    assert.equal(await this.selectedQuantity(name).getValue(), String(quantity));
    let selectedTotal = 0;
    for (const field of await this.allQuantities) selectedTotal += Number(await field.getValue());
    assert.equal(selectedTotal, quantity, 'Only the chosen ticket type should be selected.');
  }
  async openCheckout(): Promise<void> {
    await this.checkout.waitForEnabled({ timeout: timeoutMs.uiNavigation });
    await this.checkout.click();
    await browser.pause(pauseMs.checkoutTransition);
  }
}

export const iosTicketPickerPage = new IosTicketPickerPage();
