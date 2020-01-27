import { formatString } from '@shared/utils/StringFormatter';

describe('String Formatting Utils', () => {
  test('Variable Strings', () => {
    expect(formatString('Test Success', 'Test')).toBe('Test Success');
    expect(formatString('{0} Success', 'Test')).toBe('Test Success');
    expect(formatString('{1} {0} Success', 'Test', 'A')).toBe('A Test Success');
    expect(() => formatString('{} Success', 'Test')).toThrowError();
  });
});