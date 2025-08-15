import { withSearch, WithSearchProps } from '@renderer/containers/withSearch';
import { withView, WithViewProps } from '@renderer/containers/withView';
import { Subtract } from '@shared/interfaces';
import { Content } from 'flashpoint-launcher';
import { BrowsePage, BrowsePageProps } from '../components/pages/BrowsePage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedBrowsePageProps<T extends Content> = Subtract<BrowsePageProps, WithPreferencesProps & WithTagCategoriesProps & WithSearchProps & WithViewProps<T>>;

export default withView(withSearch(withTagCategories(withPreferences(
  BrowsePage
))));
