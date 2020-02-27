import { Subtract } from '@shared/interfaces';
import { TagsPage, TagsPageProps } from '../components/pages/TagsPage';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedTagsPageProps = Subtract<TagsPageProps, WithTagCategoriesProps>;

export const ConnectedTagsPage = withTagCategories(TagsPage);
