describe('Reminders - Detox', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  it('should create a reminder for a habit', async () => {
    // Navigate to an existing habit; assume habit list item has testID habitListItem-<id>
    await element(by.id('habitListItem-habit-1')).tap();
    await element(by.id('addReminderBtn')).tap();
    await element(by.id('reminderTimeInput')).typeText('07:00');
    await element(by.id('reminderRepeatDaily')).tap();
    await element(by.id('reminderSaveBtn')).tap();
    await expect(element(by.text('07:00'))).toBeVisible();
  });
});
