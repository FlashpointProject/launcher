import { CURATIONS_FOLDER_TEMP, CURATIONS_FOLDER_WORKING } from '@shared/constants';
import axios from 'axios';
import Fastify, { FastifyInstance, FastifyPluginCallback, FastifyReply } from 'fastify';
import * as mime from 'mime';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadCurationArchive, onRemoveCurationFile, onUpdateCurationFile, state } from '..';
import { uuid } from './uuid';

const fastify = Fastify({
  logger: false,
  caseSensitive: false,
});

export function registerFileServerPlugin(plugin: FastifyPluginCallback) {
  fastify.register(plugin);
}

const fileServerPluginImages: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.post<{ Params: { '*': string }, Body: Buffer<ArrayBuffer> }>('/images/*', async (request, reply) => {
    const pathname = request.params['*'];
    const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    const filePath = path.join(imageFolder, pathname);
    if (filePath.startsWith(imageFolder)) {
      const fileName = path.basename(pathname);
      if (fileName.length >= 39 && fileName.endsWith('.png')) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      }
      const data = request.body;
      await fs.promises.writeFile(filePath, data);
      reply.status(200);
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal image file request: "${filePath}"`);
    }
  });

  fastify.get<{ Params: { '*': string }, Body: Buffer<ArrayBuffer> }>('/images/*', async (request, reply) => {
    const pathname = request.params['*'];
    const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    const filePath = path.join(imageFolder, pathname);
    if (filePath.startsWith(imageFolder)) {
      try {
        await serveFileFastify(filePath, reply);
      } catch (error: any) {
        if (!isENOENT(error)) {
          reply.status(500);
          log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
          return;
        }
        // Failed to send file, download on-demand if missing
        if (state.preferences.onDemandImages) {
          try {
            await fs.promises.access(filePath, fs.constants.F_OK);
          } catch {
            // Does not exist, download
            const success = await downloadOnDemandImage(filePath, pathname);
            if (success) {
              return serveFileFastify(filePath, reply);
            } else {
              return reply.status(500);
            }
          }
        } else {
          reply.status(404);
        }
      }
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal image file request: "${filePath}"`);
    }
  });

  next();
};

const fileServerPluginThemes: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.get<{ Params: { themeId: string, '*': string } }>('/themes/:themeId/*', async (request, reply) => {
    const relativePath = request.params['*'];
    const theme = state.registry.themes.get(request.params.themeId);
    if (theme) {
      const themeFolder = path.resolve(theme.basePath, theme.themePath);
      const filePath = path.resolve(themeFolder, relativePath);
      if (filePath.startsWith(themeFolder)) {
        return serveFileFastify(filePath, reply)
        .catch((error) => {
          if (!isENOENT(error)) {
            reply.status(500);
            log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
            return;
          }
          reply.status(404);
        });
      } else {
        reply.status(403);
        log.warn('Launcher', `Illegal theme file request: "${filePath}"`);
      }
    }
  });

  next();
};

const fileServerPluginExtIcons: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.get<{ Params: { extId: string } }>('/exticons/:extId', async (request, reply) => {
    const ext = await state.extensionsService.getExtension(request.params.extId);
    if (ext && ext.manifest.icon) {
      const filePath = path.join(ext.extensionPath, ext.manifest.icon);
      if (filePath.startsWith(ext.extensionPath)) {
        return serveFileFastify(filePath, reply)
        .catch((error) => {
          if (!isENOENT(error)) {
            reply.status(500);
            log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
            return;
          }
          reply.status(404);
        });
      } else {
        reply.status(403);
        log.warn('Launcher', `Illegal exticons file request: "${filePath}"`);
      }
    }
  });

  next();
};

const fileServerPluginExtData: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.get<{ Params: { extId: string, '*': string } }>('/extdata/:extId/*', async (request, reply) => {
    const pathname = request.params['*'];
    const ext = await state.extensionsService.getExtension(request.params.extId);
    if (ext) {
      // Only serve from <extPath>/static/
      const staticPath = path.join(ext.extensionPath, 'static');
      const filePath = path.join(staticPath, pathname);
      if (filePath.startsWith(staticPath)) {
        return serveFileFastify(filePath, reply)
        .catch((error) => {
          if (!isENOENT(error)) {
            reply.status(500);
            log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
            return;
          }
          reply.status(404);
        });
      } else {
        reply.status(403);
        log.warn('Launcher', `Illegal extdata file request: "${filePath}"`);
      }
    } else {
      reply.status(404);
      log.warn('Launcher', `Bad extdata file request: No such extension ${request.params.extId}`);
    }
  });

  next();
};

