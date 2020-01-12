import { Subtract } from '@shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withPreferences, WithPreferencesProps } from './withPreferences';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithPreferencesProps>;

export const ConnectedCuratePage = withPreferences(CuratePage);
