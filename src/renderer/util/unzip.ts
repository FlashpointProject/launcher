import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as yauzl from 'yauzl';

export declare interface UnzipAllStatus {
  /** Fired whenever progress is made in the process */
  on(event: 'progress', handler: () => void): this;
  emit(event: 'progress'): boolean;
  /** Fired when an error occurs, this also means that the process has ended */
  once(event: 'error', handler: (error: any) => void): this;
  emit(event: 'error', error: any): boolean;
  /** Fired when something goes wrong, this DOES NOT mean that the process has ended */
  on(event: 'warn', handler: (warning: string) => void): this;
  emit(event: 'warn', warning: string): boolean;
  /** Fired when its done (and it was successful) */
  once(event: 'done', handler: () => void): this;
  emit(event: 'done'): boolean;
}

export class UnzipAllStatus extends EventEmitter {
  /** Total size of the extracted zip (in bytes) */
  public totalSize: number = 0;
  /** Total amount extracted (in bytes) */
  public extractedSize: number = 0;
}

/**
 * Extract all the contents of an archive file to a location.
 * @param sourceFile Path of the archive file to unzip.
 * @param outputFolder Path of the folder to extract the files into.
 */
export function unzipAll(sourceFile: string, outputFolder: string): UnzipAllStatus {
  // @TODO Make this function be a simplified wrapper of the more customizable unzip function
  const status = new UnzipAllStatus();
  calculateFileSize();
  return status;
  /** Calculate the file size, then call "extractFile" */
  function calculateFileSize() {
    yauzl.open(sourceFile, { lazyEntries: true }, (error, zip) => {
      if (error) { return status.emit('error', error); }
      if (!zip) { return status.emit('error', new Error('zip is missing')); }
      // Calculate the total size of the extracted zip
      let totalUncompressedSize = 0;
      zip.on('entry', (entry: yauzl.Entry) => {
        totalUncompressedSize += entry.uncompressedSize;
        zip.readEntry();
        if (zip.entriesRead === zip.entryCount) {
          status.totalSize = totalUncompressedSize;
          extractFile();
        }
      });
      // Start calculating
      zip.readEntry();
    });
  }
  /** Extract the contents of the zip */
  function extractFile() {
    yauzl.open(sourceFile, { lazyEntries: true }, (error, zip) => {
      if (error) { return status.emit('error', error); }
      if (!zip) { return status.emit('error', new Error('zip is missing')); }
      // Add event listeners
      zip
      .on('close', () => { status.emit('done'); })
      .on('entry', (entry) => {
        // Get the full path of the file/folder being extracted
        const fullFilePath = path.join(outputFolder, entry.fileName);
        if (!fullFilePath.startsWith(outputFolder)) {
          status.emit('warn', 'ZIP entries are not allowed to escape the "root folder" it is unzipped in.');
          zip.readEntry();
        } else {
          if (/\/$/.test(entry.fileName)) { // (Folder)
            // Directory file names end with '/'
            mkdirp(fullFilePath, (error) => {
              if (error) { return status.emit('error', error); }
              zip.readEntry();
            });
          } else { // (File)
            mkdirp(path.dirname(fullFilePath), (error) => {
              if (error) { return status.emit('error', error); }
              zip.openReadStream(entry, (error, readStream) => {
                if (error) { return status.emit('error', error); }
                if (!readStream) { return status.emit('error', new Error('readStream is missing')); }
                // Extract file
                const writeStream = fs.createWriteStream(fullFilePath);
                readStream.on('end', () => { zip.readEntry(); });
                readStream.pipe(createMiddleStream(length => {
                            status.extractedSize += length;
                            status.emit('progress');
                          }))
                          .pipe(writeStream);
              });
            });
          }
        }
      });
      // Start extracting
      zip.readEntry();
    });
  }
}

export declare interface UnzipStatus {
  /** Fired whenever progress is made in the process. */
  on(event: 'progress', handler: () => void): this;
  emit(event: 'progress'): boolean;
  /** Fired when an error occurs, this also means that the process has ended. */
  once(event: 'error', handler: (error: any) => void): this;
  emit(event: 'error', error: any): boolean;
  /** Fired when something goes wrong, this DOES NOT mean that the process has ended. */
  on(event: 'warn', handler: (warning: string) => void): this;
  emit(event: 'warn', warning: string): boolean;
  /** Fired when its done (and it was successful). */
  on(event: 'done', handler: () => void): this;
  once(event: 'done', handler: () => void): this;
  emit(event: 'done'): boolean;
}

export class UnzipStatus extends EventEmitter {
  /** Total amount of data extracted (in bytes). */
  public extractedSize: number = 0;
}

/**
 * Extract the contents of an archive file.
 * @param options Options for the unzipping.
 */
