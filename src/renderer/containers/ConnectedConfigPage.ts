import { ConfigPage } from '../components/pages/ConfigPage';
import { withPreferences } from './withPreferences';

export const ConnectedConfigPage = withPreferences(ConfigPage);
