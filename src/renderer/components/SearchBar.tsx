import { useView } from '@renderer/hooks/search';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { forceSearch, setAdvancedFilter, setExpanded, setOrderBy, setOrderReverse, setSearchText } from '@renderer/store/search/slice';
import { getPlatformIconURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { getDefaultAdvancedFilter } from '@shared/search/util';
import { formatString } from '@shared/utils/StringFormatter';
import { AdvancedFilter, AdvancedFilterAndToggles, AdvancedFilterToggle, Tag } from 'flashpoint-launcher';
import * as React from 'react';
import { useContext, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AutoSizer, List, ListRowProps } from 'react-virtualized-reactv17';
import { GameOrder } from './GameOrder';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

export const categoryOrder = [
  'genre',
  'theme',
  'meta',
  'presence',
  'warning',
  'copyright',
  'default',
];

export function SearchBar() {
  const view = useView();
  const dispatch = useDispatch();
  const strings = useContext(LangContext);
  const { main: mainState, tagCategories, search } = useAppSelector((state) => state);
  const [shiftHeld, setShiftHeld] = useState(false);

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
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyF') {
      const element = searchInputRef.current;
      if (element) {
        element.select();
        event.preventDefault();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD') {
      event.preventDefault();
      if (event.shiftKey) {
        dispatch(setAdvancedFilter({
          view: view.id,
          filter: getDefaultAdvancedFilter(),
        }));
      }
      dispatch(setSearchText({
        view: view.id,
        text: ''
      }));
      dispatch(forceSearch({
        view: view.id
      }));
      const element = searchInputRef.current;
      if (element) {
        element.select();
      }
    }
  };

  React.useEffect(() => {
    window.addEventListener('keypress', onKeypress);

    return () => {
      window.removeEventListener('keypress', onKeypress);
    };
  }, []);

  const onToggleExpanded = (value: boolean) => {
    dispatch(setExpanded({
      view: view.id,
      expanded: value
    }));
  }

  const onInstalledChange = (value?: boolean) => {
    dispatch(setAdvancedFilter({
      view: view.id,
      filter: {
        ...view.advancedFilter,
        installed: value,
      }
    }));
  };

  const onLegacyChange = (value?: boolean) => {
    dispatch(setAdvancedFilter({
      view: view.id,
      filter: {
        ...view.advancedFilter,
        legacy: value,
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

  const onWhitelistFactory = (key: keyof AdvancedFilter) => {
    return (value: string) => {
      console.log(`${key}: ${value} - whitelist`);
      const existingFilter = view.advancedFilter[key] as Record<string, AdvancedFilterToggle>;
      let newValues = {
        ...existingFilter
      };
      if (value in newValues) {
        if (newValues[value] === 'blacklist') {
          newValues[value] = 'whitelist';
        } else {
          delete newValues[value];
        }
      } else {
        newValues[value] = 'whitelist';
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

  const onBlacklistFactory = (key: keyof AdvancedFilter) => {
    return (value: string) => {
      console.log(`${key}: ${value} - blacklist`);
      const existingFilter = view.advancedFilter[key] as Record<string, AdvancedFilterToggle>;
      let newValues = {
        ...existingFilter
      };
      if (value in newValues) {
        if (newValues[value] === 'whitelist') {
          newValues[value] = 'blacklist';
        } else {
          delete newValues[value];
        }
      } else {
        newValues[value] = 'blacklist';
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

  const onSetAndToggleFactory = (key: keyof AdvancedFilter) => {
    return (value: boolean) => {
      dispatch(setAdvancedFilter({
        view: view.id,
        filter: {
          ...view.advancedFilter,
          andToggles: {
            ...view.advancedFilter.andToggles,
            [key as keyof AdvancedFilterAndToggles]: value
          }
        }
      }));
    };
  }

  const onWhitelistLibrary = onWhitelistFactory('library');
  const onBlacklistLibrary = onBlacklistFactory('library');
  const onClearLibraries = onClearFactory('library');
  const onSetAndToggleLibrary = onSetAndToggleFactory('library');

  const onWhitelistPlayMode = onWhitelistFactory('playMode');
  const onBlacklistPlayMode = onBlacklistFactory('playMode');
  const onClearPlayMode = onClearFactory('playMode');
  const onSetAndTogglePlayMode = onSetAndToggleFactory('playMode');
  
  const onWhitelistDeveloper = onWhitelistFactory('developer');
  const onBlacklistDeveloper = onBlacklistFactory('developer');
  const onClearDeveloper = onClearFactory('developer');
  const onSetAndToggleDeveloper = onSetAndToggleFactory('developer');
  
  const onWhitelistPublisher = onWhitelistFactory('publisher');
  const onBlacklistPublisher = onBlacklistFactory('publisher');
  const onClearPublisher = onClearFactory('publisher');
  const onSetAndTogglePublisher = onSetAndToggleFactory('publisher');

  const onWhitelistSeries = onWhitelistFactory('series');
  const onBlacklistSeries = onBlacklistFactory('series');
  const onClearSeries = onClearFactory('series');
  const onSetAndToggleSeries = onSetAndToggleFactory('series');

  const onWhitelistPlatform = onWhitelistFactory('platform');
  const onBlacklistPlatform = onBlacklistFactory('platform');
  const onClearPlatforms = onClearFactory('platform');
  const onSetAndTogglePlatform = onSetAndToggleFactory('platform');

  const onWhitelistTag = onWhitelistFactory('tags');
  const onBlacklistTag = onBlacklistFactory('tags');
  const onClearTags = onClearFactory('tags');
  const onSetAndToggleTags = onSetAndToggleFactory('tags');

  const onWhitelistRuffleSupport = onWhitelistFactory('ruffleSupport');
  const onBlacklistRuffleSupport = onBlacklistFactory('ruffleSupport');
  const onClearRuffleSupport = onClearFactory('ruffleSupport');
  const onSetAndToggleRuffleSupport = onSetAndToggleFactory('ruffleSupport');

  const simpleSelectItems = (values: string[] | null): SearchableSelectItem[] => {
    return values ? values.map(v => ({
      value: v,
      orderVal: v,
    })) : [];
  };

  const libraryItems = useMemo(() => simpleSelectItems(mainState.libraries), [mainState.libraries]);
  const playModeItems = useMemo(() => simpleSelectItems(mainState.suggestions.playMode), [mainState.suggestions.playMode]);
  const platformItems = useMemo(() => simpleSelectItems(mainState.suggestions.platforms), [mainState.suggestions.platforms]);
  const developerItems = useMemo(() => simpleSelectItems(search.dropdowns.developers), [search.dropdowns.developers]);
  const publisherItems = useMemo(() => simpleSelectItems(search.dropdowns.publishers), [search.dropdowns.publishers]);
  const seriesItems = useMemo(() => simpleSelectItems(search.dropdowns.series), [search.dropdowns.series]);
  const ruffleSupportItems: SearchableSelectItem[] = [{
    value: '',
    orderVal: ''
  }, {
    value: 'standalone',
    orderVal: 'Standalone'
  }];
  const tagItems = useMemo((): TagSelectItem[] => {
    if (search.dropdowns.tags) {
      return search.dropdowns.tags.map(tag => {
        const categoryId = tag.category ? categoryOrder.indexOf(tag.category) : 99999;
        return {
          value: tag.name,
          orderVal: `${categoryId} ${tag.name} ${tag.aliases.join((' '))}`,
          tag: tag,
        }
      });
    } else {
      return [];
    }
  }, [search.dropdowns.tags]);

  const genSelectItem = (missing: string): SearchableSelectItem => {
    return {
      value: missing,
      orderVal: `zzzzzzz${missing}`,
    };
  }

  const genTagItem = (missing: string): TagSelectItem => {
    return {
      tag: {
        id: -1,
        name: missing,
        category: 'default',
        dateModified: '',
        aliases: [missing],
        description: '',
      },
      orderVal: `zzzzzzz${missing}`,
      value: missing,
    };
  }

  const platformLabelRenderer = (item: SearchableSelectItem) => {
    const platformIcon = getPlatformIconURL(item.value, mainState.logoVersion);

    return (
      <div className='platform-label-row'>
        <div
          className="dropdown-icon dropdown-icon-image"
          style={{ backgroundImage: `url('${platformIcon}')` }} />
        <div className="searchable-select-dropdown-item-title">
          {item.value}
        </div>
      </div>
    );
  };

  const tagLabelRenderer = (item: TagSelectItem) => {
    const category = tagCategories.find(t => t.name === item.tag.category);

    return (
      <div className='platform-label-row'>
        <div
          className="dropdown-icon dropdown-icon-image">
          <OpenIcon
            className='curate-tag__icon'
            color={category ? category.color : '#FFFFFF'}
            icon='tag' />
        </div>
        <div className="searchable-select-dropdown-item-title">
          {item.tag.name}
        </div>
      </div>
    );
  };

  const onClearSearch = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.shiftKey) {
      dispatch(setAdvancedFilter({
        view: view.id,
        filter: getDefaultAdvancedFilter(),
      }));
    }
    dispatch(setSearchText({
      view: view.id,
      text: ''
    }));
    dispatch(forceSearch({
      view: view.id
    }));
  };

  // Force focus search when coming into view
  React.useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [view.id]);

  return (
    <div className='search-bar-wrapper search-bar-wrapper--expanded-simple'>
      <div className="search-bar">
        <div className="search-bar-icon">
          <OpenIcon icon='magnifying-glass' />
        </div>
        <div className='search-bar-text-input-wrapper'>
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
            className='search-bar-text-input'
            value={view.text}
            onChange={onTextChange} />
            <div 
              className="search-bar-text-input-icon"
              onClick={onClearSearch}>
              <OpenIcon icon='circle-x'/>
            </div>
        </div>
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
          }} />
        <SimpleButton
          style={{ height: '100%' }}
          value={view.expanded ? strings.browse.hideFilters : strings.browse.showFilters }
          onClick={() => onToggleExpanded(!view.expanded)} />
      </div>
      {view.expanded && (
        <div className='search-bar-expansion search-bar-expansion-simple'>
          <ThreeStateCheckbox
            title={strings.browse.installed}
            value={view.advancedFilter.installed}
            onChange={onInstalledChange} />
          {window.Shared.preferences.data.enableEditing && (
            <ThreeStateCheckbox
              title={strings.browse.legacyGame}
              value={view.advancedFilter.legacy}
              onChange={onLegacyChange} />
          )}
          {view.selectedPlaylist && (
            <ThreeStateCheckbox
              title={strings.browse.usePlaylistOrder}
              value={view.advancedFilter.playlistOrder}
              twoState={true}
              onChange={onPlaylistOrderChange} />
          )}
          {window.Shared.preferences.data.useCustomViews && (
            <SearchableSelect
              title={strings.browse.library}
              items={libraryItems}
              andToggle={view.advancedFilter.andToggles.library}
              selected={view.advancedFilter.library}
              generateItem={genSelectItem}
              onWhitelist={onWhitelistLibrary}
              onBlacklist={onBlacklistLibrary}
              onClear={onClearLibraries}
              onSetAndToggle={onSetAndToggleLibrary}
              mapName={(item) => {
                return strings.libraries[item] || item;
              }} />
          )}
          <SearchableSelect
            title={strings.browse.ruffleSupport}
            items={ruffleSupportItems}
            andToggle={view.advancedFilter.andToggles.ruffleSupport}
            selected={view.advancedFilter.ruffleSupport}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistRuffleSupport}
            onBlacklist={onBlacklistRuffleSupport}
            onClear={onClearRuffleSupport}
            onSetAndToggle={onSetAndToggleRuffleSupport} />
          <SearchableSelect
            title={strings.app.developer}
            items={developerItems}
            andToggle={view.advancedFilter.andToggles.developer}
            selected={view.advancedFilter.developer}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistDeveloper}
            onBlacklist={onBlacklistDeveloper}
            onClear={onClearDeveloper}
            onSetAndToggle={onSetAndToggleDeveloper} />
          <SearchableSelect
            title={strings.browse.publisher}
            items={publisherItems}
            andToggle={view.advancedFilter.andToggles.publisher}
            selected={view.advancedFilter.publisher}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistPublisher}
            onBlacklist={onBlacklistPublisher}
            onClear={onClearPublisher}
            onSetAndToggle={onSetAndTogglePublisher} />
          <SearchableSelect
            title={strings.browse.series}
            items={seriesItems}
            andToggle={view.advancedFilter.andToggles.series}
            selected={view.advancedFilter.series}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistSeries}
            onBlacklist={onBlacklistSeries}
            onClear={onClearSeries}
            onSetAndToggle={onSetAndToggleSeries} />
          <SearchableSelect
            title={strings.browse.playMode}
            items={playModeItems}
            andToggle={view.advancedFilter.andToggles.playMode}
            selected={view.advancedFilter.playMode}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistPlayMode}
            onBlacklist={onBlacklistPlayMode}
            onClear={onClearPlayMode}
            onSetAndToggle={onSetAndTogglePlayMode} />
          <SearchableSelect
            title={strings.browse.platform}
            items={platformItems}
            andToggle={view.advancedFilter.andToggles.platform}
            labelRenderer={platformLabelRenderer}
            selected={view.advancedFilter.platform}
            generateItem={genSelectItem}
            onWhitelist={onWhitelistPlatform}
            onBlacklist={onBlacklistPlatform}
            onClear={onClearPlatforms}
            onSetAndToggle={onSetAndTogglePlatform} />
          <SearchableSelect
            title={strings.browse.tags}
            items={tagItems}
            andToggle={view.advancedFilter.andToggles.tags}
            labelRenderer={tagLabelRenderer}
            selected={view.advancedFilter.tags}
            generateItem={genTagItem}
            onWhitelist={onWhitelistTag}
            onBlacklist={onBlacklistTag}
            onClear={onClearTags}
            onSetAndToggle={onSetAndToggleTags} />
        </div>
      )}
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
        {value === true && <OpenIcon icon='check' />}
        {value === false && <OpenIcon icon='x' />}
        {value === undefined && <div></div>}
      </div>
    </div>
  );
}

type SearchableSelectProps<T extends SearchableSelectItem> = {
  title: string;
  items: T[];
  andToggle: boolean;
  selected: Record<string, AdvancedFilterToggle>;
  onWhitelist: (value: string) => void;
  onBlacklist: (value: string) => void;
  onClear: () => void;
  onSetAndToggle: (value: boolean) => void;
  mapName?: (name: string) => string;
  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
  generateItem: (missing: string) => T;
}

type SearchableSelectItem = {
  value: string;
  orderVal: string;
}

type TagSelectItem = {
  tag: Tag;
} & SearchableSelectItem;

function SearchableSelect<T extends SearchableSelectItem>(props: SearchableSelectProps<T>) {
  const { title, items, selected, andToggle, onWhitelist, onBlacklist, onClear, onSetAndToggle, mapName, labelRenderer } = props;
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

  const orderedItems = useMemo(() => {
    const newItems = [...items];
    const missingItems = { ...selected };
    for (const item of newItems) {
      if (item.value in missingItems) {
        delete missingItems[item.value];
      }
    }
    for (const missingItem of Object.keys(missingItems)) {
      newItems.push(props.generateItem(missingItem));
    }
    return newItems.sort((a, b) => a.orderVal.localeCompare(b.orderVal));
  }, [items, selected]);

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
          {Object.keys(selected).length > 0 && (
            <div className="searchable-select-number">{Object.keys(selected).length}</div>
          )}
          <div className="searchable-select-chevron">
            {expanded ? (
              <OpenIcon icon='chevron-top' />
            ) : (
              <OpenIcon icon='chevron-bottom' />
            )}
          </div>
        </div>
        {expanded && (
          <SearchableSelectDropdown
            items={orderedItems}
            andToggle={andToggle}
            onWhitelist={onWhitelist}
            onBlacklist={onBlacklist}
            selected={selected}
            mapName={mapName}
            onSetAndToggle={onSetAndToggle}
            labelRenderer={labelRenderer}
          />
        )}
      </div>
    </div>
  );
}

