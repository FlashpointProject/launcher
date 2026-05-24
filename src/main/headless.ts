import { app, Menu, shell, Tray } from 'electron';
import express from 'express';
import path from 'node:path';

export async function createHeadlessServer(hostname: string, port: number, url: string) {
  const expressApp = express();
  console.log(__dirname);

  // Static files
  expressApp.use(express.static(path.join(__dirname, '../window')));

  // React renderer
  expressApp.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../window/renderer.html'));
  });

  // Start the HTTP server
  const server = expressApp.listen(port, hostname, () => {
    console.log(`Headless server listening on ${hostname}:${port}`);
    console.log(`Starting in headless mode. Opening your browser to: ${url}`);
    shell.openExternal(url);
  });

  await app.whenReady();

  const icon = process.platform === 'win32' ? '../window/images/icon.ico' : '../window/images/icon.png';
  const tray = new Tray(path.join(__dirname, icon));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(url);
      }
    },
    {
      label: 'Exit',
      click: () => {
        server.close(() => {
          app.quit();
        });
        // Give server 3 seconds to close
        setTimeout(() => app.quit(), 3000);
      }
    }
  ]);
  tray.setToolTip('Flashpoint Launcher');
  tray.setContextMenu(contextMenu);
}
