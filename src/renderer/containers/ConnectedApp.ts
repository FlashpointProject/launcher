import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { App } from '../app';
import { ApplicationState } from '../store';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';
import { withTasks } from './withTasks';
import { withCurateState } from './withCurateState';

const mapStateToProps = ({ search }: ApplicationState) => ({
  search: search.query
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  // ...
}, dispatch);

export default withCurateState(withTasks(withRouter(withMainState(withTagCategories(withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(App)))))));
