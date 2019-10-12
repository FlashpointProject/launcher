import * as React from 'react';
import { createLangContainer, LangContainer } from '../../shared/lang';

export const LangContext = React.createContext(getDefaultLocalization());

export function getDefaultLocalization(): LangContainer {
  // Get the base language container
  const lang: LangContainer = createLangContainer();
  // Make some changes
  lang.config.auto += ' ({0})';
  lang.home.hallOfFameInfo += ' {0}';
  lang.home.allGamesInfo += ' {0}';
  lang.home.allAnimationsInfo += ' {0}';
  lang.home.configInfo += ' {0}';
  lang.home.helpInfo += ' {0}';
  lang.home.linuxSupport += ' {0}';
  lang.browse.dropGameOnLeft += ' {0}';
  lang.browse.setFlashpointPathQuestion += ' {0} {1}';
  lang.browse.noteSaveAndRestart += ' {0}';
  lang.misc.noBlankFound = '{0} ' + lang.misc.noBlankFound;
  lang.misc.addBlank += ' {0}';
  lang.misc.deleteAllBlankImages += ' {0}';
  lang.dialog.errorParsingPlatformsMessage = '{0} ' + lang.dialog.errorParsingPlatformsMessage;
  // Return object
  return lang;
}
