import { Game, GameData } from 'flashpoint-launcher';

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

export function newGame(): Game {
  return {
    id: '',
    library: '',
    title: '',
    alternateTitles: '',
    series: '',
    developer: '',
    publisher: '',
    primaryPlatform: '',
    platforms: [],
    dateAdded: (new Date()).toISOString(),
    dateModified: (new Date()).toISOString(),
    detailedPlatforms: [],
    playMode: '',
    status: '',
    notes: '',
    tags: [],
    detailedTags: [],
    source: '',
    legacyApplicationPath: '',
    legacyLaunchCommand: '',
    releaseDate: '',
    version: '',
    originalDescription: '',
    language: '',
    activeDataId: 0,
    activeDataOnDisk: false,
    lastPlayed: (new Date()).toISOString(),
    playtime: 0,
    playCounter: 0,
    activeGameConfigId: 0,
    activeGameConfigOwner: '',
    archiveState: 0,
    gameData: [],
    addApps: []
  };
}

export function getGameDataFilename(data: GameData) {
  const cleanDate = data.dateAdded.includes('T') ? data.dateAdded : `${data.dateAdded} +0000 UTC`;
  return `${data.gameId}-${(new Date(cleanDate)).getTime()}.zip`;
}
