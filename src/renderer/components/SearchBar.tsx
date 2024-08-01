import * as React from 'react';
import { useDispatch } from 'react-redux';
import { GameOrder } from './GameOrder';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';
import { useView } from '@renderer/hooks/search';
import { forceSearch, setAdvancedFilter, setOrderBy, setOrderReverse, setSearchText } from '@renderer/store/search/slice';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized-reactv17';
import { AdvancedFilter } from 'flashpoint-launcher';
import { useContext, useMemo } from 'react';
import { LangContext } from '@renderer/util/lang';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { getPlatformIconURL } from '@renderer/Util';

export function SearchBar() {
  const view = useView();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = React.useState(true);
  const strings = useContext(LangContext);
  const mainState = useAppSelector((state) => state.main);

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

  const onToggleFactory = (key: keyof AdvancedFilter) => {
    return (value: string) => {
      let newValues = [...(view.advancedFilter[key] as string[])];
      const idx = newValues.findIndex(s => s === value);
      if (idx > -1) {
        newValues.splice(idx, 1);
      } else {
        // None is mutually exclusive to every other value
        if (value === '') {
          newValues = [value];
        } else {
          const noneIdx = newValues.findIndex(s => s === '');
          if (noneIdx > -1) {
            newValues.splice(noneIdx, 1);
          }
          newValues.push(value);
        }
      }

      dispatch(setAdvancedFilter({
        view: view.id,
        filter: {
          ...view.advancedFilter,
          [key]: newValues,
        }
      }));
    };
  };

  const onClearFactory = (key: keyof AdvancedFilter) => {
    return () => {
      dispatch(setAdvancedFilter({
        view: view.id,
        filter: {
          ...view.advancedFilter,
          [key]: [],
        }
      }));
    };
  };

  const onToggleLibrary = onToggleFactory('library');
  const onClearLibraries = onClearFactory('library');

  const onTogglePlayMode = onToggleFactory('playMode');
  const onClearPlayMode = onClearFactory('playMode');

  const onTogglePlatform = onToggleFactory('platform');
  const onClearPlatform = onClearFactory('platform');

  const simpleSelectItems = (values: string[]): SearchableSelectItem[] => {
    return values.map(v => ({
      value: v,
      orderVal: v,
    }));
  };

  const libraryItems = useMemo(() => simpleSelectItems(mainState.libraries), [mainState.libraries]);
  const playModeItems = useMemo(() => simpleSelectItems(mainState.suggestions.playMode), [mainState.suggestions.playMode]);
  const platformItems = useMemo(() => simpleSelectItems(mainState.suggestions.platforms), [mainState.suggestions.platforms]);

  const platformLabelRenderer = (item: SearchableSelectItem) => {
    const platformIcon = getPlatformIconURL(item.value, mainState.logoVersion);

    return (
      <div className='platform-label-row'>
        <div
          className="dropdown-icon dropdown-icon-image"
          style={{ backgroundImage: `url('${platformIcon}')` }}/>
        <div className="searchable-select-dropdown-item-title">
          {item.value}
        </div>
      </div>
    );
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
          placeholder={strings.app.searchPlaceholder}
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
        {/* <SimpleButton */}
        {/*   style={{ height: '100%' }} */}
        {/*   value={expanded ? 'Hide Filters' : 'Show Filters'} */}
        {/*   onClick={() => setExpanded(!expanded)}/> */}
      </div>
      { expanded &&
         (
           <div className='search-bar-expansion search-bar-expansion-simple'>
             <ThreeStateCheckbox
               title={strings.browse.installed}
               value={view.advancedFilter.installed}
               onChange={onInstalledChange}/>
             { view.selectedPlaylist && (
               <ThreeStateCheckbox
                 title={strings.browse.usePlaylistOrder}
                 value={view.advancedFilter.playlistOrder}
                 twoState={true}
                 onChange={onPlaylistOrderChange}/>
             )}
             { window.Shared.preferences.data.useCustomViews && (
               <SearchableSelect
                 title={strings.browse.library}
                 items={libraryItems}
                 selected={view.advancedFilter.library}
                 onToggle={onToggleLibrary}
                 onClear={onClearLibraries}
                 mapName={(item) => {
                   return strings.libraries[item] || item;
                 }}/>
             )}
             <SearchableSelect
               title={strings.browse.playMode}
               items={playModeItems}
               selected={view.advancedFilter.playMode}
               onToggle={onTogglePlayMode}
               onClear={onClearPlayMode} />
             <SearchableSelect
               title={strings.browse.platform}
               items={platformItems}
               labelRenderer={platformLabelRenderer}
               selected={view.advancedFilter.platform}
               onToggle={onTogglePlatform}
               onClear={onClearPlatform} />
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

type SearchableSelectProps<T extends SearchableSelectItem> = {
  title: string;
  items: T[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  mapName?: (name: string) => string;
  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
}

type SearchableSelectItem = {
  value: string;
  orderVal: string;
}

function SearchableSelect<T extends SearchableSelectItem>(props: SearchableSelectProps<T>) {
  const { title, items, selected, onToggle, onClear, mapName, labelRenderer } = props;
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
            items={items.sort((a, b) => a.orderVal.localeCompare(b.orderVal))}
            onToggle={onToggle}
            selected={selected}
            mapName={mapName}
            labelRenderer={labelRenderer}
          />
        )}
      </div>
    </div>
  );
}

type SearchableSelectDropdownProps<T extends SearchableSelectItem> = {
  items: T[];
  selected: string[];

  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
  mapName?: (id: string) => string;
  onToggle: (item: string) => void;
}

function SearchableSelectDropdown<T extends SearchableSelectItem>(props: SearchableSelectDropdownProps<T>) {
  const { items, selected, onToggle, mapName, labelRenderer } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [search, setSearch] = React.useState('');
  const [storedItems, setStoredItems] = React.useState(items); // 'cache' the items

  // Split the items into 2 halves - Selected and not selected, then merge

  const filteredItems = React.useMemo(() => {
    const lowerSearch = search.toLowerCase().replace(' ', '');

    return [
      ...storedItems.filter((item) => selected.includes(item.value) && item.orderVal.toLowerCase().includes(lowerSearch)),
      ...storedItems.filter((item) => !selected.includes(item.value) && item.orderVal.toLowerCase().includes(lowerSearch)),
    ];
  }, [search, storedItems]);

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

    const marked = selected.includes(item.value);

    if (labelRenderer !== undefined) {
      return (
        <div
          style={style}
          title={item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal ) : 'None'}
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'}`}
          onClick={() => onToggle(item.value)}
          key={item.value}>
          {labelRenderer(item, marked)}
          { marked && (
            <div className="searchable-select-dropdown-item-marked">
              <OpenIcon icon='check'/>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          style={style}
          title={item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal ) : 'None'}
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'}`}
          onClick={() => onToggle(item.value)}
          key={item.value}>
          <div className="searchable-select-dropdown-item-title">
            {item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal ) : <i>None</i>}
          </div>
          { marked && (
            <div className="searchable-select-dropdown-item-marked">
              <OpenIcon icon='check'/>
            </div>
          )}
        </div>
      );
    }


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
