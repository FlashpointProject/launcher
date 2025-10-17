import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { calcScale } from '@shared/Util';
import React, { useEffect, useRef, useState } from 'react';
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
  // eslint-disable-next-line react/no-unused-prop-types
  type: 'submenu';
  label: string;
  enabled?: boolean;
  submenu: MenuItemType[];
}

function stopMenuClosure(event: React.MouseEvent) {
  event.stopPropagation();
}

export function MenuItemSubmenuComponent(props: MenuItemSubmenu) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsSubmenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsSubmenuOpen(false);
    }, 150); // Small delay to prevent flickering
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`menu-item menu-submenu ${props.enabled === false ? 'menu-item--disabled menu-submenu--disabled' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={stopMenuClosure}
    >
      <div className='menu-item-label'>
        {props.label}
      </div>
      <div className='menu-submenu-arrow'>▶</div>
      {isSubmenuOpen && props.enabled !== false && (
        <div
          ref={submenuRef}
          className='menu-submenu-container'
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Menu items={props.submenu} />
        </div>
      )}
    </div>
  );
}

export function MenuItem(props: MenuItemType) {
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
        <></>
        // <MenuItemSubmenuComponent {...props}/>
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
