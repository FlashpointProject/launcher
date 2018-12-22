import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as yauzl from 'yauzl';

export declare interface UnzipStatus {
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

export class UnzipStatus extends EventEmitter {
  /** Total size of the extracted zip (in bytes) */
  public totalSize: number = 0;
  /** Total amount extracted (in bytes) */
  public extractedSize: number = 0;
}

/**
 * Unzip a local archive file at a location
 * @param sourceFile Path of file to unzip
 * @param outputFolder Path of folder to put unzipped files into
 */
export function unzip(sourceFile: string, outputFolder: string): UnzipStatus {
  const status = new UnzipStatus();
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

/** Create a transform stream that reads the length of the data being passed along */
function createMiddleStream(onData: (length: number) => void): stream.Transform {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(chunk);
      onData(chunk.length);
      callback();
    }
  });
}
