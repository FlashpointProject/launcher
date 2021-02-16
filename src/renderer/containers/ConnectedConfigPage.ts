import { Subtract } from '@shared/interfaces';
import { ConfigPage, ConfigPageProps } from '../components/pages/ConfigPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedConfigPageProps = Subtract<ConfigPageProps, WithPreferencesProps & WithTagCategoriesProps>;

export const ConnectedConfigPage = withTagCategories(withPreferences(ConfigPage));
