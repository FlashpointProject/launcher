import { Subtract } from 'utility-types';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withLibrary, WithLibraryProps } from './withLibrary';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithLibraryProps>;

export const ConnectedCuratePage = withLibrary(CuratePage);
