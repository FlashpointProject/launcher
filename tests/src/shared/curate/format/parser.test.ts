import { parseCurationFormat } from '@shared/curate/format/parser';
import { tokenizeCurationFormat } from '@shared/curate/format/tokenizer';

describe('parseCurationFormat()', function () {
  test('Empty string', () => {
    expect(parseCurationFormat(tokenizeCurationFormat('')))
    .toEqual({});
  });
  test('List', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'list:\n'+
      '- some\n'+
      '- boring\n'+
      '- stuff'
    ))).toEqual({ list: ['some', 'boring', 'stuff'] });
  });
  test('Flat object', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'a: abc\n'+
      'b: 123\n'+
      'c: !?!'
    ))).toEqual({ a: 'abc', b: '123', c: '!?!' });
  });
  test('Nested objects', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'a:\n'+
      '    b:\n'+
      '        c:\n'+
      '            d: foo\n'
    ))).toEqual({
      a: { b: { c: { d: 'foo' } } }
    });
  });
  test('Nested objects (with one additional property each)', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'root:\n'+
      '    id: 1\n'+
      '    child:\n'+
      '        id: 2\n'+
      '        child:\n'+
      '            id: 3'
    ))).toEqual({
      root: {
        id: '1',
        child: {
          id: '2',
          child: { id: '3' }
        }
      }
    });
  });
  test('Mixed spaces and tabs as indentation', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'a:\n'+
      '\tb:\n'+
      '\t    c:\n'+
      '\t    \td:\n'+
      '    \t\t    e:'
    ))).toEqual({
      a: { b: { c: { d: { e: '' } } } }
    });
  });
  test('Mixed spaces and tabs as separator between identifier and value', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'a: 1\n'+
      'b:  2\n'+
      'c:\t3\n'+
      'd: \t4\n'+
      'e:\t 5'
    ))).toEqual({
      a: '1', b: '2', c: '3', d: '4', e: '5'
    });
  });
  test('Multiline value', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'var: |\n'+
      '    123\n'+
      '    abc\n'+
      '    !?!\n'
    ))).toEqual({
      var: '123\nabc\n!?!'
    });
  });
  test('Multiline value with indent changes', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      'var: |\n'+
      '    1\n'+
      '\t\t\t2\n'+
      '    \t    3\n'+
      'var2: abc'
    ))).toEqual({
      var: '1\n\t\t2\n\t    3',
      var2: 'abc',
    });
  });
  test('Comments', () => {
    expect(parseCurationFormat(tokenizeCurationFormat(
      '# This is a comment\n'+
      'test: # This is NOT a comment\n'+
      'obj:\n'+
      '    a: 1\n'+
      '# Second comment\n'+
      '    b: 2\n'
    ))).toEqual({
      test: '# This is NOT a comment',
      obj: { a: '1', b: '2' }
    });
  });
});
