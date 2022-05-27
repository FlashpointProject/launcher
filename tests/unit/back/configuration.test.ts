import { AppConfigData } from '@shared/config/interfaces';
import { getDefaultConfigData, overwriteConfigData } from '@shared/config/util';
import { AppPreferencesData } from '@shared/preferences/interfaces';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import uuid = require('uuid');

const testFolder = path.join(os.tmpdir(), 'fp-tests-' + uuid());

describe('Configuration Files', () => {
  beforeAll(async () => {
    await fs.ensureDir(testFolder);
  });

  afterAll(async () => {
    await fs.remove(testFolder);
  });

  it('overwrite config data', () => {
    const data: AppConfigData = {
      'flashpointPath': 'example',
      'useCustomTitlebar': false,
      'startServer': false,
      'server': 'example',
      'backPortMin': 12345,
      'backPortMax': 12345,
      'imagesPortMin': 12345,
      'imagesPortMax': 12345,
      'logsBaseUrl': 'https://example.com/',
      'updatesEnabled': true
    };
    const newData: AppConfigData = deepCopy(getDefaultConfigData('win32'));
    overwriteConfigData(newData, data);
    expect(newData).toEqual(data);
  });

  it('overwrite preferences data', () => {
    const data: AppPreferencesData = {
      'imageFolderPath': 'test/Images',
      'logoFolderPath': 'test/Logos',
      'playlistFolderPath': 'test/Playlists',
      'jsonFolderPath': 'test',
      'htdocsFolderPath': 'test/htdocs',
      'platformFolderPath': 'test/Platforms',
      'themeFolderPath': 'test/Themes',
      'logoSetsFolderPath': 'test/LogoSets',
      'metaEditsFolderPath': 'test/MetaEdits',
      'extensionsPath': 'test/Extensions',
      'dataPacksFolderPath': 'test/Games',
      'browsePageGameScale': 1,
      'browsePageShowExtreme': true,
      'enableEditing': false,
      'fallbackLanguage': 'test',
      'currentLanguage': 'test',
      'browsePageLayout': 1,
      'browsePageShowLeftSidebar': false,
      'browsePageShowRightSidebar': false,
      'browsePageLeftSidebarWidth': 2,
      'browsePageRightSidebarWidth': 2,
      'curatePageLeftSidebarWidth': 2,
      'showDeveloperTab': false,
      'currentTheme': 'Metal\\test.css',
      'currentLogoSet': 'test',
      'lastSelectedLibrary': 'test',
      'gamesOrderBy': 'platform',
      'gamesOrder': 'DESC',
      'defaultLibrary': 'test',
      'mainWindow': {
        'x': 6,
        'y': 1,
        'width': 2,
        'height': 4,
        'maximized': true
      },
      'saveImportedCurations': false,
      'keepArchiveKey': false,
      'symlinkCurationContent': false,
      'onDemandImages': true,
      'onDemandBaseUrl': 'https://example.com/',
      'browserModeProxy': 'toast:22500',
      'showLogSource': {
        'test': true
      },
      'showLogLevel': {
        '0': true,
        '1': true,
        '2': false,
        '3': false,
        '4': false,
        '5': false
      },
      'excludedRandomLibraries': [
        'test'
      ],
      'appPathOverrides': [
        {
          'path': '',
          'override': '',
          'enabled': true
        }
      ],
      'tagFilters': [
        {
          'name': 'New Group',
          'description': '',
          'enabled': true,
          'tags': [
            'Action'
          ],
          'categories': [ 'test' ],
          'childFilters': [],
          'extreme': false
        }
      ],
      'tagFiltersInCurate': true,
      'nativePlatforms': [ 'test' ],
      'disableExtremeGames': true,
      'showBrokenGames': true,
      'minimizedHomePageBoxes': [ 'test' ],
      'hideExtremeScreenshots': true,
      'updateFeedUrl': 'https://example/',
      'fancyAnimations': false,
      'searchLimit': 100
    };
    const newData = deepCopy(defaultPreferencesData);
    overwritePreferenceData(newData, data);
    expect(newData).toEqual(data);
  });
});
