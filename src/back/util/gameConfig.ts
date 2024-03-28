// import { GameConfig, IGameMiddleware } from 'flashpoint-launcher';

// export function loadGameConfig(config: RawGameConfig, registry: Map<string, IGameMiddleware>): GameConfig {
//   const data = JSON.parse(config.storedMiddleware);
//   const gc: GameConfig = {
//     id: config.id,
//     gameId: config.gameId,
//     name: config.name,
//     owner: config.owner,
//     middleware: data.middleware,
//   };
//   for (const m of gc.middleware) {
//     const middleware = registry.get(m.middlewareId);
//     if (middleware === undefined) {
//       m.name = 'Not Loaded';
//     } else {
//       m.name = middleware.name;
//     }
//   }
//   return gc;
// }

// export function storeGameConfig(config: GameConfig): RawGameConfig {
//   const data = {
//     middleware: [...config.middleware]
//   };
//   for (const m of data.middleware) {
//     delete (m as any).name;
//   }
//   const rgc = new RawGameConfig();
//   rgc.id = config.id;
//   rgc.gameId = config.gameId;
//   rgc.name = config.name;
//   rgc.owner = config.owner;
//   rgc.storedMiddleware = JSON.stringify(data);
//   return rgc;
// }
