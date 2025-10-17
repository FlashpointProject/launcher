import { MenuContextStateProps } from '@renderer/context/MenuContext';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { Subtract } from '@shared/interfaces';

export function withContextMenu<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, MenuContextStateProps>) => {
    const state = useContextMenu();
    return <Component
      {...state}
      {...props as P}/>;
  };
}
