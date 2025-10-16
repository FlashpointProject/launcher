import { Menu, MenuProps } from '@renderer/components/Menu';
import React, { createContext, useEffect, useRef, useState } from 'react';

type MenuContextStateProps = {
  menu?: MenuProps;
  openMenu: (menu: MenuProps, pointer: Pointer) => void;
  closeMenu: () => void;
};

type MenuContextProps = {
  children?: React.ReactNode;
}

export type Pointer = {
  x: number;
  y: number;
}

export const MenuContext = createContext<MenuContextStateProps>({
  openMenu: () => {},
  closeMenu: () => {}
});

export function MenuProvider({ children }: MenuContextProps) {
  const [menu, setMenu] = useState<MenuProps>();
  const [pointer, setPointer] = useState<Pointer>();
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (newMenu: MenuProps, newPointer: Pointer) => {
    setMenu(newMenu);
    setPointer(newPointer);
  };

  const closeMenu = () => {
    setMenu(undefined);
    setPointer(undefined);
  };

  useEffect(() => {
    if (menu && menuRef.current) {
      menuRef.current.focus();
    }
  }, [menu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (menu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menu]);

  return (
    <MenuContext.Provider value={{
      menu,
      openMenu,
      closeMenu,
    }}>
      {children}
      { menu !== undefined && pointer !== undefined && (
        <div
          className='context-menu'
          ref={menuRef}
          style={{ top: pointer.y, left: pointer.x }}
          onClick={closeMenu}
          tabIndex={-1}>
          <Menu {...menu} />
        </div>
      )}
    </MenuContext.Provider>
  );
}

export function getPointer(event: React.MouseEvent): Pointer {
  return {
    x: event.pageX,
    y: event.pageY
  };
}
