import { withConfirmDialog } from '@renderer/containers/withConfirmDialog';
import { withPreferences } from '@renderer/containers/withPreferences';
import { withSearch } from '@renderer/containers/withSearch';
import { RightBrowseSidebar, RightBrowseSidebarProps } from './RightBrowseSidebar';

export type FpfssEditGameProps = RightBrowseSidebarProps;

function FpfssEditGame(props: FpfssEditGameProps) {
  return (
    <RightBrowseSidebar
      {...props}/>
  );
}

export const ConnectedFpfssEditGame = withConfirmDialog(withSearch(withPreferences(FpfssEditGame)));
