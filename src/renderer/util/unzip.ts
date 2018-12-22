import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as yauzl from 'yauzl';

export declare interface UnzipStatus {
  /** Fired when an error occurs, this also means that the unzipping process has ended */
  once(event: 'error', handler: (error: any) => void): this;
  emit(event: 'error', error: any): boolean;
  /** Fired when something goes wrong, this DOES NOT mean that the unzipping process has ended */
  on(event: 'warn', handler: (warning: string) => void): this;
  emit(event: 'warn', warning: string): boolean;
  /** Fired when the unzipping is done (and it was successful) */
  once(event: 'done', handler: () => void): this;
  emit(event: 'done'): boolean;
}

export class UnzipStatus extends EventEmitter {
  constructor() {
    super();
  }
}

/**
 * Unzip a local archive file at a location
 * @param sourceFile Path of file to unzip
 * @param outputFolder Path of folder to put unzipped files into
 */
export function unzip(sourceFile: string, outputFolder: string): UnzipStatus {
  const status = new UnzipStatus();
  yauzl.open(sourceFile, { lazyEntries: true }, (error, zip) => {
    if (error) { return status.emit('error', error); }
    if (!zip) { return status.emit('error', new Error('zip is missing')); }
    // Add event listeners
    zip
    .on('close', () => {
      status.emit('done');
    })
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
              readStream.on('end', () => {
                zip.readEntry();
              });
              readStream.pipe(writeStream);
            });
          });
        }        
      }
    });
    // Start extracting
    zip.readEntry();
  });
  return status;
}

/** Make sure all directories in the path exists, create any that are missings */
function mkdirp(dir: string, cb: (error?: Error) => void): void {
  if (dir === '.') { return cb(); }
  fs.stat(dir, (error) => {
    if (error && error.code === 'ENOENT') { // file not found
      const parent = path.dirname(dir);
      mkdirp(parent, () => {
        fs.mkdir(dir, cb);
      });
    } else { cb(error); } // (error is either undefined, or an unhandled error)
  });
}
