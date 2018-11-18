import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { ApplicationState } from '../store';
import { App } from '../app';
import { withPreferences } from './withPreferences';

const mapStateToProps = ({ search }: ApplicationState) => ({
  search: search.query
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  // ...
}, dispatch);

export default withRouter(withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(App)));
