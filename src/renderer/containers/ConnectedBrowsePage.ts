import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { BrowsePage, IBrowsePageProps } from '../components/pages/BrowsePage';
import { ApplicationState } from '../store';
import { SearchQuery } from '../store/search';
import * as searchActions from '../store/search/actions';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withPreferences, WithPreferencesProps } from './withPreferences';

interface IStateToProps {
  search: SearchQuery;
}

interface IDispatchToProps {
  clearSearch: () => void;
}

export type IConnectedBrowsePageProps = Subtract<IBrowsePageProps, IStateToProps & IDispatchToProps & WithPreferencesProps & WithLibraryProps>;

const mapStateToProps = ({ search }: ApplicationState): IStateToProps => ({
  search: search.query,
});

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export default withLibrary(withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(BrowsePage)));
