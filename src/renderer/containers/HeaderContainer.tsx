import * as React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { Header, HeaderProps } from '../components/Header';
import { ApplicationState } from '../store';
import * as searchActions from '../store/search/actions';
import { joinLibraryRoute } from '../Util';
import { withPreferences } from './withPreferences';
import { withSearch, WithSearchProps } from './withSearch';

type StateToProps = {};

type DispatchToProps = {};

type HeaderContainerProps = HeaderProps & StateToProps & DispatchToProps & WithSearchProps;

const HeaderContainer: React.FunctionComponent<HeaderContainerProps> = (props: HeaderContainerProps) => {
  const { onSearch, ...rest } = props;
  return (
    <Header
      onSearch={(text: string, redirect: boolean) => {
        if (redirect) { props.history.push(joinLibraryRoute(props.preferencesData.lastSelectedLibrary)); }
        onSearch(text);
      }}
      { ...rest }
    />
  );
};

const mapStateToProps = ({ search }: ApplicationState): StateToProps => ({
  search: search.query
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchToProps => bindActionCreators({
  onSearch: (text: string) => searchActions.setQuery({ text }),
}, dispatch);

export default withRouter(withPreferences(withSearch(connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderContainer))));
