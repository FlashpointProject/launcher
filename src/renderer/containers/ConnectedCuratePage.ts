import { Subtract } from '../../shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withPreferences, WithPreferencesProps } from './withPreferences';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithLibraryProps & WithPreferencesProps>;

export const ConnectedCuratePage = withPreferences(withLibrary(CuratePage));
