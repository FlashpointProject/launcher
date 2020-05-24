import { Subtract } from '@shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithPreferencesProps & WithTagCategoriesProps>;

export const ConnectedCuratePage = withTagCategories(withPreferences(CuratePage));
