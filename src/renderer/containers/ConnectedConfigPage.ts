import { Subtract } from 'utility-types';
import { ConfigPage, IConfigPageProps } from '../components/pages/ConfigPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';

export type IConnectedConfigPageProps = Subtract<IConfigPageProps, WithPreferencesProps>;

export const ConnectedConfigPage = withPreferences(ConfigPage);
