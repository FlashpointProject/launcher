import { withRouter } from 'react-router';
import { App } from '../components/app';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';
import { withTasks } from './withTasks';
import { withShortcut } from 'react-keybind';
import { withCurate } from '@renderer/containers/withCurateState';
import { withSearch } from '@renderer/containers/withSearch';
import { withFpfss } from '@renderer/containers/withFpfss';
import { withView } from '@renderer/containers/withView';

export default withView(withFpfss(withSearch(withShortcut(withCurate(withTasks(withRouter(withMainState(withTagCategories(withPreferences(App))))))))));
