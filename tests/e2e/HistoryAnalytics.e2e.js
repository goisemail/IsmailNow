describe('History & Analytics - Detox', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  it('should view history and analytics for a habit', async () => {
    // Open Habit Details for a given habit and navigate to analytics
    await element(by.id('habitListItem-habit-1')).tap();
    await element(by.id('historyAnalyticsBtn')).tap();
    // Select a date range like Last 7 days
    await element(by.id('dateRangeLast7')).tap();
    await expect(element(by.id('analyticsChart'))).toBeVisible();
  });
});
