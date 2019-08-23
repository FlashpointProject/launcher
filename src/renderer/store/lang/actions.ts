import { createAction } from 'typesafe-actions';
import { LangActionTypes } from './types';
import { ILocalization } from '../../../shared/lang/interfaces';

export const updateLang = createAction(LangActionTypes.UPDATE_LANG, resolve => {
  return (data: ILocalization) => resolve(data);
});
