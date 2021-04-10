import * as http from 'http';

type HandlerFunc = (relativePathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse) => any;

export class FileServer {
  server: http.Server;
  private handlers: Map<string, HandlerFunc>;

  constructor() {
    this.handlers = new Map();
    this.server = new http.Server(this.onHandleRequest);
  }

  public registerRequestHandler = (region: string, callback: HandlerFunc) => {
    if (this.handlers.has(region)) {
      log.error('Launcher', `FileServer region "${region}" trying to be re-registered, ignoring second registration...`);
      return;
    }

    this.handlers.set(region.toLowerCase(), callback);
  }

  public close = () => {
    this.server.close();
    this.handlers.clear();
  }

  private onHandleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(`http://example${req.url || ''}`);

    const parts = url.pathname.split('/');
    const region = parts.length > 1 ? parts[1].toLowerCase() : '';
    const pathname = decodeURIComponent(parts.length > 2 ? parts.slice(2).join('/') : '');

    // Pass to handler
    const handler = this.handlers.get(region);
    if (handler) {
      return handler(pathname, url, req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  }
}
