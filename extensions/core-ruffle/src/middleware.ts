/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigSchema, Game, GameConfig, GameLaunchInfo, GameMiddlewareConfig, IGameMiddleware } from 'flashpoint-launcher';
import * as path from 'path';
import * as flashpoint from 'flashpoint-launcher';
import * as os from 'os';

// Config Schema used to configure the middleware per game
const schema: ConfigSchema = [
  // --graphics
  {
    type: 'string',
    title: 'Graphics Mode',
    key: 'graphics',
    options: ['default', 'vulkan', 'metal', 'dx12', 'gl'],
    default: 'default',
  },
  // -P
  {
    type: 'string',
    title: 'Flash Vars',
    key: 'flashVars',
    description: 'Format as pairs e.g `foo=bar speed=fast mode="Full Screen"',
    optional: true,
    validate: (input: string) => {
      // Must be a set of key value pairs
      const regex = /^(\w+="[^"]+"\s*)+$/;
      return regex.test(input);
    }
  },
  // --no-gui
  {
    type: 'boolean',
    title: 'Hide GUI',
    key: 'noGui',
    optional: true,
    default: false
  }
];

// Stored config value map
type RuffleConfig = {
  flashVars?: string; // -P
  graphics: 'default' | 'vulkan' | 'metal' | 'dx12' | 'gl'; // --graphics
  noGui?: boolean; // --no-gui
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
    const config = middlewareConfig.config as RuffleConfig;

    // Replace application path with ruffle standalone executable (<base>/<version>/<executable>)
    const executable = os.platform() === 'win32' ? 'ruffle.exe' : 'ruffle';
    const execPath = path.join(this.ruffleStandaloneRoot, middlewareConfig.version, executable);

    // Add any configured ruffle params to the launch args
    const launchArgs = coerceToStringArray(gameLaunchInfo.launchInfo.gameArgs);
    // --graphics
    launchArgs.unshift(config.graphics);
    launchArgs.unshift('--graphics');
    // --no-gui
    if (config.noGui) { launchArgs.unshift('--no-gui'); }
    // -P (flashvars) (Stored as pairs e.g `foo=bar speed=fast mode="Full Screen"`)
    if (config.flashVars) {
      const keyValuePairs: FlashVar[] = [];
      const regex = /(\w+)=("[^"]+"|\S+)/g;
      let match;
      // Map config.flashVars to key value pairs
      while ((match = regex.exec(config.flashVars))) {
        const [_, key, value] = match;
        // Remove quotes from the value if it's wrapped in quotes
        const cleanedValue = value.replace(/^"(.*)"$/, '$1');
        keyValuePairs.push({
          key,
          value: cleanedValue
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

  getConfigSchema(version: string, game: Game, config: GameConfig): ConfigSchema {
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
