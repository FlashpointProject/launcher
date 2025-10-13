import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { forceSearch, ForceSearchAction, searchActions } from '@renderer/store/search/slice';
import { store } from '@renderer/store/store';
import { Subtract } from '@shared/interfaces';
import { SearchState } from 'flashpoint-launcher';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type SearchStateProps = {
  search: SearchState
};

export type WithSearchProps = SearchStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    searchActions: {
      ...bindActionCreators(searchActions, dispatch),
      forceSearch: (action: ForceSearchAction) => { store.dispatch(forceSearch(action)); },
    }
  };
}

export function withSearch<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithSearchProps>) => {
    const stateProps: SearchStateProps = useAppSelector(state => ({
      search: state.search
    }));
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
