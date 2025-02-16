import * as flashpoint from 'flashpoint-launcher';
import * as path from 'path';
import * as fs from 'fs';
import { downloadFile, getGithubAsset, getPlatformRegex } from './util';
import { AssetFile } from './types';
import { RuffleStandaloneMiddleware } from './middleware/standalone';
import { RuffleWebEmbedMiddleware } from './middleware/embed';

export async function activate(context: flashpoint.ExtensionContext): Promise<void> {
  // const registerSub = (d: flashpoint.Disposable) => { flashpoint.registerDisposable(context.subscriptions, d); };
  const baseDataPath = path.resolve(flashpoint.config.flashpointPath, 'Data', 'Ruffle');
  const ruffleWebLatestDir = path.join(baseDataPath, 'webhosted', 'latest');
  const ruffleStandaloneLatestDir = path.join(baseDataPath, 'standalone', 'latest');

  // Register middleware
  const standaloneMiddleware = new RuffleStandaloneMiddleware(path.join(baseDataPath, 'standalone'));
  flashpoint.middleware.registerMiddleware(standaloneMiddleware);

  const webEmbedMiddleware = new RuffleWebEmbedMiddleware(path.join(baseDataPath, 'webhosted'));
  flashpoint.middleware.registerMiddleware(webEmbedMiddleware);

  const firstLaunch = !flashpoint.getExtConfigValue('com.ruffle.first-launch-complete');
  if (firstLaunch) {
    const firstRunDialog = 
`

<div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={e => {
    const remote = require('@electron/remote');
    remote.shell.openExternal('https://ruffle.rs');
  }}>
  <img 
    src="${flashpoint.getExtensionFileURL('logo.svg')}"
    alt="Ruffle logo" 
    style={{ 
      maxWidth: '200px', 
      maxHeight: '200px', 
      marginBottom: '10px' 
    }} 
  />
</div>

<div style={{ fontSize: '1.5em' }}>
  ### Ruffle is now supported in Flashpoint.

  <br/>
  <p>Ruffle is a modern Flash emulator which can replace Flash Player in some supported games.</p>
  To learn more, click the logo above.
  <br/>

  To enable this, please see **Enabled (Supported Games)** near the bottom of the **Config Page**, or use the Play button dropdown on individual games.
</div>
`;
    flashpoint.onDidConnect(async () => {
      const handle = await flashpoint.dialogs.showMessageBoxWithHandle({
        message: firstRunDialog,
        mdx: true,
        buttons: ['Okay'],
        cancelId: 1
      });
      await flashpoint.dialogs.awaitDialog(handle);
      flashpoint.setExtConfigValue('com.ruffle.first-launch-complete', true);
    });
  }

  const handleGameLaunch = (launchInfo: flashpoint.GameLaunchInfo, curation: boolean) => {
    const supportedEnabled = flashpoint.getExtConfigValue('com.ruffle.enabled');
    const unsupportedEnabled = flashpoint.getExtConfigValue('com.ruffle.enabled-all');

    if (launchInfo.launchInfo.override === 'flash') {
      return;
    }

    if (launchInfo.launchInfo.override === 'ruffle') {
      flashpoint.log.info('Using Standalone Ruffle for overriden game...');
        const defaultConfig = standaloneMiddleware.getDefaultConfig(launchInfo.game);
        defaultConfig.config.graphics = flashpoint.getExtConfigValue('com.ruffle.graphics-mode');
        standaloneMiddleware.execute(launchInfo, {
          middlewareId: '',
          name: '',
          enabled: true,
          version: defaultConfig.version,
          config: defaultConfig.config,
        });
        return;
    }

    if (supportedEnabled || curation) {
      if (launchInfo.game.ruffleSupport.toLowerCase() === 'standalone') {
        flashpoint.log.info('Using Standalone Ruffle for supported game...');
        const defaultConfig = standaloneMiddleware.getDefaultConfig(launchInfo.game);
        standaloneMiddleware.execute(launchInfo, {
          middlewareId: '',
          name: '',
          enabled: true,
          version: defaultConfig.version,
          config: defaultConfig.config,
        });
        return;
      } else if (launchInfo.game.ruffleSupport.toLowerCase() === 'webhosted') {
        flashpoint.log.info('Using Web Embed Ruffle for supported game...');
        const defaultConfig = webEmbedMiddleware.getDefaultConfig(launchInfo.game);
        webEmbedMiddleware.execute(launchInfo, {
          middlewareId: '',
          name: '',
          enabled: true,
          version: defaultConfig.version,
          config: defaultConfig.config,
        });
        return;
      }
    }
    
    if (unsupportedEnabled && !curation) {
      // Get last launch arg to check if swf
      let isFlash = false;
      if (typeof launchInfo.launchInfo.gameArgs === 'string') {
        isFlash = launchInfo.launchInfo.gameArgs.toLowerCase().endsWith('.swf');
      } else if (launchInfo.launchInfo.gameArgs.length > 0) {
        const gameArg = launchInfo.launchInfo.gameArgs.at(-1);
        if (gameArg) {
          isFlash = gameArg.toLowerCase().endsWith('.swf');
        }
      }

      if (isFlash) {
        flashpoint.log.info('Using Standalone Ruffle for unsupported game...');
        const defaultConfig = standaloneMiddleware.getDefaultConfig(launchInfo.game);
        standaloneMiddleware.execute(launchInfo, {
          middlewareId: '',
          name: '',
          enabled: true,
          version: defaultConfig.version,
          config: defaultConfig.config,
        });
      }
    }
  }

  flashpoint.games.onWillLaunchCurationGame((l) => handleGameLaunch(l, true));
  flashpoint.games.onWillLaunchGame((l) => handleGameLaunch(l, false));

  // Check for Standalone updates
  const logVoid = () => {};
  const logDev = (message: string) => {
    flashpoint.log.debug(message);
  };
  logDev('Checking for Ruffle Standalone update...');
  const standaloneAssetFile = await getGithubAsset(getPlatformRegex(), logVoid);
  if (standaloneAssetFile) {
    const standalonePublishedAt = Date.parse(standaloneAssetFile.publishedAt);
    const rawLastStandaloneUpdate = flashpoint.getExtConfigValue('com.ruffle.latest_standalone_version');
    const lastStandaloneUpdate = rawLastStandaloneUpdate ? Date.parse(rawLastStandaloneUpdate) : 0;
    if (standalonePublishedAt > lastStandaloneUpdate) {
      flashpoint.log.info(`Found Ruffle Standalone Update for ${standaloneAssetFile.publishedAt}, downloading...`);
      downloadRuffleStandalone(ruffleStandaloneLatestDir, standaloneAssetFile, logVoid)
      .then(() => flashpoint.log.info('Ruffle Standalone Update Downloaded!'))
      .catch((err) => flashpoint.log.error(`Error updating Ruffle Standalone: ${err}`));
    } else {
      flashpoint.log.info('Ruffle Standalone already up to date.');
    }
  } else {
    flashpoint.log.info('No Ruffle Standalone Assets found?');
  }

  // Check for Web updates
  logDev('Checking for Ruffle Web update...');
  const webAssetFile = await getGithubAsset(/.*selfhosted\.zip/, logVoid);
  if (webAssetFile) {
    const webPublishedAt = Date.parse(webAssetFile.publishedAt);
    const rawLastWebUpdate = flashpoint.getExtConfigValue('com.ruffle.latest_web_version');
    const lastWebUpdate = rawLastWebUpdate ? Date.parse(rawLastWebUpdate) : 0;
    if (webPublishedAt > lastWebUpdate) {
      flashpoint.log.info(`Found Ruffle Web Update for ${webAssetFile.publishedAt}, downloading...`);
      downloadRuffleWeb(ruffleWebLatestDir, webAssetFile, logVoid)
      .then(() => flashpoint.log.info('Ruffle Web Update Downloaded!'))
      .catch((err) => flashpoint.log.error(`Error updating Ruffle Web: ${err}`));
    } else {
      flashpoint.log.info('Ruffle Web already up to date.');
    }
  } else {
    flashpoint.log.info('No Ruffle Web Assets found?');
  }
}

