import { generateExtrasAddApp, generateMessageAddApp, convertMeta } from '@shared/curate/parse';

describe('Curate Parse', () => {
  test('Generate Add Apps', () => {
    expect(generateExtrasAddApp('TestSuccess')).toEqual({
      heading: 'Extras',
      applicationPath: ':extras:',
      launchCommand: 'TestSuccess'
    });

    expect(generateMessageAddApp('TestSuccess')).toEqual({
      heading: 'Message',
      applicationPath: ':message:',
      launchCommand: 'TestSuccess'
    });
  });

  test('Catch Invalid and Empty Metas', () => {
    const mockOnError = jest.fn();
    convertMeta('brokens', mockOnError);

    expect(mockOnError).toHaveBeenCalled();
    expect(convertMeta('')).toEqual({
      game: {},
      addApps: []
    });
  });
});