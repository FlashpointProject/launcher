import { Subtract } from '@shared/interfaces';
import { withShortcut } from 'react-keybind';
import { CuratePage, CuratePageProps } from '../components/pages/CuratePage';
import { withConfirmDialog, WithConfirmDialogProps } from './withConfirmDialog';
import { withCurateState, WithCurateStateProps } from './withCurateState';
import { withMainState, WithMainStateProps } from './withMainState';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withTagCategories, WithTagCategoriesProps } from './withTagCategories';
import { withTasks, WithTasksProps } from './withTasks';

export type ConnectedCuratePageProps = Subtract<CuratePageProps, WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithCurateStateProps & WithConfirmDialogProps & WithTasksProps>;

export const ConnectedCuratePage = withShortcut(withTasks(withTagCategories(withPreferences(withMainState(withCurateState(withConfirmDialog(CuratePage)))))));
