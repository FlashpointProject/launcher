import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState, store } from '@renderer/store/store';
import { forceSearch, ForceSearchAction, searchActions } from '@renderer/store/search/slice';

const mapStateToProps = (state: RootState) => ({
  search: state.search,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    searchActions: {
      ...bindActionCreators(searchActions, dispatch),
      forceSearch: (action: ForceSearchAction) => { store.dispatch(forceSearch(action)); },
    }
  };
}

export type WithSearchProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withSearch = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withSearch('+name+')' }
);
