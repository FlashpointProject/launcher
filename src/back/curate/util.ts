import { serveFile } from '@back/util/FileServer';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { fixSlashes } from '@shared/Util';
import { uuid } from '@back/util/uuid';
import { CurationState } from 'flashpoint-launcher';

const whitelistedBaseFiles = ['logo.png', 'ss.png'];

export type GetCurationFileFunc = (folder: string, relativePath: string) => string;

export type UpdateCurationFileFunc = (folder: string, relativePath: string, data: Buffer) => Promise<void>;

export type RemoveCurationFileFunc = (folder: string, relativePath: string) => Promise<void>;

export const onFileServerRequestPostCuration =
  async (pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse, tempCurationsPath: string, onNewCuration: (filePath: string) => Promise<CurationState>) => {
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
