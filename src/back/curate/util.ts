import { serveFile } from '@back/util/FileServer';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { fixSlashes } from '@shared/Util';
import { uuid } from '@back/util/uuid';
import { LoadedCuration } from '@shared/curate/types';
import { Progress } from 'node-7z';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { getContentFolderByKey } from '@shared/curate/util';
import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { CurationState, CurationWarnings } from 'flashpoint-launcher';

const whitelistedBaseFiles = ['logo.png', 'ss.png'];

export type GetCurationFileFunc = (folder: string, relativePath: string) => string;

export type UpdateCurationFileFunc = (folder: string, relativePath: string, data: Buffer) => Promise<void>;

export type RemoveCurationFileFunc = (folder: string, relativePath: string) => Promise<void>;

export const onFileServerRequestPostCuration =
  async (pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse, tempCurationsPath: string, onNewCuration: (filePath: string, onProgress?: (progress: Progress) => void) => Promise<CurationState>) => {
    if (req.method === 'POST') {
      const chunks: any[] = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('end', async () => {
        const data = Buffer.concat(chunks);
        const randomFilePath = path.join(tempCurationsPath, `${uuid()}.7z`);
        await fs.promises.mkdir(path.dirname(randomFilePath), { recursive: true });
        await fs.promises.writeFile(randomFilePath, data);
        await onNewCuration(randomFilePath)
        .then((curation) => {
          res.writeHead(200);
          res.end();
        })
        .catch((error) => {
          log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
          res.writeHead(500);
          res.end();
        })
        .finally(() => {
          fs.promises.unlink(randomFilePath);
        });
      });
    } else {
      res.writeHead(400);
      res.end();
    }
  };

export const onFileServerRequestCurationFileFactory = (getCurationFilePath: GetCurationFileFunc, onUpdateCurationFile: UpdateCurationFileFunc, onRemoveCurationFile: RemoveCurationFileFunc) =>
  async (pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse) => {
    const splitPath = pathname.split('/');
    // Find theme associated with the path (/curation/<folder>/<relativePath>)
    const folder = splitPath.length > 0 ? splitPath[0] : '';
    const relativePath = fixSlashes(splitPath.length > 1 ? splitPath.slice(1).join('/') : '');

    // Make sure we're in the content folder
    if (whitelistedBaseFiles.includes(relativePath) || relativePath.startsWith('content/')) {
      switch (req.method) {
        case 'DELETE': {
          onRemoveCurationFile(folder, relativePath)
          .then(() => {
            res.writeHead(200);
            res.end();
          })
          .catch(() => {
            res.writeHead(500);
            res.end();
          });
          break;
        }
        case 'POST':
        case 'PUT': {
          const chunks: any[] = [];
          req.on('data', (chunk) => {
            chunks.push(chunk);
          });
          req.on('end', async () => {
            const data = Buffer.concat(chunks);
            await onUpdateCurationFile(folder, relativePath, data);
            res.writeHead(200);
            res.end();
          });
          break;
        }
        case 'GET':
        default: {
          const filePath = getCurationFilePath(folder, relativePath);
          try {
            const stat = await fs.promises.stat(filePath);
            if (stat.isDirectory()) {
              // Return file list as json
              const folderIndex = await fs.promises.readdir(filePath, { withFileTypes: true });
              res.write(JSON.stringify({
                type: 'folderIndex',
                files: folderIndex.filter(dirent => dirent.isFile()).map(d => d.name),
                folders: folderIndex.filter(dirent => dirent.isDirectory()).map(d => d.name)
              }));
              res.end();
            } else if (stat.isFile()) {
              serveFile(req, res, filePath);
            }
          } catch (err: any) {
            if (err.code === 'ENOENT') {
              res.writeHead(404);
            } else {
              res.writeHead(500);
              log.error('Launcher', `Error stating curation file of ${folder} - ${relativePath}\n${err}`);
            }
            res.end();
          }
          break;
        }
      }
    } else {
      res.writeHead(403);
      res.end();
    }
  };

