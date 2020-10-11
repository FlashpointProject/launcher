import { Subtract } from '@shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withCurateState, WithCurateStateProps } from './withCurateState';
import { withMainState, WithMainStateProps } from './withMainState';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithCurateStateProps>;

export const ConnectedCuratePage = withTagCategories(withPreferences(withMainState(withCurateState(CuratePage))));
