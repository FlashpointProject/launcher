import { Reducer } from 'redux';
import { ActionType, getType } from 'typesafe-actions';
import { defaultPreferencesData } from '../../../shared/preferences/util';
import { deepCopy } from '../../../shared/Util';
import * as actions from './actions';
import { IPreferencesState } from './types';

const initialState: IPreferencesState = {
  data: deepCopy(defaultPreferencesData),
};

export type ReducerAction = ActionType<typeof actions>;

const reducer: Reducer<IPreferencesState, ReducerAction> = (state = initialState, action) => {
  switch (action.type) {
    case getType(actions.updatePreferences): {
      return { ...state, data: { ...state.data, ...action.payload } };
    }
    default: {
      return state;
    }
  }
};

export { reducer as preferencesReducer };
