import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';
import * as yauzl from 'yauzl';
import { stripBOM } from '../../shared/Util';
import { parseCurationMeta, ParsedCurationMeta } from './parse';

const fsReadFile = promisify(fs.readFile);
const fsReaddir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);

export type CurationIndex = {
  /** Data of each file in the content folder (and sub-folders). */
  content: CurationIndexContent[];
  /** Errors that occurred while indexing. */
  errors: CurationIndexError[];
  /** Meta data of the curation. */
  meta: ParsedCurationMeta;
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
  /** Base64 encoded data of the image file (in case it was extracted from an archive). */
  data?: string;
  /** Raw data of the image file (in case it was extracted from an archive). */
  rawData?: Buffer;
  /** If the images was found. */
  exists: boolean;
  /** Name and path of the file (relative to the curation folder). */
  fileName?: string;
  /** Full path of the image (in case it was loaded from a folder). */
  filePath?: string;
};

/**
 * Index a curation folder (index all content files, load and parse meta etc.)
 * @param filepath Path of the folder to index.
 */
export function indexCurationFolder(filepath: string): Promise<CurationIndex> {
  return new Promise((resolve, reject) => {
    const curation = createCurationIndex();
    return Promise.all([
      // Index content files and folders
      new Promise((resolve, reject) => {
        const contentPath = path.join(filepath, 'content');
        fsStat(contentPath)
        .then(() => { // (Content file found)
          // Index the cotent file (and its content recursively)
          return indexContentFolder(contentPath, contentPath, curation)
          .then(() => { resolve(); })
          .catch(error => { reject(error); });
        }, (error) => { // (Failed to find content folder)
          if (error.code === 'ENOENT') { // No content folder found
            console.error(`Skipped indexing of content. No content folder found in:\n"${filepath}"`);
            resolve();
          } else { reject(error); } // Unexpected error
        });
      }),
      // Check if the image files exist
      (async () => {
        const filenames = await fsReaddir(filepath);
        for (let filename of filenames) {
          const lowerFilename = filename.toLowerCase();
          let image: CurationIndexImage | undefined = undefined;
          // Check which image the file is (if any)
          if (lowerFilename.startsWith('logo.')) {
            image = curation.thumbnail;
          } else if (lowerFilename.startsWith('ss.')) {
            image = curation.screenshot;
          }
          // Check if it was an image file
          if (image) {
            image.exists = true;
            image.fileName = filename;
            image.filePath = fixSlashes(path.join(filepath, filename));
          }
        }
      })(),
      // Read and parse the meta
      (async () => {
        const metaFileData = await fsReadFile(path.join(filepath, 'meta.txt'));
        curation.meta = parseCurationMeta(stripBOM(metaFileData.toString()));
      })(),
    ])
    .then(() => { resolve(curation); })
    .catch(error => { reject(error); });
  });
}

/**
 * Index a curation archive (index all content files, load and parse meta etc.)
 * @param filepath Path of the archive to index.
 */
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
            curation.meta = parseCurationMeta(stripBOM(buffer.toString()));
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
              fileName: entry.fileName,
              data: bufferToBase64(buffer),
              rawData: buffer,
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
 * @param entry Entry to read the contents of.
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
    meta: {
      game: {},
      addApps: [],
    },
    content: [],
    errors: [],
    screenshot: createCurationIndexImage(),
    thumbnail: createCurationIndexImage(),
  };
}

/** Create an "empty" curation index image. */
export function createCurationIndexImage(): CurationIndexImage {
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
      switch (encoding) {
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
  let binary = '';
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Check if a file (inside an archive file) is inside a curation folder.
 * @param filePath Path of the file (inside the archive).
 */
export function isInCurationFolder(filePath: string): boolean {
  const split = filePath.toLowerCase().split('/');
  return (
    // Check if the file is two or more folders deep
    split.length > 2 &&
    // Check if the second folder in the path is the content folder
    // (The first folder is usually named after the name)
    split[1] === 'content' &&
    // Check if the third name is not empty (if it is, then this is a folder)
    split[2] !== ''
  );
}

/**
 * Recursively index the content folder (or one of it's sub-folders, at any depth).
 * @param folderPath Path of the folder to index.
 * @param contentPath Path of the content folder of the curation.
 * @param curation Curation index to add the indexed content to.
 * @returns A promise that is resolved once the index is done.
 */
function indexContentFolder(folderPath: string, contentPath: string, curation: CurationIndex): Promise<void[]> {
  return (
    // List all sub-files (and folders)
    fsReaddir(folderPath)
    // Run a promise on each file (and wait for all to finish)
    .then(files => Promise.all(
      files.map(fileName => {
        const filePath = path.join(folderPath, fileName);
        return fsStat(filePath)
        .then(stats => new Promise<void>((resolve, reject) => {
          const isDirectory = stats.isDirectory();
          // Add content index
          curation.content.push({
            fileName: fixSlashes(path.relative(contentPath, filePath)) + (isDirectory ? '/' : ''),
            fileSize: stats.size,
          });
          // Check if it should recurse
          if (isDirectory) {
            indexContentFolder(filePath, contentPath, curation)
            .then(() => { resolve(); })
            .catch(error => { reject(error); });
          } else { resolve(); } // (It's a file, don't recurse)
        }));
      })
    ))
  );
}

/** Replace all back-slashes with forward slashes. */
function fixSlashes(str: string): string {
  return str.replace(/\\/g, '/');
}
