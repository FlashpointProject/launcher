import { withCurate } from '@renderer/containers/withCurateState';
import { withFpfss } from '@renderer/containers/withFpfss';
import { withSearch } from '@renderer/containers/withSearch';
import { withView } from '@renderer/containers/withView';
import { withShortcut } from '@renderer/store/reactKeybindCompat';
import { withRouter } from 'react-router';
import { App } from '../components/app';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';
import { withTasks } from './withTasks';

export default withView(withFpfss(withSearch(withShortcut(withCurate(withTasks(withRouter(withMainState(withTagCategories(withPreferences(App))))))))));
