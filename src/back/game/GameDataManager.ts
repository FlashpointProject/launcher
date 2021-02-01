import { GameData } from '@database/entity/GameData';
import { SourceData } from '@database/entity/SourceData';
import { getManager, In } from 'typeorm';

export function find(id: number): Promise<GameData | undefined> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.findOne(id);
}

export function findGameData(gameId: string): Promise<GameData[]> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.find({
    where: {
      gameId
    }
  });
}

export function findSourceDataForHashes(hashes: string[]): Promise<SourceData[]> {
  const sourceDataRepository = getManager().getRepository(SourceData);
  return sourceDataRepository.find({
    sha256: In(hashes)
  });
}

export function save(gameData: GameData): Promise<GameData> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.save(gameData);
}
