/* eslint-disable @typescript-eslint/no-unused-vars */
import * as flashpoint from 'flashpoint-launcher';
import { ConfigSchema, Game, GameLaunchInfo, GameMiddlewareConfig, GameMiddlewareDefaultConfig, IGameMiddleware } from 'flashpoint-launcher';
import * as os from 'os';
import * as path from 'path';

// Config Schema used to configure the middleware per game
const schema: ConfigSchema = [
  {
    type: 'label',
    key: 'none',
    title: 'Graphical Options'
  },
  // --fullscreen
  {
    type: 'boolean',
    title: 'Full Screen',
    key: 'fullscreen',
    optional: true,
    default: false
  },
  // --quality
  {
    type: 'string',
    title: 'Quality',
    key: 'quality',
    options: ['low', 'medium', 'high', 'best', 'high8x8', 'high8x8-linear', 'high16x16', 'high16x16-linear'],
    default: 'high',
  },
  // --graphics
  {
    type: 'string',
    title: 'Graphics Mode',
    key: 'graphics',
    options: ['default', 'vulkan', 'metal', 'dx12', 'gl'],
    default: 'default',
  },
  {
    type: 'label',
    key: 'none',
    title: 'Other Options'
  },
  // --frame-rate
  {
    type: 'number',
    title: 'Player Version',
    key: 'playerVersion',
    description: 'The version of the player to emulate',
    default: 32,
    minimum: 1,
    maximum: 32,
    integer: true
  },
  // -P
  {
    type: 'string',
    title: 'Flash Vars',
    key: 'flashVars',
    description: 'Format as pairs e.g `foo=bar speed=fast mode="Full Screen"',
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
  flashVars: string; // -P
  quality: 'low' | 'medium' | 'high' | 'high8x8' | 'high8x8-linear' | 'high16x16' | 'high16x16-linear';
  graphics: 'default' | 'vulkan' | 'metal' | 'dx12' | 'gl'; // --graphics
  noGui: boolean; // --no-gui
  playerVersion: number; // --player-version
  fullscreen: boolean; // --fullscreen
};

const DEFAULT_CONFIG: Partial<RuffleConfig> = {};

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
    if (version === 'latest') {
      return true;
    }
    return false;
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

  execute(gameLaunchInfo: GameLaunchInfo, middlewareConfig: GameMiddlewareConfig): GameLaunchInfo {
    // Cast our config values to the correct type
    const config = {
      ...DEFAULT_CONFIG,
      ...(middlewareConfig.config as Partial<RuffleConfig>)
    };

    // Replace application path with ruffle standalone executable (<base>/<version>/<executable>)
    const executable = os.platform() === 'win32' ? 'ruffle.exe' : 'ruffle';
    const execPath = path.join(this.ruffleStandaloneRoot, middlewareConfig.version, executable);

    // Add any configured ruffle params to the launch args
    const launchArgs = coerceToStringArray(gameLaunchInfo.launchInfo.gameArgs);
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
    // --no-gui
    if (config.noGui) { launchArgs.unshift('--no-gui'); }
    // --fullscreen
    if (config.fullscreen) { launchArgs.unshift('--fullscreen'); }
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
    }

    // Add proxy
    const prefs = flashpoint.getPreferences();
    launchArgs.unshift(prefs.browserModeProxy);
    launchArgs.unshift('--proxy');

    // Overwrite launch values
    gameLaunchInfo.launchInfo.gamePath = execPath;
    gameLaunchInfo.launchInfo.gameArgs = launchArgs;

    return gameLaunchInfo;
  }

  getDefaultConfig(game: Game): GameMiddlewareDefaultConfig {
    return {
      version: 'latest',
      config: this.getConfigSchema('latest', game),
    };
  }

  getConfigSchema(version: string, game: Game): ConfigSchema {
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
