import { LoadedCuration, CurationState } from '@shared/curate/types';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { genCurationWarnings } from '@shared/Util';

export function buildCurationStates(curations: LoadedCuration[], suggestions: GamePropSuggestions, strings: LangContainer['curate']): CurationState[] {
  return curations.map(c => {
    return {
      ...c,
      warnings: genCurationWarnings(c, window.Shared.config.fullFlashpointPath, suggestions, strings)
    };
  });
}
