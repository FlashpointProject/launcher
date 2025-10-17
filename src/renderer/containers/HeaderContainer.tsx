import { withConfirmDialog } from '@renderer/containers/withConfirmDialog';
import { withMainState } from '@renderer/containers/withMainState';
import { withSearch } from '@renderer/containers/withSearch';
import { withView } from '@renderer/containers/withView';
import { Header } from '../components/Header';
import { withNavigation } from './withNavigation';
import { withPreferences } from './withPreferences';
import { withTagCategories } from './withTagCategories';
import { withContextMenu } from './withContextMenu';

export default withContextMenu(withConfirmDialog(withMainState(withView(withNavigation(withSearch(withTagCategories(withPreferences(Header))))))));
