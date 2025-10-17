import { Menu, MenuProps } from '@renderer/components/Menu';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { calcScale } from '@shared/Util';
import React, { createContext, useEffect, useRef, useState } from 'react';

export const defaultMenuWidth = 220;
export const menuHeightMin = 14;
export const menuHeightMax = 38;

export type MenuContextStateProps = {
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
  const [style, setStyle] = useState<React.CSSProperties>();
  const menuRef = useRef<HTMLDivElement>(null);
  const scale = useAppSelector(state => state.preferences.scaleValues.menuItem);
  const menuItemHeight = Math.floor(calcScale(menuHeightMin, menuHeightMax, scale));

  const openMenu = (newMenu: MenuProps, pointer: Pointer) => {
    const availWidth = document.documentElement.clientWidth;
    const availHeight = document.documentElement.clientHeight;
    const menuWidth = newMenu.width ? newMenu.width * (scale + 0.5) : defaultMenuWidth * (scale + 0.5);

    // Calculate (ignoring rounding errors) pixel height of menu
    const menuHeight = 10 + Math.floor(newMenu.items.reduce((prev, cur) => {
      if (cur.type === 'submenu') {
        return prev;
      }
      if (cur.type !== 'separator') {
        return prev + menuItemHeight;
      }
      return prev + (menuItemHeight * 0.5);
    }, 0));

    const style: React.CSSProperties = {};
    // If there's not enough room, render above the cursor instead of below
    if (pointer.y + menuHeight > availHeight) {
      style.top = pointer.y - menuHeight;
    } else {
      style.top = pointer.y;
    }
    if (pointer.x + menuWidth > availWidth) {
      style.left = pointer.x - menuWidth;
    } else {
      style.left = pointer.x;
    }

    setStyle(style);
    setMenu(newMenu);
  };

  const closeMenu = () => {
    setMenu(undefined);
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
      { menu !== undefined && (
        <div
          className='context-menu'
          ref={menuRef}
          style={style}
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
