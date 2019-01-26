import * as React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { Header, IHeaderProps } from '../components/Header';
import { ApplicationState } from '../store';
import * as searchActions from '../store/search/actions';
import { joinLibraryRoute } from '../Util';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withPreferences } from './withPreferences';
import { withSearch, WithSearchProps } from './withSearch';

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
        if (redirect) { props.history.push(joinLibraryRoute(props.preferencesData.lastSelectedLibrary)); }
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
