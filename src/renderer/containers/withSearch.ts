import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { searchActions } from '@renderer/store/search/slice';

const mapStateToProps = (state: RootState) => ({
  search: state.search,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    searchActions: bindActionCreators(searchActions, dispatch)
  };
}

export type WithSearchProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withSearch = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withSearch('+name+')' }
);
