import { Subtract } from '@shared/interfaces';
import { ConfigPage, ConfigPageProps } from '../components/pages/ConfigPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';
import { withSearch, WithSearchProps } from '@renderer/containers/withSearch';

export type ConnectedConfigPageProps = Subtract<ConfigPageProps, WithPreferencesProps & WithTagCategoriesProps & WithSearchProps>;

export const ConnectedConfigPage = withSearch(withTagCategories(withPreferences(ConfigPage)));
