import { Coerce } from '@shared/utils/Coerce';

describe('Coercion Utils', () => {
  test('Coerce Any to Str', () => {
    expect(Coerce.str(8)).toBe('8');
    expect(Coerce.str('seven')).toBe('seven');
    expect(Coerce.str({ data: 'object' })).toBe('[object Object]');
    expect(Coerce.str(undefined)).toBe('');
  });

  test('Coerce Str to Boolean', () => {
    expect(Coerce.strToBool('yEs')).toBeTruthy();
    expect(Coerce.strToBool('trUe')).toBeTruthy();
    expect(Coerce.strToBool('nO')).toBeFalsy();
    expect(Coerce.strToBool('faLse')).toBeFalsy();
    expect(Coerce.strToBool('inValID')).toBeFalsy();
    expect(Coerce.strToBool('inValID', true)).toBeTruthy();
  });

  test('Coerce Any to Num', () => {
    expect(Coerce.num('3')).toBe(3);
    expect(Coerce.num('word')).toBe(0);
    expect(Coerce.num({ data: 'object' })).toBe(0);
  });
});