import { Reducer } from 'redux';
import { ActionType, getType } from 'typesafe-actions';
import * as actions from './actions';
import { ILangState } from './types';
import { getDefaultLocalization } from '../../util/lang';

const initialState: ILangState = {
  data: getDefaultLocalization(),
};

export type ReducerAction = ActionType<typeof actions>;

const reducer: Reducer<ILangState, ReducerAction> = (state = initialState, action) => {
  switch (action.type) {
    case getType(actions.updateLang): {
      return { ...state, data: action.payload  };
    }
    default: {
      return state;
    }
  }
};

export { reducer as langReducer };
