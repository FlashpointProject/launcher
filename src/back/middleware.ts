/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigSchema, Game, GameLaunchInfo, GameMiddlewareConfig, GameMiddlewareDefaultConfig, IGameMiddleware, middleware } from 'flashpoint-launcher';

const systemEnvSchema: ConfigSchema = [
  {
    type: 'string',
    key: 'envVars',
    title: 'Environment Variables',
    description: 'A list of environment variables to append. E.G `TERM=xterm DOG="woof woof"`',
    optional: true,
  }
];

type SystemEnvConfig = {
  envVars: string; // Format e.g 'TERM=xterm DOG="woof woof"'
}

// Basic middleware to set environmental variables for a game launch
export class SystemEnvMiddleware implements IGameMiddleware {
  id = 'system.middleware-env';
  name = 'Environmental Variables';
  extId = 'SYSTEM';

  isValid(game: Game): boolean | Promise<boolean> {
    return true;
  }
  isValidVersion(version: string): boolean | Promise<boolean> {
    return true;
  }
  execute(gameLaunchInfo: GameLaunchInfo, middlewareConfig: GameMiddlewareConfig): GameLaunchInfo | Promise<GameLaunchInfo> {
    const config: Partial<SystemEnvConfig> = middlewareConfig.config;
    if (config.envVars) {
      const regex = /(\w+)=("[^"]+"|\S+)/g;
      let match;
      // Map config.envVars to key value pairs on env
      while ((match = regex.exec(config.envVars))) {
        const [_, key, value] = match;
        gameLaunchInfo.launchInfo.env[key] = value;
      }
    }
    throw new Error('Method not implemented.');
  }
  getDefaultConfig(game: Game): GameMiddlewareDefaultConfig {
    return {
      version: 'latest',
      config: {}
    };
  }
  getConfigSchema(version: string): ConfigSchema {
    return systemEnvSchema;
  }
  upgradeConfig(version: string, config: any) {
    return;
  }
}
