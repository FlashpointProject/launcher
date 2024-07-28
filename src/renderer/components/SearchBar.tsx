import * as React from 'react';
import { useDispatch } from 'react-redux';
import { GameOrder } from './GameOrder';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';
import { useView } from '@renderer/hooks/search';
import { forceSearch, setAdvancedFilter, setOrderBy, setOrderReverse, setSearchText } from '@renderer/store/search/slice';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized-reactv17';

export type SearchBarProps = {};

export function SearchBar(props: SearchBarProps) {
  const view = useView();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = React.useState(true);

  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchText({
      view: view.id,
      text: event.target.value
    }));
    if (event.target.value === '') {
      dispatch(forceSearch({
        view: view.id
      }));
    }
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const onKeypress = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.code === 'KeyF') {
      const element = searchInputRef.current;
      if (element) {
        element.select();
        event.preventDefault();
      }
    }
  };

  React.useEffect(() => {
    window.addEventListener('keypress', onKeypress);

    return () => {
      window.removeEventListener('keypress', onKeypress);
    };
  }, []);

  const onInstalledChange = (value?: boolean) => {
    dispatch(setAdvancedFilter({
      view: view.id,
      filter: {
        ...view.advancedFilter,
        installed: value,
      }
    }));
  };

  const onPlaylistOrderChange = (value?: boolean) => {
    dispatch(setAdvancedFilter({
      view: view.id,
      filter: {
        ...view.advancedFilter,
        playlistOrder: !!value,
      }
    }));
  };

  return (
    <div className={`search-bar-wrapper ${expanded ? 'search-bar-wrapper--expanded-simple' : ''}`}>
      <div className="search-bar">
        <div className="search-bar-icon">
          <OpenIcon icon='magnifying-glass'/>
        </div>
        <input
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              dispatch(forceSearch({
                view: view.id
              }));
            }
          }}
          ref={searchInputRef}
          placeholder="Search"
          className="search-bar-text-input"
          value={view.text}
          onChange={onTextChange} />
        <GameOrder
          orderBy={view.orderBy}
          orderReverse={view.orderReverse}
          onChange={(event) => {
            dispatch(setOrderBy({
              view: view.id,
              value: event.orderBy
            }));
            dispatch(setOrderReverse({
              view: view.id,
              value: event.orderReverse
            }));
          }}/>
        <SimpleButton
          style={{ height: '100%' }}
          value={expanded ? 'Hide Filters' : 'Show Filters'}
          onClick={() => setExpanded(!expanded)}/>
      </div>
      { expanded &&
         (
           <div className='search-bar-expansion search-bar-expansion-simple'>
             <ThreeStateCheckbox
               title="Installed"
               value={view.advancedFilter.installed}
               onChange={onInstalledChange}/>
             { view.selectedPlaylist && (
               <ThreeStateCheckbox
                 title="Use Playlist Order"
                 value={view.advancedFilter.playlistOrder}
                 twoState={true}
                 onChange={onPlaylistOrderChange}/>
             )}
           </div>
         )
      }
    </div>
  );
}

type ThreeStateCheckboxProps = {
  value?: boolean;
  title: string;
  twoState?: boolean;
  onChange: (value?: boolean) => void;
}

function ThreeStateCheckbox(props: ThreeStateCheckboxProps) {
  const { value, onChange, title, twoState } = props;

  const handleClick = () => {
    if (twoState) {
      if (value === true) {
        onChange(false);
      } else if (value === false) {
        onChange(true);
      }
    } else {
      if (value === true) {
        onChange(false);
      } else if (value === false) {
        onChange(undefined);
      } else {
        onChange(true);
      }
    }
  };

  // Cycles on left click, clears on right click
  return (
    <div className='search-bar-simple-box' onClick={handleClick}>
      <b>{title}</b>
      <div className='three-state-checkbox' onContextMenu={() => onChange(undefined)}>
        {value === true && <OpenIcon icon='check'/>}
        {value === false && <OpenIcon icon='x'/>}
        {value === undefined && <div></div>}
      </div>
    </div>
  );
}

type SearchableSelectProps = {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onClear: () => void;
}

function SearchableSelect(props: SearchableSelectProps) {
  const { title, items, selected, onToggle, onClear } = props;
  const [expanded, setExpanded] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const onToggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Close dropdown when clicking outside of it
  const handleClickOutside = (event: any) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpanded(false);
    }
  };

  React.useEffect(() => {
    // Add event listener to handle clicks outside the dropdown
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      className='search-bar-simple-box'
      onClick={onToggleExpanded}
      onContextMenu={onClear}>
      <div
        className="searchable-select"
        ref={dropdownRef}>
        <div className="searchable-select-header">
          <div className="searchable-select-title">{title}</div>
          { selected.length > 0 && (
            <div className="searchable-select-number">{selected.length}</div>
          )}
          <div className="searchable-select-chevron">
            { expanded ? (
              <OpenIcon icon='chevron-top'/>
            ) : (
              <OpenIcon icon='chevron-bottom'/>
            )}
          </div>
        </div>
        {expanded && (
          <SearchableSelectDropdown
            items={items}
            onToggle={onToggle}
            selected={selected}
          />
        )}
      </div>
    </div>
  );
}

type SearchableSelectDropdownProps = {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}

function SearchableSelectDropdown(props: SearchableSelectDropdownProps) {
  const { items, selected, onToggle } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [search, setSearch] = React.useState('');
  const [storedItems, setStoredItems] = React.useState(items); // 'cache' the items

  const filteredItems = React.useMemo(() => {
    const lowerSearch = search.toLowerCase().replace(' ', '');
    return storedItems.filter((item) => item.toLowerCase().replace(' ', '').includes(lowerSearch));
  }, [search, storedItems]);
  console.log(filteredItems);

  // Update the stored items when all selections removed
  // Too difficult to do this any other way
  React.useEffect(() => {
    if (selected.length === 0) {
      setStoredItems(items);
    }
  }, [items]);

  const rowRenderer = (props: ListRowProps) => {
    const { style } = props;
    const item = filteredItems[props.index];
    console.log(filteredItems[0]);

    const marked = selected.includes(item);

    return (
      <div
        style={style}
        title={item ? item : 'None'}
        className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'}`}
        onClick={() => onToggle(item)}
        key={item}>
        <div className="searchable-select-dropdown-item-title">
          {item ? item : <i>None</i>}
        </div>
        { marked && (
          <div className="searchable-select-dropdown-item-marked">
            <OpenIcon icon='check'/>
          </div>
        )}
      </div>
    );
  };

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div
      onClick={(event) => {
        // Prevent bubble up
        event.stopPropagation();
        event.preventDefault();
        return -1;
      }}
      className="searchable-select-dropdown">
      <input
        ref={inputRef}
        className="searchable-select-dropdown-search-bar"
        value={search}
        placeholder="Search"
        onChange={(event) => setSearch(event.currentTarget.value)}/>
      <div className="searchable-select-dropdown-results">
        <AutoSizer>
          {({ width, height }) => {
            return (
              <ArrowKeyStepper
                mode="cells"
                isControlled={true}
                columnCount={1}
                rowCount={filteredItems.length}
              >
                {({
                  onSectionRendered
                }) => (
                  <List
                    className="simple-scroll"
                    width={width}
                    height={height}
                    overscanRowCount={20}
                    rowCount={filteredItems.length}
                    rowHeight={30}
                    rowRenderer={rowRenderer}
                    onSectionRendered={onSectionRendered}
                  />
                )}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
