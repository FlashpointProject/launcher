import * as fs from 'fs';
import * as path from 'path';

/**
 * Stringify anything to a json string ready to be saved to a file
 * @param data Data to be stringified
 * @returns JSON string of given data
 */
export function stringifyJsonDataFile(data: any): string {
  return JSON.stringify(data, null, 2).replace(/\n/g, '\r\n');
}

/**
 * Check if all properties of both arguments have strictly equals values,
 * and if both objects have identical properties (same number of props with the same names)
 * @param first 
 * @param second 
 */
export function shallowStrictEquals(first: any, second: any): boolean {
  for (let key in first) {
    if (!(key in second) || first[key] !== second[key]) {
      return false;
    }
  }
  for (let key in second) {
    if (!(key in first) || first[key] !== second[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Recursively copy values from data to target (for every property of the same name)
 * @param target Target object to copy data to
 * @param source Source object to copy data from
 * @returns Target object
 */
export function recursiveReplace<T = any>(target: T, source: any): T {
  // Skip if source is missing
  if (!source) { return target; }
  // Go through all properties of target
  for (let key in source) {
    // Check if data has a property of the same name
    if (key in target) {
      const val = source[key];
      // If the value is an object
      if (val !== null && typeof val === 'object') {
        // Go one object deeper and continue copying
        recursiveReplace((target as any)[key], val);
      } else {
        // Copy the value
        (target as any)[key] = val;
      }
    }
  }
  return target;
}

/**
 * Recursively copy and object and its "sub-objects"
 * (WARNING: This will overflow the stack if it tries to copy circular references)
 * @param source Object to copy from
 * @returns New copy of source
 */
export function deepCopy<T = any>(source: T): T {
  const copy: any = Array.isArray(source) ? [] : {};
  for (let key in source) {
    let val = source[key];
    if (val !== null && typeof val === 'object') {
      val = deepCopy(val);
    }
    copy[key] = val;
  }
  return copy;
}

/** Try parsing a JSON string into an object and return that object, or an error if one occurred */
export function tryParseJSON(jsonString: string): any|Error {
  let ret: any|Error;
  try {
    ret = JSON.parse(jsonString);
  } catch(error) {
    ret = error;
  }
  return ret;
}

/**
 * Reursively go down a folder and call back for each file encountered
 * @param options Various options (a shallow copy of this is accessible from the callback)
 * @returns A promoise that resolves when either all files have been called back for or recursion is aborted
 */
export async function recursiveDirectory(options: IRecursiveDirectoryOptions): Promise<void> {
  const shared: IRecursiveDirectorySharedObject = {
    options: Object.assign({}, options), // (Shallow Copy)
    abort: false,
  };
  return innerRecursiveDirectory(shared, '');
}

async function innerRecursiveDirectory(shared: IRecursiveDirectorySharedObject, dirPath: string): Promise<void> {
  return new Promise<void>(async function(resolve, reject) {
    // Full path to the current folder
    const fullDirPath: string = path.join(shared.options.directoryPath, dirPath);
    // Get the names of all files and sub-folders
    fs.readdir(fullDirPath, function (err, files): void {
      if (shared.abort) { return resolve(); } // (Abort exit point)
      if (err) { reject(err); }
      else {
        // Resolve if folder is empty
        if (files.length === 0) { return resolve(); }
        // Get the stats of each folder/file to verify if they are a folder or file
        // (And wait for every single one to complete before resolving the promise)
        let filesOrFoldersLeft: number = files.length;
        for (let i = files.length - 1; i >= 0; i--) {
          const filename = files[i];
          fs.stat(path.join(fullDirPath, filename), async function(err, stats) {
            if (shared.abort) { return resolve(); } // (Abort exit point)
            if (err) { reject(err); }
            else {
              if (stats.isFile()) {
                const p = shared.options.fileCallback({
                  shared: shared,
                  filename: filename,
                  relativePath: dirPath,
                });
                if (p) { await p; }
              } else {
                await innerRecursiveDirectory(shared, path.join(dirPath, filename)).catch(reject);
              }
            }
            filesOrFoldersLeft -= 1;
            if (filesOrFoldersLeft === 0) {
              resolve();
            }
          });
        }
      }
    });
  });
}

export interface IRecursiveDirectoryOptions {
  /** Folder to start recursion in */
  directoryPath: string;
  /** Called for each file encountered */
  fileCallback: (obj: IRecursiveDirectoryObject) => Promise<void>|void;
}

export interface IRecursiveDirectoryObject {
  /** Shared root object for all callbacks in the same recursive search */
  shared: IRecursiveDirectorySharedObject;
  /** Filename of the current file */
  filename: string;
  /** Relative path to the root folder (NOT including the filename) */
  relativePath: string;
}

export interface IRecursiveDirectorySharedObject {
  /** Options used to start the recursion */
  options: IRecursiveDirectoryOptions;
  /** If true, it will abort the recursion (do not set to anything other than false) */
  abort: boolean;
}
