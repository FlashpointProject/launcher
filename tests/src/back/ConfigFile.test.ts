import { ConfigFile } from '@back/ConfigFile';
import * as path from 'path';
import * as fs from 'fs-extra';
import { STATIC_PATH, RESULT_PATH } from '@tests/setup';
import { IAppConfigData } from '@shared/config/interfaces';
import { getDefaultConfigData } from '@shared/config/util';

const BASE_PATH = 'ConfigFile';

describe('Config File', () => {
  beforeAll(() => {
    // Setup results directory
    const filePath = path.join(RESULT_PATH, BASE_PATH);
    fs.removeSync(filePath);
    fs.mkdirsSync(filePath);
  });

  test('Read Config File', async () => {
    // staticConfig should be identical to the one in ./tests/static/back/config.json
    const filePath = path.join(STATIC_PATH, BASE_PATH, 'config.json');
    expect(await ConfigFile.readFile(filePath)).toEqual(staticConfig);
  });

  test('Generate Config File', async () => {
    // Create file
    const filePath = path.join(RESULT_PATH, BASE_PATH, 'config_generated.json');
    await ConfigFile.readOrCreateFile(filePath);
    // Get expected defaults
    const rawData = await fs.readFile(filePath, 'utf8');
    const fileData = JSON.parse(rawData);
    const defaultData = getDefaultConfigData(process.platform);
    expect(fileData).toEqual(defaultData);
  });

  test('Save Config File', async () => {
    const filePath = path.join(RESULT_PATH, BASE_PATH, 'config_saved.json');
    await ConfigFile.saveFile(filePath, staticConfig);
    const rawData = await fs.readFile(filePath, 'utf8');
    const fileData = JSON.parse(rawData);
    expect(fileData).toEqual(staticConfig);
  });
});

const staticConfig: IAppConfigData = {
  flashpointPath: 'TestSuccess',
  imageFolderPath: 'TestSuccess',
  logoFolderPath: 'TestSuccess',
  playlistFolderPath: 'TestSuccess',
  jsonFolderPath: 'TestSuccess',
  platformFolderPath: 'TestSuccesss',
  themeFolderPath: 'TestSuccess',
  useCustomTitlebar: true,
  startServer: false,
  startRedirector: false,
  useFiddler: true,
  disableExtremeGames: true,
  showBrokenGames: true,
  backPortMin: 1,
  backPortMax: 1,
  imagesPortMin: 1,
  imagesPortMax: 1,
  nativePlatforms: [ 'TestSuccess' ]
};