type SearchableSelectDropdownProps<T extends SearchableSelectItem> = {
  items: T[];
  andToggle: boolean;
  selected: Record<string, AdvancedFilterToggle>;
  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
  mapName?: (id: string) => string;
  onWhitelist: (item: string) => void;
  onBlacklist: (item: string) => void;
  onSetAndToggle: (value: boolean) => void;
}

const reservedKeys = ["Shift", "Control", "Escape", "Alt", "AltGraph", "Super", "Hyper"];

function SearchableSelectDropdown<T extends SearchableSelectItem>(props: SearchableSelectDropdownProps<T>) {
  const strings = useContext(LangContext);
  const { items, selected, onWhitelist, onBlacklist, mapName, labelRenderer } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [search, setSearch] = React.useState('');
  const [storedItems, setStoredItems] = React.useState(items); // 'cache' the items
  const [selectedIndex, setSelectedIndex] = React.useState(-1); // Track the selected index

  // Split the items into 2 halves - Selected and not selected, then merge

  const filteredItems = React.useMemo(() => {
    const lowerSearch = search.toLowerCase().replace(/\s+/g, '');
    const selectedItems = storedItems.filter((item) => item.value in selected);
    selectedItems.sort((a, b) => {
      if (selected[a.value] === 'whitelist' && selected[b.value] === 'blacklist') {
        return 1;
      }
      if (selected[b.value] === 'whitelist' && selected[a.value] === 'blacklist') {
        return -1;
      }
      return a.value.toLowerCase().localeCompare(b.value.toLowerCase());
    })

    return [
      ...selectedItems,
      ...storedItems.filter((item) => !(item.value in selected) && item.orderVal.toLowerCase().replace(/\s+/g, '').includes(lowerSearch)),
    ];
  }, [search, storedItems]);

  // Handle arrow key navigation when the input field is focused
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      // Move selection down
      setSelectedIndex((prevIndex) => {
        let newIndex = prevIndex + 1;
        if (newIndex > filteredItems.length - 1) {
          newIndex = 0;
        }
        return newIndex;
      });
      event.preventDefault(); // Prevent default input behavior
    } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      // Move selection up
      setSelectedIndex((prevIndex) => {
        let newIndex = prevIndex - 1;
        if (newIndex < 0) {
          newIndex = filteredItems.length - 1;
        }
        return newIndex;
      });
      event.preventDefault(); // Prevent default input behavior
    } else if (event.key === 'Enter') {
      // Select the currently highlighted item
      const item = filteredItems[selectedIndex];
      if (item) {
        if (item.value in selected) {
          onBlacklist(item.value); // This will cycle from white -> black and black -> none
        } else {
          onWhitelist(item.value);
        }
      }
      event.preventDefault(); // Prevent form submission or other default behavior
    } else if (!reservedKeys.includes(event.key)) {
      // Search has changed, clear
      setSelectedIndex(-1);
    }
  };

  // Update the stored items when all selections removed
  // Too difficult to do this any other way
  React.useEffect(() => {
    if (Object.keys(selected).length === 0) {
      setStoredItems(items);
    }
  }, [items]);

  const handleItemClick = (itemValue: string, index: number) => {
    onWhitelist(itemValue); 
    // Always make sure the input is focused
    inputRef.current?.focus();
    // Update the selected index
    setSelectedIndex(index);
  };

  const handleItemContextMenu = (event: React.MouseEvent, itemValue: string, index: number) => {
    event.stopPropagation(); // Prevent onClear getting hit above
    onBlacklist(itemValue); 
    // Always make sure the input is focused
    inputRef.current?.focus();
    // Update the selected index
    setSelectedIndex(index);
  };

  const rowRenderer = (props: ListRowProps) => {
    const { style, index } = props;
    const item = filteredItems[props.index];

    const marked = item.value in selected;
    const isSelected = index === selectedIndex;

    if (labelRenderer !== undefined) {
      return (
        <div
          style={style}
          title={item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal) : 'None'}
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'} ${isSelected && 'searchable-select-dropdown-item--highlighted'}`}
          onClick={() => handleItemClick(item.value, index)}
          onContextMenu={(e) => handleItemContextMenu(e, item.value, index)}
          key={item.value}>
          {labelRenderer(item, marked)}
          {marked && (
            <div className="searchable-select-dropdown-item-marked">
              { selected[item.value] === 'whitelist' ? (
                <OpenIcon icon='check' />
              ) : (
                <OpenIcon icon='x' />
              )}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          style={style}
          title={item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal) : 'None'}
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'} ${isSelected && 'searchable-select-dropdown-item--highlighted'}`}
          onClick={() => handleItemClick(item.value, index)}
          onContextMenu={(e) => handleItemContextMenu(e, item.value, index)}
          key={item.value}>
          <div className="searchable-select-dropdown-item-title">
            {item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal) : <i>None</i>}
          </div>
          {marked && (
            <div className="searchable-select-dropdown-item-marked">
              { selected[item.value] === 'whitelist' ? (
                <OpenIcon icon='check' />
              ) : (
                <OpenIcon icon='x' />
              )}
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

  const searchPlaceholder = formatString(strings.app.searchPlaceholderCountable, props.items.length.toLocaleString()) as string;

  return (
    <div
      onClick={(event) => {
        // Prevent bubble up
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        // Prevent bubble up
        event.stopPropagation();
      }}
      onKeyDown={handleInputKeyDown}
      className="searchable-select-dropdown">
      <div className='searchable-select-dropdown-upper'>
        <input
          ref={inputRef}
          className="searchable-select-dropdown-search-bar"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => setSearch(event.currentTarget.value)} />
        <SimpleButton
          className='searchable-select-dropdown-toggle'
          onClick={() => props.onSetAndToggle(!props.andToggle)}
          value={props.andToggle ? strings.misc.andCapitals : strings.misc.orCapitals } />
      </div>
      <div className="searchable-select-dropdown-results simple-scroll">
        <AutoSizer>
          {({ width, height }) => {
            return (
              <List
                className="simple-scroll"
                width={width}
                height={height}
                overscanRowCount={20}
                rowCount={filteredItems.length}
                rowHeight={30}
                rowRenderer={rowRenderer}
                scrollToIndex={selectedIndex}
              />
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
