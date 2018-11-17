import * as React from 'react';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import * as searchActions from '../store/search/actions';
import { ApplicationState } from '../store';
import { Header, IHeaderProps } from '../components/Header';
import { SearchQuery } from '../store/search';
import { Paths } from '../Paths';

interface IStateToProps {
  search: SearchQuery;
}

interface IDispatchToProps {
  onSearch: (text: string) => void;
}

type IHeaderContainerProps = IHeaderProps & IStateToProps & IDispatchToProps;

const HeaderContainer: React.FunctionComponent<IHeaderContainerProps> = (props: IHeaderContainerProps) => {
  const { onSearch, ...rest } = props;
  return (
    <Header
      onSearch={(text: string, redirect: boolean) => {
        if (redirect) { props.history.push(Paths.browse); }
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

export default withRouter(connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderContainer));
