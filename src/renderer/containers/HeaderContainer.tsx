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

interface IStateToProps {
}

interface IDispatchToProps {
}

type IHeaderContainerProps = IHeaderProps & IStateToProps & IDispatchToProps & WithSearchProps;

const HeaderContainer: React.FunctionComponent<IHeaderContainerProps> = (props: IHeaderContainerProps) => {
  const { onSearch, ...rest } = props;
  return (
    <Header
      onSearch={(text: string, redirect: boolean) => {
        if (redirect) { props.history.push(Paths.BROWSE); }
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

export default withRouter(withPreferences(withSearch(connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderContainer))));
