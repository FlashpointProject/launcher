import { RightBrowseSidebar } from '../components/RightBrowseSidebar';
import { withPreferences } from './withPreferences';
import { withSearch } from './withSearch';

export const ConnectedRightBrowseSidebar = withSearch(withPreferences(RightBrowseSidebar));