export function unzip(options: UnzipOptions): UnzipStatus {
  const opts = cleanOptions(options);
  const status = new UnzipStatus();
  // Start extracting
  yauzl.open(opts.source, { lazyEntries: true }, (error, zip) => {
    if (error) { return status.emit('error', error); }
    if (!zip) { return status.emit('error', new Error('zip is missing')); }
    // Add event listeners
    zip
    .on('close', () => { status.emit('done'); })
    .on('entry', (entry: yauzl.Entry) => {
      // Check if this file should be skipped
      if (!opts.filter(entry, opts)) { // (Ignore this file)
        zip.readEntry();
      } else {
        // Get the full path of the file being extracted
        const fullFilePath = path.join(opts.output, opts.generateOutputPath(entry, opts));
        // Check if the file is "climbing" out of the output folder (if it is disallowed)
        const isPathClimbing = opts.allowPathClimbing ? false : !fullFilePath.startsWith(opts.output);
        // Check if the file should be extracted
        if (isPathClimbing) {
          status.emit('warn', 'ZIP entries are not allowed to escape the "root folder" it is unzipped in.');
          zip.readEntry();
        } else {
          // Check if it is a folder or file (folder file names always end with '/')
          const isFolder = entry.fileName.endsWith('/');
          if (isFolder) { // (Folder)
            mkdirp(fullFilePath, (error) => {
              if (error) { return status.emit('error', error); }
              zip.readEntry();
            });
          } else { // (File)
            mkdirp(path.dirname(fullFilePath), (error) => {
              if (error) { return status.emit('error', error); }
              zip.openReadStream(entry, (error, readStream) => {
                if (error) { return status.emit('error', error); }
                if (!readStream) { return status.emit('error', new Error('readStream is missing')); }
                // Extract file
                const writeStream = fs.createWriteStream(fullFilePath);
                readStream
                .on('end', () => { zip.readEntry(); })
                .pipe(
                  createMiddleStream(length => {
                  status.extractedSize += length;
                  status.emit('progress');
                }))
                .pipe(writeStream);
              });
            });
          }
        }
      }
    });
    // Start extracting
    zip.readEntry();
  });
  // Return status object
  return status;
}

/** Make sure all directories in the path exists, create any that are missing. */
function mkdirp(dir: string, cb: (error: Error | null) => void): void {
  if (dir === '.') { return cb(null); }
  fs.stat(dir, (error) => {
    if (error && error.code === 'ENOENT') { // file not found
      const parent = path.dirname(dir);
      mkdirp(parent, () => {
        fs.mkdir(dir, cb);
      });
    } else { cb(error); } // (error is either undefined, or an unhandled error)
  });
}

/** Create a transform stream that reads the length of the data being passed along. */
function createMiddleStream(onData: (length: number) => void): stream.Transform {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(chunk);
      onData(chunk.length);
      callback();
    }
  });
}

/** Create a clean copy of the options. */
function cleanOptions(options: UnzipOptions): CleanUnzipOptions {
  // Create an object with the default options
  const defaultOpts: CleanUnzipOptions = {
    source: '',
    output: '',
    filter: (entry, opts) => true,
    generateOutputPath: (entry, opts) => entry.fileName,
    allowPathClimbing: false,
  };
  // Copy the values from the passed options argument (unless they are undefined)
  const cleanOpts = { ...defaultOpts };
  for (let key in options) {
    const value = (options as any)[key];
    if (value !== undefined) { (cleanOpts as any)[key] = value; }
  }
  // Freeze and return
  return Object.freeze(cleanOpts);
}

type CleanUnzipOptions = Required<UnzipOptions>;

/** Options for the unzip function. */
export type UnzipOptions = {
  /** Path of the archive file to extract from. */
  source: string;
  /** Path of the archive file to extract from. */
  output: string;
  /**
   * Function that filters what files and folders should be extracted.
   * If the function returns true, the file or folder is extracted. If it returns false, it is ignored.
   * Note that even if a folder is filtered out, its sub-files and -folders can still be extracted.
   * By default all files and folders are extracted.
   */
  filter?: (entry: yauzl.Entry, opts: CleanUnzipOptions) => boolean;
  /**
   * Function that generates the output path for each extracted file (relative to the output folder).
   * This includes the filename.
   * By default the path and name of the file inside the archive is used.
   */
  generateOutputPath?: (entry: yauzl.Entry, opts: CleanUnzipOptions) => string;
  /**
   * Allow files to "climb out" of the output folder with relative paths.
   * If enabled, a file with the path "../../../file.txt" extracted to the folder "C:/a/b/c" will place it in "C:/file.txt".
   * This also works with a custom "generateOutputPath" function.
   */
  allowPathClimbing?: boolean;
};

/** Opposite of the type "Partial". */
type Required<T> =
  T extends object
    ? { [P in keyof T]-?: NonNullable<T[P]>; }
    : T;
