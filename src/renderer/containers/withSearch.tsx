import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ApplicationState } from '../store';
import { SearchQuery } from '../store/search';
import * as searchActions from '../store/search/actions';

type StateToProps = {
  /** Query of the most recent search. */
  searchQuery: SearchQuery;
};

type DispatchToProps = {
  /** Called when the user attempts to make a search. */
  onSearch: (text: string) => void;
};

export type WithSearchProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ search }: ApplicationState): StateToProps => ({
  searchQuery: search.query,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  onSearch: (text: string) => searchActions.setQuery({ text }),
}, dispatch);

export const withSearch = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withSearch('+name+')' }
);
