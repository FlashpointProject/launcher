import { RightBrowseSidebar } from '../components/RightBrowseSidebar';
import { withConfirmDialog } from './withConfirmDialog';
import { withPreferences } from './withPreferences';
import { withSearch } from './withSearch';

export const ConnectedRightBrowseSidebar = withConfirmDialog(withSearch(withPreferences(RightBrowseSidebar)));
