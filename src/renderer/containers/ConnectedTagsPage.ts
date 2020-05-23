import { Subtract } from '@shared/interfaces';
import { TagsPage, TagsPageProps } from '../components/pages/TagsPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedTagsPageProps = Subtract<TagsPageProps, WithTagCategoriesProps & WithPreferencesProps>;

export const ConnectedTagsPage = withPreferences(withTagCategories(TagsPage));
