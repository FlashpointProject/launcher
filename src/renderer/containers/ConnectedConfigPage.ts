import { Subtract } from '@shared/interfaces';
import { ConfigPage, ConfigPageProps } from '../components/pages/ConfigPage';
import { withConfirmDialog, WithConfirmDialogProps } from './withConfirmDialog';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedConfigPageProps = Subtract<ConfigPageProps, WithPreferencesProps & WithConfirmDialogProps & WithTagCategoriesProps>;

export const ConnectedConfigPage = withTagCategories(withConfirmDialog(withPreferences(ConfigPage)));
