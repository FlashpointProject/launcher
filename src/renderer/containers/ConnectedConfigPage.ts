import { Subtract } from 'utility-types';
import { ConfigPage, ConfigPageProps } from '../components/pages/ConfigPage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withLang, WithLangProps } from './withLang';

export type ConnectedConfigPageProps = Subtract<ConfigPageProps, WithPreferencesProps & WithLangProps>;

export const ConnectedConfigPage = withLang(withPreferences(ConfigPage));
