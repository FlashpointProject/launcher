import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { calcScale } from '@shared/Util';
import React from 'react';
import { SizeProvider } from './SizeProvider';
import { defaultMenuWidth, menuHeightMax, menuHeightMin } from '@renderer/context/MenuContext';

export type MenuProps = {
  items: MenuItemType[];
  width?: number;
};

export type MenuItemType = MenuItemseparator | MenuItemButton | MenuItemSubmenu;

export type MenuItemseparator = {
  type: 'separator';
};

export type MenuItemButton = {
  type: 'button';
  label: string;
  enabled?: boolean;
  onClick: () => void;
}

export type MenuItemSubmenu = {
  type: 'submenu';
  label: string;
  enabled?: boolean;
  submenu: MenuItemType[];
}

export function MenuItem(props: MenuItemType) {
  const stopMenuClosure = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  switch (props.type) {
    case 'button': {
      return (
        <div
          className={`menu-item menu-button ${props.enabled === false ? 'menu-item--disabled menu-button--disabled' : ''}`}
          onClick={(e) => {
            if (props.enabled !== false) {
              props.onClick();
            } else {
              // Don't close menu on disabled button
              stopMenuClosure(e);
            }
          }}>
          <div className='menu-item-label'>
            {props.label}
          </div>
        </div>
      );
    }
    case 'separator': {
      return (
        <div className='menu-separator-wrapper'>
          <hr onClick={stopMenuClosure} className="menu-separator" />
        </div>
      );
    }
    case 'submenu': {
      return (
        <div onClick={stopMenuClosure}>Unsupported Type</div>
      );
    }
    default: {
      return (
        <div onClick={stopMenuClosure}>Unsupported Type</div>
      );
    }
  }
}

export function Menu(props: MenuProps) {
  const scale = useAppSelector(state => state.preferences.scaleValues.menuItem);
  const menuItemHeight = Math.floor(calcScale(menuHeightMin, menuHeightMax, scale));
  const menuWidth = props.width ? props.width * (scale + 0.5) : defaultMenuWidth * (scale + 0.5);

  return (
    <SizeProvider width={menuWidth} height={menuItemHeight}>
      <div className='menu'>
        {props.items.map(MenuItem)}
      </div>
    </SizeProvider>
  );
}
