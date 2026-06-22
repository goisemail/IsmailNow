// Appium script for History & Analytics (Android)
const wd = require('wd');

const caps = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  app: '/path/to/app.apk',
  automationName: 'UiAutomator2'
};

describe('History Analytics - Appium', function() {
  this.timeout(300000);
  let driver;
  before(async function() {
    driver = await wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init(caps);
  });
  after(async function() {
    if (driver) await driver.quit();
  });
  it('views history analytics for a habit', async function() {
    const habit = await driver.elementByAccessibilityId('habitListItem-habit-1');
    await habit.click();
    const historyAnalytics = await driver.elementByAccessibilityId('historyAnalyticsBtn');
    await historyAnalytics.click();
    const last7 = await driver.elementByAccessibilityId('dateRangeLast7');
    await last7.click();
    const chart = await driver.elementByAccessibilityId('analyticsChart');
    // If chart is not visible, this assertion will fail and guide fixups
    if (!chart) throw new Error('Analytics chart not visible');
  });
});
