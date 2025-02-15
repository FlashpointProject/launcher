import { withRouter } from 'react-router';
import { Header } from '../components/Header';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';
import { withSearch } from '@renderer/containers/withSearch';
import { withView } from '@renderer/containers/withView';
import { withMainState } from '@renderer/containers/withMainState';
import { withConfirmDialog } from '@renderer/containers/withConfirmDialog';

export default withConfirmDialog(withMainState(withView(withSearch(withRouter(withTagCategories(withPreferences(Header)))))));
