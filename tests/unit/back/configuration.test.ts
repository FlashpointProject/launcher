import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { AppConfigData } from '@shared/config/interfaces';
import { getDefaultConfigData, overwriteConfigData } from '@shared/config/util';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import { AppPreferencesData } from 'flashpoint-launcher';
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
      'backPortMin': 12345,
      'backPortMax': 12345,
      'imagesPortMin': 12345,
      'imagesPortMax': 12345,
      'logsBaseUrl': 'https://example.com/',
      'updatesEnabled': true,
      'gotdUrl': 'dogga',
      'gotdShowAll': true,
      'middlewareOverridePath': 'test'
    };
    const newData: AppConfigData = deepCopy(getDefaultConfigData('win32'));
    overwriteConfigData(newData, data);
    expect(newData).toEqual(data);
  });

  it('overwrite preferences data', () => {
    const data: AppPreferencesData = {
      'onDemandImagesCompressed': false,
      'registerProtocol': true,
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
      'gamesOrderBy': 'lastPlayed',
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
          'categories': ['test'],
          'childFilters': [],
          'extreme': false,
          iconBase64: ''
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
      'searchLimit': 100,
      'onlineManual': 'test',
      'offlineManual': 'test',
      'fpfssBaseUrl': 'https://example.com',
      'groups': [{
        name: 'test',
        icon: 'test'
      }],
      'shortcuts': {
        'curate': {
          prev: ['ctrl+p', 'cmd+arrowup'],
          next: ['ctrl+p', 'cmd+arrowdown'],
          load: ['ctrl+p', 'cmd+o'],
          newCur: ['ctrl+p', 'cmd+n'],
          deleteCurs: ['ctrl+p', 'cmd+delete'],
          exportCurs: ['ctrl+p', 'cmd+s'],
          exportDataPacks: ['ctrl+shift+p', 'cmd+shift+s'],
          importCurs: ['ctrl+p', 'cmd+i'],
          refresh: ['ctrl+p', 'cmd+p'],
          run: ['ctrl+p', 'cmd+t'],
          runMad4fp: ['ctrl+shift+p', 'cmd+shift+t']
        }
      },
      'gameDataSources': [
        {
          'type': 'gordon',
          'name': 'ramsay',
          'arguments': ['first']
        }
      ],
      'server': 'dog',
      'curateServer': 'dog2',
      gameMetadataSources: [
        {
          name: 'dog',
          baseUrl: 'dogurl',
          tags: {
            actualUpdateTime: 'dog',
            latestUpdateTime: 'dog',
            latestDeleteTime: 'dog',
          },
          games: {
            actualUpdateTime: 'dog',
            latestUpdateTime: 'dog',
            latestDeleteTime: 'dog',
          },
        }
      ],
      'enablePlaytimeTracking': false,
      'enablePlaytimeTrackingExtreme': false,
      'enableVerboseLogging': true,
      'screenshotPreviewMode': ScreenshotPreviewMode.ON,
      'screenshotPreviewDelay': 100,
      'singleUsePrompt': {
        'badAntiVirus': true,
      }
    };
    const newData = deepCopy(defaultPreferencesData);
    overwritePreferenceData(newData, data);
    expect(newData).toEqual(data);
  });
});
