import { LeftSidebarItem, LeftSidebarProps } from 'flashpoint-launcher-renderer';
import { List, RowComponentProps } from 'react-window';
import { InputField } from './InputField';
import { SizeProvider } from './SizeProvider';

export function LeftSidebar({ items, selected, onSelect, rowHeight, header, cssKey }: LeftSidebarProps) {
  return (
    <div className={`sidebar leftsidebar${cssKey ? ` sidebar--${cssKey}` : '' }`}>
      { header && <div className={`sidebar-header${cssKey ? ` sidebar-header--${cssKey}` : '' }`}>{header}</div> }
      <SizeProvider height={rowHeight}>
        <List
          rowComponent={LeftSidebarRow}
          rowCount={items.length}
          rowProps={{
            items,
            selected,
            onSelect
          }}
          rowHeight={rowHeight}
          overscanCount={10}/>
      </SizeProvider>
    </div>
  );
}

type LeftSidebarRowProps = {
  items: LeftSidebarItem[];
  selected?: string;
  onSelect?: (key: string) => void;
}

function LeftSidebarRow({ items, selected, onSelect, index, style }: RowComponentProps<LeftSidebarRowProps>) {
  const { key, title, icon } = items[index];
  let className = 'leftsidebar-item';
  if (key === selected) { className += ' leftsidebar-item--selected'; }
  let titleClassName = 'leftsidebar-item-title';
  if (key === selected) { titleClassName += ' leftsidebar-item-title--selected'; }

  return (
    <>
      <div
        className={className}
        style={style}>
        {/* Drag Overlay */}
        <div className='playlist-list-item__drag-overlay' />
        {/* Head */}
        <div
          className='playlist-list-item__head'
          onClick={() => onSelect && onSelect(key)}>
          {/* Icon */}
          {icon}
          {/* Title */}
          <div className='playlist-list-item__title simple-center'>
            <InputField
              text={title}
              className={titleClassName}/>
          </div>
        </div>
      </div>
    </>
  );
}
