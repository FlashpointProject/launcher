import * as React from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import * as searchActions from '../store/search/actions';
import { ApplicationState } from '../store';
import { Header, IHeaderProps } from '../components/Header';
import { Paths } from '../Paths';
import { withPreferences } from './withPreferences';
import { withSearch, WithSearchProps } from './withSearch';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { getLibraryRoute } from '../Util';

interface IStateToProps {
}

interface IDispatchToProps {
}

type IHeaderContainerProps = IHeaderProps & IStateToProps & IDispatchToProps & WithSearchProps & WithLibraryProps;

const HeaderContainer: React.FunctionComponent<IHeaderContainerProps> = (props: IHeaderContainerProps) => {
  const { onSearch, ...rest } = props;
  return (
    <Header
      onSearch={(text: string, redirect: boolean) => {
        props.preferencesData.lastSelectedLibrary
        if (redirect) { props.history.push(getLibraryRoute(props.preferencesData.lastSelectedLibrary)); }
        onSearch(text);
      }}
      {...rest}
    />
  );  
}

const mapStateToProps = ({ search }: ApplicationState): IStateToProps => ({
  search: search.query
});

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  onSearch: (text: string) => searchActions.setQuery({ text }),
}, dispatch);

export default withRouter(withLibrary(withPreferences(withSearch(connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderContainer)))));