const fileServerPluginLogos: FastifyPluginCallback = (fastify, opts, next) => {
  const DEFAULT_LOGO_PATH = 'window/images/Logos/404.png';

  fastify.get<{ Params: { file: string } }>('/logos/:file', async (request, reply) => {
    const { file } = request.params;
    const logoSet = state.registry.logoSets.get(state.preferences.currentLogoSet || '');
    const logoFolder = logoSet && logoSet.files.includes(file)
      ? logoSet.fullPath
      : path.resolve(state.config.flashpointPath, state.preferences.logoFolderPath);
    const filePath = path.join(logoFolder, file);
    if (filePath.startsWith(logoFolder)) {
      try {
        await serveFileFastify(filePath, reply);
      } catch (error: any) {
        if (!isENOENT(error)) {
          reply.status(500);
          log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
          return;
        }
        // Serve default image if available
        const basePath = (!state.isDev && state.isElectron) ? path.resolve(path.dirname(state.exePath), 'resources/app.asar/build') : path.join(process.cwd(), 'build');
        const replacementFilePath = path.resolve(basePath, 'window/images/Logos', file);
        if (replacementFilePath.startsWith(basePath)) {
          return serveFileFastify(replacementFilePath, reply)
          .catch((error) => {
            if (!isENOENT(error)) {
              reply.status(500);
              log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
              return;
            }
            reply.status(404);
          });
        } else {
          return serveFileFastify(DEFAULT_LOGO_PATH, reply)
          .catch((error) => {
            if (!isENOENT(error)) {
              reply.status(500);
              log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
              return;
            }
            reply.status(404);
          });
        }
      }
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal logo file request: ${filePath}`);
    }
  });

  next();
};

const fileServerPluginCredits: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.get('/credits.json', async (request, reply) => {
    const filePath = path.join(state.config.flashpointPath, state.preferences.jsonFolderPath, 'credits.json');
    return serveFileFastify(filePath, reply)
    .catch((error) => {
      if (!isENOENT(error)) {
        reply.status(500);
        log.error('Launcher', `Failed to read image: ${filePath} - ${error}`);
        return;
      }
      reply.status(404);
    });
  });

  next();
};

const fileServerPluginCurate: FastifyPluginCallback = (fastify, opts, next) => {
  const whitelistedBaseFiles = ['logo.png', 'ss.png'];

  fastify.post<{ Body: Buffer<ArrayBuffer> }>('/curation', async (request, reply) => {
    const data = request.body;
    const tempCurationsPath = path.join(state.config.flashpointPath, CURATIONS_FOLDER_TEMP);
    const randomFilePath = path.join(tempCurationsPath, `${uuid()}.7z`);
    await fs.promises.mkdir(path.dirname(randomFilePath), { recursive: true });
    await fs.promises.writeFile(randomFilePath, data);
    await loadCurationArchive(randomFilePath)
    .catch((error) => {
      reply.status(500);
      log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
    })
    .finally(() => {
      fs.promises.unlink(randomFilePath);
    });
  });

  fastify.get<{ Params: { folder: string, '*': string } }>('/curations/:folder/*', async (request, reply) => {
    const folder = request.params.folder;
    const pathname = request.params['*'];
    const curation = state.loadedCurations.find(c => c.folder === folder);
    const basePath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
    const filePath = path.join(basePath, pathname);
    if (curation && filePath.startsWith(basePath) && (whitelistedBaseFiles.includes(pathname.toLowerCase()) || pathname.startsWith('content/'))) {
      return serveFileFastify(filePath, reply)
      .catch((error) => {
        if (!isENOENT(error)) {
          reply.status(500);
          log.error('Launcher', `Failed to read curation file: ${filePath} - ${error}`);
          return;
        }
        reply.status(404);
      });
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal curation file request: "${folder}/${pathname}"`);
    }
  });

  fastify.post<{ Params: { folder: string, '*': string }, Body: Buffer<ArrayBuffer> }>('/curations/:folder/*', async (request, reply) => {
    const folder = request.params.folder;
    const pathname = request.params['*'];
    const basePath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
    const filePath = path.join(basePath, pathname);
    const curation = state.loadedCurations.find(c => c.folder === folder);
    if (curation && filePath.startsWith(basePath) && (whitelistedBaseFiles.includes(pathname) || pathname.startsWith('content/'))) {
      return onUpdateCurationFile(folder, pathname, request.body)
      .catch((error) => {
        reply.status(500);
        log.error('Launcher', `Failed to save curation file: ${folder}/${pathname} - ${error}`);
      });
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal curation file request: "${folder}/${pathname}"`);
    }
  });

  fastify.delete<{ Params: { folder: string, '*': string } }>('/curations/:folder/*', async (request, reply) => {
    const folder = request.params.folder;
    const pathname = request.params['*'];
    const basePath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
    const filePath = path.join(basePath, pathname);
    const curation = state.loadedCurations.find(c => c.folder === folder);
    if (curation && filePath.startsWith(basePath) && (whitelistedBaseFiles.includes(pathname) || pathname.startsWith('content/'))) {
      await onRemoveCurationFile(folder, pathname)
      .catch(() => {
        reply.status(500);
      });
    } else {
      reply.status(403);
      log.warn('Launcher', `Illegal curation file request: "${folder}/${pathname}"`);
    }
  });

  next();
};

export async function startFileServer(): Promise<FastifyInstance> {
  if (fastify.addresses().length === 0) {
    fastify.register(fileServerPluginLogos);
    fastify.register(fileServerPluginThemes);
    fastify.register(fileServerPluginImages);
    fastify.register(fileServerPluginExtIcons);
    fastify.register(fileServerPluginExtData);
    fastify.register(fileServerPluginCredits);
    fastify.register(fileServerPluginCurate);
    // TODO: Ruffle

    fastify.addContentTypeParser('*', (req, payload, done) => {
      const chunks: Buffer[] = [];
      payload.on('data', chunk => {
        chunks.push(chunk);
      });
      payload.on('end', () => {
        done(null, Buffer.concat(chunks));
      });
    });

    await fastify.listen();
  }
  return fastify;
}

async function serveFileFastify(filePath: string, reply: FastifyReply) {
  await fs.promises.access(filePath, fs.constants.F_OK);
  reply.type(mime.getType(path.extname(filePath)) || '');
  const stream = fs.createReadStream(filePath);
  return reply.send(stream);
}

export type OnDemandImageItem = {
  filePath: string;
  url: string;
  finish: (success: boolean) => void
};

export interface ISimpleDownloader {
  workerLimit: number;
  queueItem: (item: OnDemandImageItem) => void;
  stop: () => void;
}

async function downloadOnDemandImage(filePath: string, subPath: string) {
  let baseUrl = state.preferences.onDemandBaseUrl;
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  let url = baseUrl + subPath;
  if (state.preferences.onDemandImagesCompressed) {
    url += '?type=jpg';
  }
  return new Promise<boolean>((resolve) => {
    state.onDemandImageDownloader.queueItem({
      filePath,
      url,
      finish: resolve,
    });
  });
}

export class SimpleDownloader implements ISimpleDownloader {
  workerLimit: number = 6;
  private queue: OnDemandImageItem[] = [];
  private activeWorkers: number = 0;
  private abortController: AbortController = new AbortController();
  private stopped: boolean = false;

  constructor(workerLimit?: number) {
    if (workerLimit) {
      this.workerLimit = workerLimit;
    }
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.activeWorkers < this.workerLimit && !this.stopped) {
      const item = this.queue.shift();
      if (!item) {
        continue;
      }

      this.activeWorkers++;
      this.downloadItem(item)
      .finally(() => {
        this.activeWorkers--;
        this.processQueue(); // Process next item
      });
    }
  }

  private async downloadItem(item: OnDemandImageItem) {
    try {
      const res = await axios.get(item.url, {
        responseType: 'arraybuffer',
        signal: this.abortController.signal,
      });

      await fs.promises.mkdir(path.dirname(item.filePath), { recursive: true });
      await fs.promises.writeFile(item.filePath, res.data, 'binary');

      item.finish(true);
    } catch (error) {
      if (!axios.isCancel(error)) {
        log.error('Launcher', `On Demand Download Error: ${item.filePath} - ${item.url} - ${error}`);
      }

      item.finish(false);
    }
  }

  queueItem(item: OnDemandImageItem) {
    if (this.stopped) {
      return;
    }
    this.queue.push(item);
    this.processQueue();
  }

  stop() {
    if (!this.stopped) {
      this.stopped = true;
      this.abortController.abort();
      // Cancel all pending requests
      for (const item of this.queue) {
        item.finish(false);
      }
      this.queue = [];
      this.activeWorkers = 0;
    }
  }
}

function isENOENT(error: any): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
