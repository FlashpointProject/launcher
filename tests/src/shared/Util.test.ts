import { clearArray, removeFileExtension, sizeToString, stringifyArray, StringifyArrayOpts, recursiveDirectory, IRecursiveDirectoryOptions, versionNumberToText, canReadWrite, recursiveReplace, shallowStrictEquals } from '@shared/Util';
import * as path from 'path';
import { STATIC_PATH, RESULT_PATH } from '@tests/setup';
import { shallowEqual } from 'react-redux';

describe('Shared Utils', () => {
  test('Remove File Extension', () => {
    const fullName = 'filename.txt';
    const strippedName = 'filename';

    expect(removeFileExtension(fullName)).toEqual(strippedName);
    expect(removeFileExtension(strippedName)).toEqual(strippedName);
  });

  test('Stringify Array', () => {
    // Non-Trimmed
    const opts: StringifyArrayOpts = { trimStrings: false };
    const optsTrimmed: StringifyArrayOpts = { trimStrings: true };
    const array = [0, ' test ', null];
    const formattedArray = '[ 0, " test ", null ]';
    const formattedArrayTrimmed = '[ 0, "test", null ]';
    expect(stringifyArray(array, opts)).toEqual(formattedArray);
    expect(stringifyArray(array, optsTrimmed)).toEqual(formattedArrayTrimmed);
  });

  test('Version to Text', () => {
    const date = new Date();
    date.setFullYear(2020);
    date.setMonth(0);
    date.setDate(1);

    expect(versionNumberToText(date.valueOf())).toEqual('2020-01-01');
    expect(versionNumberToText(-1)).toEqual('version not found');
    expect(versionNumberToText(-2)).toEqual('version not loaded');
    expect(versionNumberToText(-123)).toEqual('unknown version error');
  });

  test('Recursive Directory', async () => {
    const foundFiles: string[] = [];
    const foundFilesExpected = ['LayerOne_File', 'LayerTwo_File', ];
    const recursivePath = path.join(STATIC_PATH, 'Util_Shared', 'Recursive');
    const opts: IRecursiveDirectoryOptions = {
      directoryPath: recursivePath,
      fileCallback: (obj) => {
        foundFiles.push(obj.filename);
      }
    };
    await recursiveDirectory(opts);
    // Recursion should have populated foundFiles with all files in that deep dir
    for (const file of foundFilesExpected) {
      expect(foundFiles).toContainEqual(file);
    }
  });

  test('Clear Array', () => {
    const array = [1, undefined, 3, undefined, 5];
    const clearedArray = [1, 3, 5];

    expect(clearArray(array)).toEqual(clearedArray);
  });

  test('Size To String', () => {
    const byte = 1;
    const kilobyte = 1 * 1000;
    const megabyte = 1 * 1000 * 1000;
    const gigabyte = 1 * 1000 * 1000 * 1000;

    expect(sizeToString(byte)).toBe('1B');
    expect(sizeToString(kilobyte)).toBe('1.00KB');
    expect(sizeToString(megabyte)).toBe('1.00MB');
    expect(sizeToString(gigabyte)).toBe('1.00GB');
  });

  test('Shallow Equals', () => {
    const a = {
      one: 'one',
      two: 'two',
    };
    const b = {
      one: 'one',
      two: 'two',
    };
    const c = {
      one: 'two',
      two: 'two'
    };
    const d = {...a, three: 'three'};

    expect(shallowStrictEquals(a, b)).toBeTruthy(); // Equal properties
    expect(shallowStrictEquals(a, c)).toBeFalsy(); // Different properties
    expect(shallowStrictEquals(a, d)).toBeFalsy(); // Different number of properties
    expect(shallowStrictEquals({ a: {} }, { a: {} })).toBeFalsy(); // Not strictly equal properties (refs)
  });

  test('Recursive Replace', () => {
    const replaceData = {
      level_one: {
        data_one: 'TestSuccess',
        data_two: undefined,
        not_copy: 'TestFailure'
      }
    };
    const toReplace = {
      level_one: {
        data_one: 'TestFailure',
        data_two: 'TestFailure',
        data_three: 'TestSuccess'
      }
    };

    expect(recursiveReplace(toReplace, replaceData)).toEqual({
      level_one: {
        data_one: 'TestSuccess',
        data_two: undefined,
        data_three: 'TestSuccess'
      }
    });
  });

  test('Can Read Write (Safe Test)', async () => {
    const realPath = path.resolve(RESULT_PATH);
    const missingPath = path.join(RESULT_PATH, 'FAKE_PATH');
    await expect(canReadWrite(realPath)).resolves.toBeTruthy();
    await expect(canReadWrite(missingPath)).resolves.toBeFalsy();
  });
});