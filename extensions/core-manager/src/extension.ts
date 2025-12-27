import axios from 'axios';
import { commands, config, Disposable, ExtensionContext, installExtension, log, registerDisposable, uninstallExtension, unzipFile } from 'flashpoint-launcher';
import fs from 'node:fs';
import os, { tmpdir } from 'node:os';
import path from 'node:path';
import { DownloadExtCommand, ReadInstalledComponents, UninstallExtCommand, UpdateComponentCommand } from './commands';

export async function activate(context: ExtensionContext): Promise<void> {
  const register = (disp: Disposable) => {
    registerDisposable(context.subscriptions, disp);
  };

  register(
    commands.registerCommand(UpdateComponentCommand, async (component: ManagerComponent) => {
      if (!component.remote) {
        throw 'No remote available to update from';
      }
      const tempDir = path.join(tmpdir(), 'comp-install');
      await fs.promises.mkdir(tempDir, { recursive: true });
      const componentsPath = path.join(config.flashpointPath, 'Components');
      await fs.promises.mkdir(componentsPath, { recursive: true });
      const tempFile = path.join(tempDir, 'download.zip');
      const file = fs.createWriteStream(tempFile);
      const destDir = path.join(config.flashpointPath, component.remote.path);

      // Download new package
      const res = await axios.get(component.remote.downloadUrl, { responseType: 'stream' });
      if (res.status != 200) {
        throw new Error(`Status: ${res.status}`);
      }
      res.data.pipe(file);
      await new Promise<void>((resolve, reject) => {
        file.on('close', resolve);
        file.on('error', reject);
      });

      // Extract package
      const extractDir = path.join(tempDir, 'extract');
      await unzipFile(tempFile, extractDir);

      // Remove old files
      if (component.installed) {
        for (const file of component.installed.files) {
          const filePath = path.join(config.flashpointPath, file);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
      }

      // Copy extracted files to destination directory
      const installedFiles: string[] = [];
      let totalSize = 0;

      async function copyRecursive(src: string, dest: string) {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            await copyRecursive(srcPath, destPath);
          } else {
            await fs.promises.copyFile(srcPath, destPath);
            const stats = await fs.promises.stat(destPath);
            totalSize += stats.size;
            // Track relative path from destDir
            const relativePath = path.relative(config.flashpointPath, destPath);
            installedFiles.push(relativePath);
          }
        }
      }

      await copyRecursive(extractDir, destDir);

      component.installed = {
        id: component.remote.id,
        fileCount: installedFiles.length,
        files: installedFiles,
        size: totalSize,
        hash: component.remote.hash,
      };

      // Save component info
      const compInfoFilePath = path.join(componentsPath, component.remote.id);
      const fileWriter = fs.createWriteStream(compInfoFilePath);
      fileWriter.write(`${component.remote.hash} ${component.installed.size}\n`);
      for (const file of component.installed.files) {
        fileWriter.write(file + '\n');
      }
      fileWriter.close();
      alert('Done!');
    })
  );

  register(
    commands.registerCommand(ReadInstalledComponents, async () => {
      const componentsPath = path.join(config.flashpointPath, 'Components');
      await fs.promises.mkdir(componentsPath, { recursive: true });
      const files = await fs.promises.readdir(componentsPath);
      const components: ManagerInstalledComponentInfo[] = [];
      for (const file of files) {
        try {
          const filePath = path.join(componentsPath, file);
          const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
          const lines = content.split('\n');
          const [hash, size] = lines[0].split(' ');
          if (hash.length !== 8) {
            throw 'Hash length invalid';
          }
          components.push({
            id: file,
            size: parseInt(size),
            hash,
            fileCount: lines.length - 1,
            files: lines,
          });
        } catch (err) {
          log.error('Failed to read component: ' + file);
        }
      }
      return components;
    })
  );

  register(
    commands.registerCommand(DownloadExtCommand, async (extId: string, url: string) => {
      // Uninstall extension if it exists
      await uninstallExtension(extId);

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

  register(
    commands.registerCommand(UninstallExtCommand, async (extId: string) => {
      log.info('Uninstalling Extension ' + extId);

      await uninstallExtension(extId);
    })
  );
}
