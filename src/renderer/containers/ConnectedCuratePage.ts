import { Subtract } from '@shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withCurateState, WithCurateStateProps } from './withCurateState';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithPreferencesProps & WithTagCategoriesProps & WithCurateStateProps>;

export const ConnectedCuratePage = withTagCategories(withPreferences(withCurateState(CuratePage)));
