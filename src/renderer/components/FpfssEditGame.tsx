import { withConfirmDialog } from '@renderer/containers/withConfirmDialog';
import { withPreferences } from '@renderer/containers/withPreferences';
import { withSearch } from '@renderer/containers/withSearch';
import { RightBrowseSidebar, RightBrowseSidebarProps } from './RightBrowseSidebar';
import { withMainState } from '@renderer/containers/withMainState';

export type FpfssEditGameProps = RightBrowseSidebarProps;

function FpfssEditGame(props: FpfssEditGameProps) {
  return (
    <RightBrowseSidebar
      {...props}
      fpfssEditMode={true} />
  );
}

export const ConnectedFpfssEditGame = withMainState(withConfirmDialog(withSearch(withPreferences(FpfssEditGame))));
