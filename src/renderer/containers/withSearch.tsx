import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ApplicationState } from '../store';
import * as searchActions from '../store/search/actions';
import { SearchQuery } from '../store/search';

interface IStateToProps {
  searchQuery: SearchQuery;
}

interface IDispatchToProps {
  onSearch: (text: string) => void;
}

export type WithSearchProps = IStateToProps & IDispatchToProps;

const mapStateToProps = ({ search }: ApplicationState): IStateToProps => ({
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
