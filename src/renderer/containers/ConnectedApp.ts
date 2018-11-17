import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ApplicationState } from '../store';
import { App } from '../app';
import { withRouter } from 'react-router';

const mapStateToProps = ({ search }: ApplicationState) => ({
  search: search.query
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  // ...
}, dispatch);

export default withRouter(connect(
  mapStateToProps,
  mapDispatchToProps
)(App));
