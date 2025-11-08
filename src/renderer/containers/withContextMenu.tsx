import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { Subtract } from '@shared/interfaces';
import { MenuContextStateProps } from 'flashpoint-launcher-renderer';

export function withContextMenu<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, MenuContextStateProps>) => {
    const state = useContextMenu();
    return <Component
      {...state}
      {...props as P}/>;
  };
}
