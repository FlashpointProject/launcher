import { RightBrowseSidebar, RightBrowseSidebarProps } from './RightBrowseSidebar';

export type FpfssEditGameProps = RightBrowseSidebarProps;

export function FpfssEditGame(props: FpfssEditGameProps) {
  return (
    <RightBrowseSidebar
      {...props}
      fpfssEditMode={true} />
  );
}
