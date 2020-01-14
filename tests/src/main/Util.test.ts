/* Tests for src/main/Util.ts */
import { isInstalled } from '@main/Util';

// Checks if isInstalled is properly returning true/false
describe('Util.isInstalled()', function() {
  test('Application is not installed', () => {
    return isInstalled('asdfghjk123').then(resp => {
      expect(resp).toBe(false);
    });
  });

  // @TODO Replace - This function won't work on Windows! Is anything even using it?
});
