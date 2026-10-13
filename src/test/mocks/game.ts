import { deepCopy } from '@shared/Util';
import { uuid } from '@shared/utils/uuid';
import { Game } from 'flashpoint-launcher';

const defaultGame: Game = {
  alternateTitles: '',
  series: '',
  developer: '',
  publisher: '',
  platforms: [],
  primaryPlatform: '',
  dateAdded: '',
  dateModified: '',
  playMode: '',
  status: '',
  notes: '',
  tags: [],
  source: '',
  legacyApplicationPath: '',
  legacyLaunchCommand: '',
  releaseDate: '',
  version: '',
  originalDescription: '',
  language: '',
  library: '',
  activeDataOnDisk: false,
  playtime: 0,
  playCounter: 0,
  archiveState: 0,
  logoPath: '',
  screenshotPath: '',
  ruffleSupport: '',
  owner: '',
  id: '',
  title: ''
};

export function createMockGame(game?: Partial<Game>): Game {
  const id = uuid();
  if (!game) {
    game = {};
  }
  game.id = id;
  if (!game.title) { game.title = id; }

  return {
    ...deepCopy(defaultGame),
    ...game,
  };
}
