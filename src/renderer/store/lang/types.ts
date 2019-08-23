import { ILangData } from '../../../shared/lang/interfaces';

export const enum LangActionTypes {
  UPDATE_LANG = '@@lang/UPDATE_LANG',
}

export interface ILangState {
  readonly data: ILangData;
}