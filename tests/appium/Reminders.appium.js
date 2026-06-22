// Appium script for Reminders (Android)
const wd = require('wd');

const caps = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  app: '/path/to/app.apk',
  automationName: 'UiAutomator2'
};

describe('Reminders - Appium', function() {
  this.timeout(300000);
  let driver;
  before(async function() {
    driver = await wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init(caps);
  });
  after(async function() {
    if (driver) await driver.quit();
  });
  it('creates a reminder for a habit', async function() {
    const habit = await driver.elementByAccessibilityId('habitListItem-habit-1');
    await habit.click();
    const add = await driver.elementByAccessibilityId('addReminderBtn');
    await add.click();
    const time = await driver.elementByAccessibilityId('reminderTimeInput');
    await time.sendKeys('07:00');
    const daily = await driver.elementByAccessibilityId('reminderRepeatDaily');
    await daily.click();
    const save = await driver.elementByAccessibilityId('reminderSaveBtn');
    await save.click();
  });
});
