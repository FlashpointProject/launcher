import React from 'react';

export type MenuProps = {
  items: MenuItemProps[];
};

export type MenuItemProps = MenuItemSeperator | MenuItemButton | MenuItemSubmenu;

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
  items: MenuItemProps[];
}

export function MenuItem(props: MenuItemProps) {
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
          {props.label}
        </div>
      );
    }
    case 'seperator': {
      return (
        <hr onClick={stopMenuClosure} className="menu-separator" />
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
  return (
    <div className='menu'>
      {props.items.map(MenuItem)}
    </div>
  );
}
