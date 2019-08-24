import { LangContainer } from '../../shared/lang/interfaces';
import * as React from 'react';

export const LangContext = React.createContext(getDefaultLocalization());

export function getDefaultLocalization() : LangContainer {
  return {
    config: {
      configHeader: 'configHeader',
      configDesc: 'configDesc',
      extremeGames: 'extremeGames',
      extremeGamesDesc: 'extremeGamesDesc',
      preferencesHeader: 'preferencesHeader',
      enableEditing: 'enableEditing',
      enableEditingDesc: 'enableEditingDesc',
      flashpointHeader: 'flashpointHeader',
      flashpointPath: 'flashpointPath',
      flashpointPathDesc: 'flashpointPathDesc',
      redirector: 'redirector',
      redirectorFiddler: 'redirectorFiddler',
      redirectorDesc: 'redirectorDesc',
      useWine: 'useWine',
      useWineDesc: 'useWineDesc',
      visualsHeader: 'visualsHeader',
      useCustomTitleBar: 'useCustomTitleBar',
      useCustomTitleBarDesc: 'useCustomTitleBarDesc',
      theme: 'theme',
      noTheme: 'noTheme',
      themeDesc: 'themeDesc',
      advancedHeader: 'advancedHeader',
      showDeveloperTab: 'showDeveloperTab',
      showDeveloperTabDesc: 'showDeveloperTabDesc',
      saveAndRestart: 'saveAndRestart',
      browse: 'browse'
    },
    home: {
      quickStartHeader: 'quickStartHeader',
      hallOfFameInfo: 'hallOfFameInfo {0}',
      hallOfFame: 'hallOfFame',
      allGamesInfo: 'allGamesInfo {0}',
      allGames: 'allGames',
      allAnimationsInfo: 'animationInfo {0}',
      allAnimations: 'allAnimations',
      configInfo: 'configInfo {0}',
      config: 'config',
      helpInfo: 'helpInfo {0}',
      help: 'help',
      upgradesHeader: 'upgradesHeader',
      installComplete: 'installComplete',
      alreadyInstalled: 'alreadyInstalled',
      download: 'download',
      extrasHeader: 'extrasHeader',
      favouritesPlaylist: 'favouritesPlaylist',
      genreList: 'genreList',
      filterByPlatform: 'filterByPlatform',
      plannedFeatures: 'plannedFeatures',
      notesHeader: 'notesHeader',
      notes: 'notes',
      randomPicks: 'randomPicks',
    },
    logs:{
      filters: 'filters',
      copyText: 'copyText',
      clearLog: 'clearLog'
    },
  };
}

