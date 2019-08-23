import LocalizedStrings from 'react-localization';
import { ILangData } from '../../shared/lang/interfaces';

export function getDefaultLocalization() : ILangData {
  return {
    config: new LocalizedStrings({
      en:{
        configHeader: 'configHeader',
        configDesc: 'configDesc',
        extremeGames: 'extremeGames',
        extremeGamesDesc: 'extremeGamesDesc',
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
      }
    }),
    home: new LocalizedStrings({
      en:{
        quickStartHeader: 'quickStartHeader',
        hallOfFameInfo: 'hallOfFameInfo',
        animationInfo: 'animationInfo',
        configInfo: 'configInfo',
        helpInfo: 'helpInfo',
        upgradesHeader: 'upgradesHeader',
        otherTechnologies: 'otherTechnologies',
        otherTechnologiesDesc: 'otherTechnologiesDesc',
        screenshots: 'screenshots',
        screenshotsDesc: 'screenshotsDesc',
        notInstalled: 'notInstalled',
        alreadyInstalled: 'alreadyInstalled',
        extrasHeader: 'extrasHeader',
        favouritesPlaylist: 'favouritesPlaylist',
        genreList: 'genreList',
        filterByPlatform: 'filterByPlatform',
        plannedFeatures: 'plannedFeatures',
        notesHeader: 'notesHeader',
        notes: 'notes',
        randomPicks: 'randomPicks',
      }
    }),
  };
}

