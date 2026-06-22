// Appium script for Habit Editor (Android)
// This is a skeleton; fill in actual device/app paths and selectors
const wd = require('wd');
const assert = require('assert');

const caps = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  app: '/path/to/app.apk', // TODO: set path
  automationName: 'UiAutomator2'
};

describe('Habit Editor - Appium', function() {
  this.timeout(300000);
  let driver;

  before(async function() {
    driver = await wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init(caps);
  });

  after(async function() {
    if (driver) {
      await driver.quit();
    }
  });

  it('creates a habit (basic flow)', async function() {
    // Use accessibility ids or resource ids as selectors
    const editorBtn = await driver.elementByAccessibilityId('openHabitEditorBtn');
    await editorBtn.click();
    const nameInput = await driver.elementByAccessibilityId('habitEditorNameInput');
    await nameInput.sendKeys('Morning Run');
    const cadenceDaily = await driver.elementByAccessibilityId('habitEditorCadenceDaily');
    await cadenceDaily.click();
    const saveBtn = await driver.elementByAccessibilityId('habitEditorSaveBtn');
    await saveBtn.click();
  });
});
