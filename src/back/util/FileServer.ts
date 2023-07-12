import * as http from 'http';
import * as fs from 'fs';
import * as mime from 'mime';
import * as path from 'path';
import { Socket } from 'net';

type HandlerFunc = (relativePathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse) => any;

export class FileServer {
  server: http.Server;
  private handlers: Map<string, HandlerFunc>;
  private sockets = new Set<Socket>();

  constructor() {
    this.handlers = new Map();
    this.server = new http.Server(this.onHandleRequest);
    // Track all sockets so we can kill them later
    this.server.on('connection', socket => {
      this.sockets.add(socket);
      socket.once('close', () => this.sockets.delete(socket)); // Stop tracking closed sockets
    });
  }

  public registerRequestHandler = (region: string, callback: HandlerFunc) => {
    if (this.handlers.has(region)) {
      log.error('Launcher', `FileServer region "${region}" trying to be re-registered, ignoring second registration...`);
      return;
    }

    this.handlers.set(region.toLowerCase(), callback);
  };

  public close = (onError?: (err?: Error) => void) => {
    for (const socket of this.sockets) { socket.destroy();}
    this.server.close(onError);
    this.handlers.clear();
  };

  private onHandleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(`http://example${req.url || ''}`);

    const parts = url.pathname.split('/');
    const region = parts.length > 1 ? parts[1].toLowerCase() : '';
    const pathname = decodeURIComponent(parts.length > 2 ? parts.slice(2).join('/') : '');

    // Immediately slap on error handlers, see if we can find any disconnected errors
    req.on('error', (err) => {
      log.error('Launcher', `Generic fileserver request error: ${err}`);
    });
    res.on('error', (err) => {
      log.error('Launcher', `Generic fileserver response error: ${err}`);
    });

    // Pass to handler
    const handler = this.handlers.get(region);
    if (handler) {
      Promise.resolve(handler(pathname, url, req, res))
      .catch((err) => {
        console.log(`FS Handler Error: ${err}`);
        res.writeHead(404);
        res.end();
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  };
}

export function serveFile(req: http.IncomingMessage, res: http.ServerResponse, filePath: string): void {
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.on('error', (err) => {
      log.error('Launcher', `Error serving file - ${err}`);
      res.writeHead(500);
      res.end();
    });
    fs.stat(filePath, (error, stats) => {
      if (error || stats && !stats.isFile()) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': mime.getType(path.extname(filePath)) || '',
          'Content-Length': stats.size,
        });
        if (req.method === 'GET') {
          const stream = fs.createReadStream(filePath);
          stream.on('error', error => {
            console.warn(`File server failed to stream file. ${error}`);
            stream.destroy(); // Calling "destroy" inside the "error" event seems like it could case an endless loop (although it hasn't thus far)
            if (!res.writableEnded) { res.end(); }
          });
          stream.pipe(res);
        } else {
          res.end();
        }
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}
