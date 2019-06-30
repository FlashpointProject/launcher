import * as stream from 'stream';
import * as yauzl from 'yauzl';
import { IOldCurationMeta, parseOldCurationMeta } from './oldFormat';

export type CurationIndex = {
  /** Data of each file in the content folder (and sub-folderss). */
  content: CurationIndexContent[];
  /** Errors that occurred while indexing. */
  errors: CurationIndexError[];
  /** Meta data of the curation. */
  meta: IOldCurationMeta;
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
};

export type CurationIndexContent = {
  /** Name and path of the file (relative to the content folder). */
  fileName: string;
  /** Size of the file (in bytes, uncompressed) */
  fileSize: number;
}

export type CurationIndexError = {
  /** Human readable error message. */
  message: string;
};

export type CurationIndexImage = {
  /** Data of the image file (in case it was extracted from an archive) */
  data?: string;
  /** Location of the image file (in case the image file is accessible). */
  source?: string;
  /** If the images was found. */
  exists: boolean;
  /** Name and path of the file (relative to the content folder). */
  fileName?: string;
};

export function indexCurationFolder(filepath: string): Promise<CurationIndex> {
  return new Promise((resolve, reject) => {
    const curation = createCurationIndex();
    // @TODO Index the folder
    resolve(curation);
  });
}

export function indexCurationArchive(filepath: string): Promise<CurationIndex> {
  return new Promise((resolve, reject) => {
    const curation = createCurationIndex();
    // Open archive
    yauzl.open(filepath, { lazyEntries: true }, (error, zip) => {
      // Failed to open archive
      if (error || !zip) {
        curation.errors.push({ message: error ? error.message : '"zipfile" is missing.' });
        resolve(curation);
        return;
      }
      // Iterate over the contents of the zip, then resolve
      zip
      .on('close', () => { resolve(curation); })
      .on('entry', (entry: yauzl.Entry) => {
        const splitFileName = entry.fileName.toLowerCase().split('/');
        // Meta data file
        if (splitFileName.length === 2 && splitFileName[1] === 'meta.txt') {
          // Try to read and parse the file
          readEntryContent(zip, entry)
          .then((buffer) => {
            curation.meta = parseOldCurationMeta(buffer.toString());
            zip.readEntry();
          })
          .catch(error => {
            curation.errors.push(error);
            resolve(curation);
          });
        }
        // Content file(s)
        else if (splitFileName.length > 2 && splitFileName[1] === 'content' &&
                 splitFileName[2] !== '') {
          // Remove the two first folders from the filename
          const splits = entry.fileName.split('/');
          splits.splice(0, 2);
          const fileName = splits.join('/');
          // Add content to curation index
          curation.content.push({
            fileName: fileName,
            fileSize: entry.uncompressedSize,
          });
          // Read the next file
          zip.readEntry();
        }
        // Thumbnail and Screenshot
        else if (splitFileName.length === 2 &&
                (splitFileName[1].startsWith('logo.') || splitFileName[1].startsWith('ss.'))) {
          // Try to read and parse the file
          readEntryContent(zip, entry)
          .then((buffer) => {
            // ...
            const isThumbnail = splitFileName[1].startsWith('logo.');
            const image: CurationIndexImage = {
              exists: true,
              data: bufferToBase64(buffer),
            };
            if (isThumbnail) { curation.thumbnail  = image; }
            else             { curation.screenshot = image; }
            // Read the next file
            zip.readEntry();
          })
          .catch(error => {
            curation.errors.push(error);
            resolve(curation);
          });
        }
        // Other files (they are ignored)
        else {
          // Read the next file
          zip.readEntry();
        }
      });
      // Start iterating
      zip.readEntry();
    });    
  });
}

/**
 * Stream the contents of an entry into a buffer and return it.
 * @param zip Zip to read from.
 * @param entry Entry to read the conents of.
 */
function readEntryContent(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, readStream) => {
      // Failed to open read stream
      if (error || !readStream) {
        reject(error || new Error('"stream" is missing.'));
        return;
      }
      // Read file into buffer
      const buffer = Buffer.alloc(entry.uncompressedSize);
      const writeStream = createBufferStream(buffer);
      writeStream.on('finish', () => { resolve(buffer); });
      readStream.pipe(writeStream);
    });
  });
}

/** Create an "empty" curation index object. */
function createCurationIndex(): CurationIndex {
  return {
    meta: {},
    content: [],
    errors: [],
    screenshot: createCurationIndexImage(),
    thumbnail: createCurationIndexImage(),
  };
}

function createCurationIndexImage(): CurationIndexImage {
  return {
    exists: false,
  };
}

/**
 * Create a write stream that stores the data in a buffer.
 * @param buffer Buffer to store that data in.
 */
function createBufferStream(buffer: Buffer) {
  // Current offset in the write buffer
  let offset = 0;
  // Create stream
  return new stream.Writable({
    write(chunk, encoding, callback) {
      switch(encoding) {
        case 'buffer':
          (chunk as Buffer).copy(buffer, offset);
          offset += (chunk as Buffer).length;
          callback();
          break;
        default:
          callback(new Error(`Encoding not supported (encoding: "${encoding}").`));
          break;
      }
    }
  });
}

/**
 * Copy a buffers data to a base64 string.
 * @param buffer Buffer to copy data from.
 * @returns Base64 string.
 */
function bufferToBase64(buffer: Buffer): string {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
