import { MenuContext } from '@renderer/context/MenuContext';
import { useContext } from 'react';

export function useContextMenu() {
  const context = useContext(MenuContext);
  return context;
}
