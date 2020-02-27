import { Reducer } from 'redux';
import { SearchActions, SearchState } from './types';

const initialState: SearchState = {
  query: { text: '' },
};

const reducer: Reducer<SearchState> = (state = initialState, action) => {
  switch (action.type) {
    case SearchActions.SET_QUERY: {
      return { ...state, query: action.payload };
    }
    default: {
      return state;
    }
  }
};

export { reducer as searchReducer };
