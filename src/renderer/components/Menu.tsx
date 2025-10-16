import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { calcScale } from '@shared/Util';
import React from 'react';
import { SizeProvider } from './SizeProvider';

export type MenuProps = {
  items: MenuItemType[];
};

export type MenuItemType = MenuItemSeperator | MenuItemButton | MenuItemSubmenu;

export type MenuItemSeperator = {
  type: 'seperator';
};

export type MenuItemButton = {
  type: 'button';
  label: string;
  enabled?: boolean;
  onClick: () => void;
}

export type MenuItemSubmenu = {
  type: 'submenu';
  items: MenuItemType[];
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
    case 'seperator': {
      return (
        <div className='menu-seperator-wrapper'>
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
  const menuItemSize = Math.floor(calcScale(12, 36, scale));

  return (
    <SizeProvider height={menuItemSize}>
      <div className='menu'>
        {props.items.map(MenuItem)}
      </div>
    </SizeProvider>
  );
}
