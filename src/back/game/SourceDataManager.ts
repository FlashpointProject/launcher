import { SourceData } from '@database/entity/SourceData';
import { chunkArray } from '@shared/utils/misc';
import { AppDataSource } from '..';

export function findBySource(sourceId: number): Promise<SourceData[]> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  return sourceDataRepository.find({
    where: {
      sourceId
    }
  });
}

export function findSourceHash(sourceId: number, hash: string): Promise<SourceData | null> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  return sourceDataRepository.findOneBy({ sourceId, sha256: hash });
}

export function findOne(sourceDataId: number): Promise<SourceData | null> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  return sourceDataRepository.findOneBy({ id: sourceDataId });
}

export function save(sourceData: SourceData): Promise<SourceData> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  return sourceDataRepository.save(sourceData);
}

export function countBySource(sourceId: number): Promise<number> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  return sourceDataRepository.count({
    where: {
      sourceId
    }
  });
}

export async function clearSource(sourceId: number): Promise<void> {
  const sourceDataRepository = AppDataSource.getRepository(SourceData);
  await sourceDataRepository.delete({ sourceId });
}

export async function updateData(sourceData: SourceData[]): Promise<void> {
  const chunks = chunkArray(sourceData, 2000);
  for (const chunk of chunks) {
    await AppDataSource.transaction(async transEntityManager => {
      for (const sd of chunk) {
        await transEntityManager.save(SourceData, sd);
      }
    });
  }
}
