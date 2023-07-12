import { BackState } from '@back/types';
import { fixSlashes } from '@shared/Util';
import { parseVariableString } from '@shared/utils/VariableString';
import * as path from 'path';

export async function parseAppVar(extId: string, appPath: string, launchCommand: string, state: BackState) {
  const ext = await state.extensionsService.getExtension(extId);
  return parseVariableString(appPath, (name) => {
    switch (name) {
      case 'extPath': return path.resolve(ext ? ext.extensionPath : '');
      case 'extDataURL': return `http://localhost:${state.fileServerPort}/extdata/${extId}/`;
      case 'os': return process.platform;
      case 'arch': return process.arch;
      case 'launchCommand': return launchCommand;
      case 'cwd': return fixSlashes(process.cwd());
      case 'fpPath': return state.config ? fixSlashes(state.config.flashpointPath) : '';
      case 'proxy': return state.preferences.browserModeProxy || '';
      default: {
        if (name.startsWith('extConf:')) {
          const key = name.substring(8);
          return state.extConfig[key];
        }
        return '';
      }
    }
  });
}
