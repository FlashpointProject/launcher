import { RawGameConfig } from '@database/entity/GameConfig';
import { GameConfig } from 'flashpoint-launcher';

export function loadGameConfig(config: RawGameConfig): GameConfig {
  const gc: GameConfig = {
    id: config.id,
    gameId: config.gameId,
    name: config.name,
    owner: config.owner,
    middleware: JSON.parse(config.storedMiddleware),
  };
  return gc;
}

export function storeGameConfig(config: GameConfig): RawGameConfig {
  const rgc = new RawGameConfig();
  rgc.id = config.id;
  rgc.gameId = config.gameId;
  rgc.name = config.name;
  rgc.owner = config.owner;
  rgc.storedMiddleware = JSON.stringify(config.middleware);
  return rgc;
}
