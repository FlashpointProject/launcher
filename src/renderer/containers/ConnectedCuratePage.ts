import { withCurate, WithCurateProps } from '@renderer/containers/withCurateState';
import { withShortcut } from '@renderer/store/reactKeybindCompat';
import { Subtract } from '@shared/interfaces';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withConfirmDialog, WithConfirmDialogProps } from './withConfirmDialog';
import { withMainState, WithMainStateProps } from './withMainState';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';
import { withTasks, WithTasksProps } from './withTasks';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithTasksProps & WithTagCategoriesProps & WithPreferencesProps & WithMainStateProps & WithCurateProps & WithConfirmDialogProps>;

export const ConnectedCuratePage = withShortcut(withTasks(withTagCategories(withPreferences(withMainState(withCurate(withConfirmDialog(CuratePage)))))));
