import { BackIn } from '../back/types';
import { DeepPartial } from '../interfaces';
import { IAppPreferencesData } from './interfaces';
import { overwritePreferenceData } from './util';

export type PreferencesFrontAPIData = {
  /** Current preferences. */
  data: IAppPreferencesData;
  /** Emitter for preference related events. */
  onUpdate?: () => void;
}

export namespace PreferencesFrontAPI {
  export function updateData(data: DeepPartial<IAppPreferencesData>, send: boolean = true) {
    const preferences = window.External.preferences;
    // @TODO Figure out the delta change of the object tree, and only send the changes
    overwritePreferenceData(preferences.data, data);
    if (preferences.onUpdate) { preferences.onUpdate(); }
    if (send) {
      window.External.backSocket.send(JSON.stringify([
        BackIn.UPDATE_PREFERENCES,
        preferences.data
      ]));
    }
  }
}
