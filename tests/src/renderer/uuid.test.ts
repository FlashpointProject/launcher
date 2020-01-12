/* Tests for src/renderer/uuid.test.ts */
import { validateSemiUUID, uuid } from '@renderer/util/uuid';

describe('uuid.uuid()', function () {
  test('Returns string of proper length?', () => {
    expect(uuid()).toHaveLength(36);
  });
});

describe('uuid.validateSemiUUID()', function () {
  test('Empty string', () => {
    expect(validateSemiUUID('')).toBe(false);
  });
  test('Under 36 characters', () => {
    const str: string = '12345678abc';
    expect(validateSemiUUID(str)).toBe(false);
  });
  test('Over 36 characters', () => {
    const str: string = 'asdhbgfgfgajk123214543612312323asadghfga';
    expect(validateSemiUUID(str)).toBe(false);
  });
  test('Invalid hexidecimal characters', () => {
    const str: string = 'bbzz1234-0abc-llll-abcd-abc12345678z';
    expect(validateSemiUUID(str)).toBe(false);
  });
  test('Valid UUID', () => {
    const str: string = '0123abcd-fee2-0987-dfea-cd341234cdef';
    expect(validateSemiUUID(str)).toBe(true);
  });
});
