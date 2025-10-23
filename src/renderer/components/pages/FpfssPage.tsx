import { useView } from '@renderer/hooks/search';
import { RightBrowseSidebarFpfss } from '../RightBrowseSidebar';

export function FpfssPage() {
  const view = useView();

  return <RightBrowseSidebarFpfss view={view}/>;
}
