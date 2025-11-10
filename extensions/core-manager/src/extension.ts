import axios from 'axios';
import { commands, Disposable, ExtensionContext, installExtension, log, registerDisposable } from 'flashpoint-launcher';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DownloadExtCommand } from './commands';

export async function activate(context: ExtensionContext): Promise<void> {
  const register = (disp: Disposable) => {
    registerDisposable(context.subscriptions, disp);
  };

  register(
    commands.registerCommand(DownloadExtCommand, async (url: string) => {
      const tempPath = os.tmpdir();
      const tempFilepath = path.join(tempPath, `extension-${Date.now()}.zip`);
      const writer = fs.createWriteStream(tempFilepath);

      const res = await axios.get(url, {
        responseType: 'stream'
      });

      res.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      log.info('Downloaded Extension Archive from ' + url);

      await installExtension(tempFilepath);
    })
  );
}
