import { Subtract } from 'utility-types';
import { ConfigPage, ConfigPageProps } from '../components/pages/ConfigPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';

export type ConnectedConfigPageProps = Subtract<ConfigPageProps, WithPreferencesProps>;

export const ConnectedConfigPage = withPreferences(ConfigPage);
