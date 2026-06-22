/* eslint-env jest */

jest.mock('react-native-screens', () => {
  return {
    enableScreens: jest.fn(),
  };
});
