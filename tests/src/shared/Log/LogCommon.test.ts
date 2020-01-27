import { ILogEntry } from '@shared/Log/interface';
import { stringifyLogEntries, stringifyLogEntriesRaw } from '@shared/Log/LogCommon';

describe('Log Functions', () => {
  test('Stringify Log Entries', () => {
    const entryDate = new Date();
    entryDate.setHours(12);
    entryDate.setMinutes(34);
    entryDate.setSeconds(56);
    const entry: ILogEntry = {
      source: 'Game Launcher',
      content: 'TestSuccess',
      timestamp: entryDate.valueOf()
    };

    const stringData = JSON.stringify(stringifyLogEntries([entry]));
    expect(stringData).toMatchSnapshot();
  });

  test('Stringify Log Entries Raw', () => {
    const entryDate = new Date('01-01-2000');
    entryDate.setHours(12);
    entryDate.setMinutes(34);
    entryDate.setSeconds(56);
    const entry: ILogEntry = {
      source: 'Game Launcher',
      content: 'TestSuccess',
      timestamp: entryDate.valueOf()
    };

    const stringData = JSON.stringify(stringifyLogEntriesRaw([entry]));
    expect(stringData).toMatchSnapshot();
  });
});