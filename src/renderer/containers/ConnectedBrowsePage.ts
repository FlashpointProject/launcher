import { BrowsePage, BrowsePageProps } from '../components/pages/BrowsePage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';
import { withSearch, WithSearchProps } from '@renderer/containers/withSearch';
import { Subtract } from '@shared/interfaces';
import { withView, WithViewProps } from '@renderer/containers/withView';

export type ConnectedBrowsePageProps = Subtract<BrowsePageProps, WithPreferencesProps & WithTagCategoriesProps & WithSearchProps & WithViewProps>;

export default withView(withSearch(withTagCategories(withPreferences(
  BrowsePage
))));
