/* eslint-disable @typescript-eslint/no-unused-vars */
import * as flashpoint from 'flashpoint-launcher';
import { ConfigSchema, Game, GameLaunchInfo, GameMiddlewareConfig, GameMiddlewareDefaultConfig, IGameMiddleware } from 'flashpoint-launcher';
import { Readable } from 'stream';
import { buildBasicTemplate } from '../template/basic';
import * as path from 'path';

// Config Schema used to configure the middleware per game
const schema: ConfigSchema = [
  {
    type: 'string',
    key: 'template',
    title: 'Template',
    description: 'Template to use when creating embed webpage',
    options: ['Automatic', 'Basic'],
    default: 'Automatic',
  },
  {
    type: 'string',
    key: 'url',
    title: 'Webpage URL',
    description: 'URL to serve the webpage from',
    optional: true,
  }
];

// Stored config value map
type RuffleEmbedConfig = {
  /** Player Options */
  template: 'Automatic' | 'Basic';
  url: string;
};

const DEFAULT_CONFIG: Partial<RuffleEmbedConfig> = {
  template: 'Automatic'
};

export class RuffleWebEmbedMiddleware implements IGameMiddleware {
  id = 'com.ruffle.middleware-embed';
  name = 'Ruffle Web Embed';

  constructor(
    private ruffleWebRoot: string
  ) {}

  isValidVersion(version: string): boolean {
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
    // Cast our config values to the correct type
    const config = {
      ...DEFAULT_CONFIG,
      ...middlewareConfig.config
    } as Partial<RuffleEmbedConfig>;

    const launchArgs = coerceToStringArray(gameLaunchInfo.launchInfo.gameArgs);
    const sourceUrl = launchArgs[0];

    // Generate a webpage for the given configuration
    let data: string | null = null;
    const pageUrl = config.url ? config.url : genEmbedUrl(launchArgs[0]);
    switch (config.template) {
      default: {
        // Save generated embed to file
        data = buildBasicTemplate(gameLaunchInfo.game, sourceUrl);
        break;
      }
    }

    if (!data ) {
      throw 'Webpage generated data was empty?';
    }

    // Save generated webpage
    const rs = new Readable();
    rs.push(data);
    rs.push(null);
    await flashpoint.middleware.writeGameFileByUrl(pageUrl, rs);

    // Replace launch arg
    launchArgs[0] = pageUrl;

    // Copy required ruffle script
    await flashpoint.middleware.copyGameFilesByUrl('http://ruffle.rs/', path.join(this.ruffleWebRoot, 'latest'));

    // Overwrite launch values
    gameLaunchInfo.launchInfo.gamePath = path.join(flashpoint.config.flashpointPath, 'FPSoftware\\StartChrome.bat');
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

// Creates an embed at the root of the current domain
function genEmbedUrl(launchUrl: string): string {
  const url = new URL(launchUrl);
  if (url.pathname === '/embed.html') {
    url.pathname = '/embed_backup.html';
  } else {
    url.pathname = '/embed.html';
  }
  return url.href;
}
