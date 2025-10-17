import { RightBrowseSidebar } from '../components/RightBrowseSidebar';
import { withConfirmDialog } from './withConfirmDialog';
import { withContextMenu } from './withContextMenu';
import { withMainState } from './withMainState';
import { withPreferences } from './withPreferences';

export const ConnectedRightBrowseSidebar = withContextMenu(withMainState(withConfirmDialog(withPreferences(RightBrowseSidebar))));