export async function genCurationWarnings(curation: LoadedCuration, fpPath: string, suggestions: GamePropSuggestions, strings: LangContainer['curate'], onGenCurationWarnings: ApiEmitter<{ curation: LoadedCuration, warnings: CurationWarnings }>): Promise<CurationWarnings> {
  const warns: CurationWarnings = {
    fieldWarnings: [],
    writtenWarnings: [],
  };
  // Check launch command exists
  const launchCommand = curation.game.launchCommand || '';
  if (launchCommand === '') { warns.writtenWarnings.push('noLaunchCommand'); }
  // Check launch command is valid (if exists)
  if (launchCommand !== '') {
    const launchWarns = invalidLaunchCommandWarnings(getContentFolderByKey(curation.folder, fpPath), launchCommand, strings);
    for (const w of launchWarns) {
      warns.writtenWarnings.push(w);
    }
  }
  if (!curation.thumbnail.exists) { warns.writtenWarnings.push('noLogo'); }
  if (!curation.screenshot.exists) { warns.writtenWarnings.push('noScreenshot'); }
  if (!curation.game.tags || curation.game.tags.length === 0) { warns.writtenWarnings.push('noTags'); }
  if (!curation.game.source) { warns.writtenWarnings.push('noSource'); }
  // Validate release date
  if (curation.game.releaseDate && !isValidDate(curation.game.releaseDate)) { warns.writtenWarnings.push('releaseDateInvalid'); }
  // Check for unused values (with suggestions)
  if (!isValueSuggested(curation, suggestions, 'platform')) { warns.writtenWarnings.push('unusedPlatform'); }
  if (curation.game.applicationPath && !fs.existsSync(path.join(fpPath, curation.game.applicationPath))) { warns.writtenWarnings.push('unusedApplicationPath'); }
  // Check if library is set
  if (suggestions.library.findIndex(l => l === curation.game.library) === -1) { warns.writtenWarnings.push('nonExistingLibrary'); }

  const mutable = {
    curation: { ...curation },
    warnings: warns
  };
  await onGenCurationWarnings.fire(mutable);

  // Clean up fieldWarnings
  const setWarnings: CurationWarnings = {
    writtenWarnings: mutable.warnings.writtenWarnings,
    fieldWarnings: Array.from(new Set(mutable.warnings.fieldWarnings))
  };

  return setWarnings;
}

/**
 * Check of a string is a valid date.
 * Format: "YYYY(-M(M)(-D(D)))"
 * Explanation: "M" and "D" can be one or two digits long.
 *              "M" must be between 1 and 12, and "D" must be between 1 and 31.
 * Examples: "2007", "2010-11", "2019-07-17"
 * Source: https://stackoverflow.com/questions/22061723/regex-date-validation-for-yyyy-mm-dd (but slightly modified)
 * @param str String to check.
 */
function isValidDate(str: string): boolean {
  return (/^\d{4}(-(0?[1-9]|1[012])(-(0?[1-9]|[12][0-9]|3[01]))?)?$/).test(str);
}

function invalidLaunchCommandWarnings(folderPath: string, launchCommand: string, strings: LangContainer['curate']): string[] {
  // Keep list of warns for end
  const warns: string[] = [];
  // Extract first string from launch command via regex
  const match = launchCommand.match(/[^\s"']+|"([^"]*)"|'([^']*)'/);
  if (match) {
    // Match 1 - Inside quotes, Match 0 - No Quotes Found
    let lc = match[1] || match[0];
    // Extract protocol from potential URL
    const protocol = lc.match(/(.+?):\/\//);
    if (protocol) {
      // Protocol found, must be URL
      if (protocol[1] !== 'http') {
        // Not using HTTP
        warns.push(strings.ilc_notHttp);
      }
      const ending = lc.split('/').pop();
      // If the string ends in file, cut off parameters
      if (ending && ending.includes('.')) {
        lc = lc.split('?')[0];
      }
      const filePath = path.join(folderPath, unescape(lc).replace(/(^\w+:|^)\/\//, ''));
      // Push a game to the list if its launch command file is missing
      if (!fs.existsSync(filePath)) {
        warns.push(strings.ilc_nonExistant);
      }
    }
  }
  return warns;
}

/**
 * Check if a the value of a field is in the suggestions for that field.
 * @param curation Curation to check
 * @param suggestions Game Prop Suggestions to check against
 * @param key Key of the field to check.
 */
function isValueSuggested<T extends keyof GamePropSuggestions>(curation: LoadedCuration, suggestions: GamePropSuggestions, key: T & string): boolean {
  // Get the values used
  // (the dumb compiler doesn't understand that this is a string >:((( )
  const value = (curation.game[key] || '') as string;
  const valueSuggestions = suggestions[key];
  // Check if the value is suggested
  return valueSuggestions.indexOf(value) >= 0;
}
