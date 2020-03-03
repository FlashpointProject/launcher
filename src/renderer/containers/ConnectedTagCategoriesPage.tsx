import { TagCategoriesPage, TagCategoriesPageProps } from '@renderer/components/pages/TagCategoriesPage';
import { Subtract } from '@shared/interfaces';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedTagCategoriesPageProps = Subtract<TagCategoriesPageProps, WithTagCategoriesProps & WithPreferencesProps>;

export const ConnectedTagCategoriesPage = withPreferences(withTagCategories(TagCategoriesPage));
