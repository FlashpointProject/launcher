import { Reducer } from 'redux';
import { SearchActionTypes, SearchState } from './types';

const initialState: SearchState = {
  query: { text: '' },
}

const reducer: Reducer<SearchState> = (state = initialState, action) => {
  switch (action.type) {
    case SearchActionTypes.SET_QUERY: {
      return { ...state, query: action.payload };
    }
    default: {
      return state;
    }
  }
}

export { reducer as searchReducer };
