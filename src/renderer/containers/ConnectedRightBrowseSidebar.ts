import { RightBrowseSidebar } from '../components/RightBrowseSidebar';
import { withConfirmDialog } from './withConfirmDialog';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';

export const ConnectedRightBrowseSidebar = withMainState(withConfirmDialog(withPreferences(RightBrowseSidebar)));
