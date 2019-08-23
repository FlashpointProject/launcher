import { createAction } from 'typesafe-actions';
import { LangActionTypes } from './types';
import { ILangData } from '../../../shared/lang/interfaces';

export const updateLang = createAction(LangActionTypes.UPDATE_LANG, resolve => {
  return (data: ILangData) => resolve(data);
});