async function downloadRuffleStandalone(ruffleStandaloneDir: string, assetFile: AssetFile, logDev: (text: string) => void) {
  if (fs.existsSync(ruffleStandaloneDir)) {
    fs.rmdirSync(ruffleStandaloneDir, { recursive: true });
  }
  await fs.promises.mkdir(ruffleStandaloneDir, { recursive: true });
  const filePath = path.join(ruffleStandaloneDir, assetFile.name);
  logDev(`Found Asset \n  Name: ${assetFile.name}\n  Url: ${assetFile.url}`);
  await downloadFile(assetFile.url, filePath);
  logDev(`Asset downloaded, unpacking into ${path.relative(flashpoint.config.flashpointPath, ruffleStandaloneDir)}`);
  await flashpoint.unzipFile(filePath, ruffleStandaloneDir, { onData: dataPrintFactory(logDev) });
  await fs.promises.unlink(filePath);
  if (filePath.endsWith('.tar.gz')) {
    // Extract .tar if present
    const tarPath = filePath.substring(0, filePath.length - 3);
    await flashpoint.unzipFile(tarPath, ruffleStandaloneDir, { onData: dataPrintFactory(logDev) });
    await fs.promises.unlink(tarPath);
  }
  flashpoint.setExtConfigValue('com.ruffle.latest_standalone_version', assetFile.publishedAt);
}

async function downloadRuffleWeb(ruffleWebDir: string, assetFile: AssetFile, logDev: (text: string) => void) {
  if (fs.existsSync(ruffleWebDir)) {
    fs.rmdirSync(ruffleWebDir, { recursive: true });
  }
  await fs.promises.mkdir(ruffleWebDir, { recursive: true });
  const filePath = path.join(ruffleWebDir, assetFile.name);
  logDev(`Found Asset \n  Name: ${assetFile.name}\n  Url: ${assetFile.url}`);
  await downloadFile(assetFile.url, filePath);
  logDev(`Asset downloaded, unpacking into ${path.relative(flashpoint.config.flashpointPath, ruffleWebDir)}`);
  await flashpoint.unzipFile(filePath, ruffleWebDir, { onData: dataPrintFactory(logDev) });
  await fs.promises.unlink(filePath);
  if (filePath.endsWith('.tar.gz')) {
    // Extract .tar if present
    const tarPath = filePath.substring(0, filePath.length - 3);
    await flashpoint.unzipFile(tarPath, ruffleWebDir, { onData: dataPrintFactory(logDev) });
    await fs.promises.unlink(tarPath);
  }
  flashpoint.setExtConfigValue('com.ruffle.latest_web_version', assetFile.publishedAt);
}

function dataPrintFactory(logFunc: (val: string) => void) {
  return (data: flashpoint.ZipData) => {
    if (data.status === 'extracted') { logFunc(`  Extracted ${data.file}`); }
  };
}
