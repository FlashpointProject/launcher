import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ApplicationState } from '../store';
import { SearchQuery } from '../store/search';
import * as searchActions from '../store/search/actions';

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
