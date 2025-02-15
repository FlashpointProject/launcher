import { Subtract } from '@shared/interfaces';
import { HomePage, HomePageProps } from '../components/pages/HomePage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withSearch, WithSearchProps } from './withSearch';
import { withMainState, WithMainStateProps } from './withMainState';

export type ConnectedHomePageProps = Subtract<HomePageProps, WithPreferencesProps & WithSearchProps & WithMainStateProps>;

export default withMainState(withSearch(withPreferences(HomePage)));
