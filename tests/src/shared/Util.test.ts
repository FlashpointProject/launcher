import { clearArray, removeFileExtension, sizeToString, stringifyArray, StringifyArrayOpts, recursiveDirectory, IRecursiveDirectoryOptions, versionNumberToText } from '@shared/Util';
import * as path from 'path';
import { STATIC_PATH } from '@tests/setup';

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

  /** EPIPE errors? */

  // test('Can Read Write (Safe Test)', () => {
  //   const realPath = path.resolve(RESULT_PATH);
  //   const missingPath = path.join(RESULT_PATH, 'FAKE_PATH');
  //   expect(canReadWrite(realPath)).resolves.toBe(true);
  //   expect(canReadWrite(missingPath)).resolves.toBe(false);
  // });
});