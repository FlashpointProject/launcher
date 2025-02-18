/* eslint-disable @typescript-eslint/no-unused-vars */
import * as flashpoint from 'flashpoint-launcher';
import { ConfigSchema, Game, GameLaunchInfo, GameMiddlewareConfig, GameMiddlewareDefaultConfig, IGameMiddleware } from 'flashpoint-launcher';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { downloadFile, getGithubReleaseAsset, getPlatformRegex } from '../util';

// Config Schema used to configure the middleware per game
const schema: ConfigSchema = [
  {
    type: 'label',
    key: 'label-player-options',
    title: 'Player Options'
  },
  // --fullscreen
  {
    type: 'boolean',
    key: 'fullscreen',
    title: 'Full Screen',
    description: 'Start application in fullscreen',
    optional: true,
    default: false
  },
  // --quality
  {
    type: 'string',
    key: 'quality',
    title: 'Quality',
    description: 'Default quality of the movie',
    options: ['low', 'medium', 'high', 'best', 'high8x8', 'high8x8-linear', 'high16x16', 'high16x16-linear'],
    default: 'high',
  },
  // --graphics
  {
    type: 'string',
    key: 'graphics',
    title: 'Graphics Mode',
    description: 'Type of graphics backend to use. Not all options may be supported by your current system. Default will attempt to pick the most supported graphics backend',
    options: ['default', 'vulkan', 'metal', 'dx12', 'gl'],
    default: 'default',
  },
  // --letterbox
  {
    type: 'string',
    key: 'letterbox',
    title: 'Letterbox',
    description: 'Specify how Ruffle should handle areas outside the movie stage',
    options: ['off', 'fullscreen', 'on'],
    default: 'on',
  },
  // --dummy-external-interface
  {
    type: 'boolean',
    key: 'dummyExternalInterface',
    title: 'Dummy External Interface',
    description: 'Provide a dummy (completely empty) External Interface to the movie. This may break some movies that expect an External Interface to be functional, but may fix others that always require an External Interface',
    optional: true,
    default: false
  },
  // --player-version
  {
    type: 'number',
    key: 'playerVersion',
    title: 'Player Version',
    description: 'The version of the player to emulate',
    default: 32,
    minimum: 1,
    maximum: 32,
    integer: true
  },
  {
    type: 'label',
    key: 'label-network-options',
    title: 'Network Options',
  },
  // --spoof-url
  {
    type: 'string',
    key: 'spoofUrl',
    title: 'Spoof SWF URL',
    description: 'Spoofs the root SWF URL provided to ActionScript',
  },
  // Use Flashpoint Proxy
  {
    type: 'boolean',
    key: 'fpProxyEnabled',
    title: 'Use Flashpoint Proxy',
    description: 'Overrides Custom Proxy. Disable to use the live web or a custom proxy',
    default: true,
  },
  // --proxy
  {
    type: 'string',
    key: 'proxy',
    title: 'Custom Proxy',
    description: 'Overriden by Use Flashpoint Proxy. Proxy to use when loading movies via URL',
  },
  // --upgrade-to-https
  {
    type: 'boolean',
    key: 'upgradeToHttps',
    title: 'Upgrade HTTP to HTTPS',
    description: 'Replace all embedded HTTP URLs with HTTPS',
    default: false
  },
  {
    type: 'label',
    key: 'label-other-options',
    title: 'Other Options'
  },
  // -P
  {
    type: 'string',
    key: 'flash-vars',
    title: 'Flash Vars',
    description: 'A "flashvars" parameter to provide to the movie. Format as pairs e.g `foo=bar speed=fast mode="Full Screen"',
    optional: true
  },
  // --no-gui
  {
    type: 'boolean',
    title: 'Hide GUI',
    key: 'noGui',
    optional: true,
    default: false
  },
];

// Stored config value map
type RuffleConfig = {
  /** Player Options */
  fullscreen: boolean; // --fullscreen
  quality: 'low' | 'medium' | 'high' | 'high8x8' | 'high8x8-linear' | 'high16x16' | 'high16x16-linear';
  graphics: 'default' | 'vulkan' | 'metal' | 'dx12' | 'gl'; // --graphics
  letterbox: 'off' | 'fullscreen' | 'on'; // --letterbox
  dummyExternalInterface: boolean; // --dummy-external-interface
  playerVersion: number; // --player-version
  /** Network Options */
  spoofUrl: string; // --spoof-url
  fpProxyEnabled: boolean;
  proxy: string; // --proxy
  upgradeToHttps: boolean; // --upgrade-to-https
  /** Other Options */
  flashVars: string; // -P
  noGui: boolean; // --no-gui
};

const DEFAULT_CONFIG: Partial<RuffleConfig> = {
  fpProxyEnabled: true
};

type FlashVar = {
  key: string;
  value: string;
}

export class RuffleStandaloneMiddleware implements IGameMiddleware {
  id = 'com.ruffle.middleware-standalone';
  name = 'Ruffle Standalone';

  constructor(
    private ruffleStandaloneRoot: string
  ) {}

  isValidVersion(version: string): boolean {
    // UNIMPLEMENTED
    return true;
  }

  async isValid(game: Game): Promise<boolean> {
    if (game.activeDataId && game.activeDataId >= 0) {
      const gameData = await flashpoint.gameData.findOne(game.activeDataId);
      if (gameData?.launchCommand.endsWith('.swf')) {
        return true;
      }
    }
    return false;
  }

