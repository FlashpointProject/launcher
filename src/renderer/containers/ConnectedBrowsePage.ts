import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Subtract } from 'utility-types';
import { ApplicationState } from '../store';
import * as searchActions from '../store/search/actions';
import { BrowsePage, IBrowsePageProps } from '../components/pages/BrowsePage';
import { SearchQuery } from '../store/search';
import { withPreferences, WithPreferencesProps } from './withPreferences';

interface IStateToProps {
  search: SearchQuery;
}

interface IDispatchToProps {
  clearSearch: () => void;
}

export type IConnectedBrowsePageProps = Subtract<IBrowsePageProps, IStateToProps & IDispatchToProps & WithPreferencesProps>;

const mapStateToProps = ({ search }: ApplicationState): IStateToProps => ({
  search: search.query,
});

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export default withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(BrowsePage));