  async execute(gameLaunchInfo: GameLaunchInfo, middlewareConfig: GameMiddlewareConfig): Promise<GameLaunchInfo> {
    // We always use a native executable
    gameLaunchInfo.launchInfo.useWine = false;

    // Cast our config values to the correct type
    const config = {
      ...DEFAULT_CONFIG,
      ...(middlewareConfig.config as Partial<RuffleConfig>)
    };

    // Replace application path with ruffle standalone executable (<base>/<version>/<executable>)
    const executable = os.platform() === 'win32' ? 'ruffle.exe' : 'ruffle';
    const execPath = path.join(this.ruffleStandaloneRoot, middlewareConfig.version, executable);

    // If exec path is missing, we need to download the correct version
    if (!fs.existsSync(execPath)) {
      // Download specific ruffle version
      try {
        const asset = await getGithubReleaseAsset(getPlatformRegex(), middlewareConfig.version);
        if (asset === null) {
          throw `Ruffle release tag  "${middlewareConfig.version}" not found.`;
        }
        const baseDataPath = path.join(flashpoint.config.flashpointPath, 'Data', 'Ruffle');
        const ruffleStandaloneDir = path.join(baseDataPath, 'standalone', middlewareConfig.version);
        if (fs.existsSync(ruffleStandaloneDir)) {
          fs.rmdirSync(ruffleStandaloneDir, { recursive: true });
        }
        await fs.promises.mkdir(ruffleStandaloneDir, { recursive: true });
        const filePath = path.join(ruffleStandaloneDir, asset.name);
        await downloadFile(asset.url, filePath);
        await flashpoint.unzipFile(filePath, ruffleStandaloneDir);
        await fs.promises.unlink(filePath);
        if (filePath.endsWith('.tar.gz')) {
          // Extract .tar if present
          const tarPath = filePath.substring(0, filePath.length - 3);
          await flashpoint.unzipFile(tarPath, ruffleStandaloneDir);
          await fs.promises.unlink(tarPath);
        }
      } catch (e: any) {
        throw `Error downloading Ruffle version "${middlewareConfig.version}": ${e}`;
      }
    }
    // Make standalone ruffle executable if not Windows
    if (executable === 'ruffle') { fs.promises.chmod(execPath, 0o775); }

    // Add any configured ruffle params to the launch args
    const launchArgs = coerceToStringArray(gameLaunchInfo.launchInfo.gameArgs);

    /** Player options */
    // --fullscreen
    if (config.fullscreen) { launchArgs.unshift('--fullscreen'); }
    // --quality
    if (config.quality) {
      launchArgs.unshift(config.quality);
      launchArgs.unshift('--quality');
    }
    // --graphics
    if (config.graphics) {
      launchArgs.unshift(config.graphics);
      launchArgs.unshift('--graphics');
    }
    // --letterbox
    if (config.letterbox) {
      launchArgs.unshift(config.letterbox);
      launchArgs.unshift('--letterbox');
    }
    // --dummy-external-interface
    if (config.dummyExternalInterface) {
      launchArgs.unshift('--dummy-external-interface');
    }
    // --player-version
    if (config.playerVersion) {
      let version = Math.floor(config.playerVersion);
      if (version > 32) {
        version = 32;
      }
      if (version < 1) {
        version = 1;
      }
      launchArgs.unshift(config.playerVersion + '');
      launchArgs.unshift('--player-version');
    }

    /** Network Options */
    // --spoof-url
    if (config.spoofUrl) {
      launchArgs.unshift(config.spoofUrl);
      launchArgs.unshift('--spoof-url');
    }
    // --proxy
    if (config.fpProxyEnabled) {
      const prefs = flashpoint.getPreferences();
      launchArgs.unshift(prefs.browserModeProxy);
      launchArgs.unshift('--proxy');
    } else if (config.proxy) {
      launchArgs.unshift(config.proxy);
      launchArgs.unshift('--proxy');
    }
    // --upgrade-to-https
    if (config.upgradeToHttps) {
      launchArgs.unshift('--upgrade-to-https');
    }

    /** Other Options */
    // -P (flashvars) (Stored as pairs e.g `foo=bar speed=fast mode="Full Screen"`)
    if (config.flashVars) {
      const keyValuePairs: FlashVar[] = [];
      const regex = /(\w+)=("[^"]+"|\S+)/g;
      let match;
      // Map config.flashVars to key value pairs
      while ((match = regex.exec(config.flashVars))) {
        const [_, key, value] = match;
        keyValuePairs.push({
          key,
          value,
        });
      }
      // Add all pairs to args
      for (const pair of keyValuePairs) {
        launchArgs.unshift(`-P${pair.key}=${pair.value}`);
      }
      // --no-gui
      if (config.noGui) { launchArgs.unshift('--no-gui'); }
    }

    // Overwrite launch values
    gameLaunchInfo.launchInfo.gamePath = execPath;
    gameLaunchInfo.launchInfo.gameArgs = launchArgs;

    return gameLaunchInfo;
  }

  getDefaultConfig(game: Game): GameMiddlewareDefaultConfig {
    return {
      version: 'latest',
      config: this.getConfigSchema('latest'),
    };
  }

  getConfigSchema(version: string): ConfigSchema {
    // Only 1 kind of schema for now
    return schema;
  }

  upgradeConfig(version: string, config: any) {
    // UNIMPLEMENTED
    return config;
  }
}

function coerceToStringArray(arr: string[] | string): string[] {
  if (Array.isArray(arr)) {
    return arr;
  } else {
    return [arr];
  }
}
