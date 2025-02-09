import * as React from 'react';
import { useDispatch } from 'react-redux';
import { GameOrder } from './GameOrder';
import { OpenIcon } from './OpenIcon';
import { useView } from '@renderer/hooks/search';
import { forceSearch, setAdvancedFilter, setExpanded, setOrderBy, setOrderReverse, setSearchText } from '@renderer/store/search/slice';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized-reactv17';
import { AdvancedFilter, AdvancedFilterToggle, Tag } from 'flashpoint-launcher';
import { useContext, useMemo, useState } from 'react';
import { LangContext } from '@renderer/util/lang';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { getPlatformIconURL } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { SimpleButton } from './SimpleButton';
import { formatString } from '@shared/utils/StringFormatter';

export function SearchBar() {
  const view = useView();
  const dispatch = useDispatch();
  const strings = useContext(LangContext);
  const { main: mainState, tagCategories, search } = useAppSelector((state) => state);

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

  const onWhitelistLibrary = onWhitelistFactory('library');
  const onBlacklistLibrary = onBlacklistFactory('library');
  const onClearLibraries = onClearFactory('library');

  const onWhitelistPlayMode = onWhitelistFactory('playMode');
  const onBlacklistPlayMode = onBlacklistFactory('playMode');
  const onClearPlayMode = onClearFactory('playMode');
  
  const onWhitelistDeveloper = onWhitelistFactory('developer');
  const onBlacklistDeveloper = onBlacklistFactory('developer');
  const onClearDeveloper = onClearFactory('developer');
  
  const onWhitelistPublisher = onWhitelistFactory('publisher');
  const onBlacklistPublisher = onBlacklistFactory('publisher');
  const onClearPublisher = onClearFactory('publisher');

  const onWhitelistSeries = onWhitelistFactory('series');
  const onBlacklistSeries = onBlacklistFactory('series');
  const onClearSeries = onClearFactory('series');

  const onWhitelistPlatform = onWhitelistFactory('platform');
  const onBlacklistPlatform = onBlacklistFactory('platform');
  const onClearPlatforms = onClearFactory('platform');

  const onWhitelistTag = onWhitelistFactory('tags');
  const onBlacklistTag = onBlacklistFactory('tags');
  const onClearTags = onClearFactory('tags');

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
  const tagItems = useMemo((): TagSelectItem[] => {
    if (search.dropdowns.tags) {
      return search.dropdowns.tags.map(tag => ({
        value: tag.name,
        orderVal: `${tag.category} ${tag.name} ${tag.aliases.join((' '))}`,
        tag: tag,
      }));
    } else {
      return [];
    }
  }, [search.dropdowns.tags]);

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

  return (
    <div className='search-bar-wrapper search-bar-wrapper--expanded-simple'>
      <div className="search-bar">
        <div className="search-bar-icon">
          <OpenIcon icon='magnifying-glass' />
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
          <ThreeStateCheckbox
            title={strings.browse.legacyGame}
            value={view.advancedFilter.legacy}
            onChange={onLegacyChange} />
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
              selected={view.advancedFilter.library}
              onWhitelist={onWhitelistLibrary}
              onBlacklist={onBlacklistLibrary}
              onClear={onClearLibraries}
              mapName={(item) => {
                return strings.libraries[item] || item;
              }} />
          )}
          <SearchableSelect
            title={strings.app.developer}
            items={developerItems}
            selected={view.advancedFilter.developer}
            onWhitelist={onWhitelistDeveloper}
            onBlacklist={onBlacklistDeveloper}
            onClear={onClearDeveloper} />
          <SearchableSelect
            title={strings.browse.publisher}
            items={publisherItems}
            selected={view.advancedFilter.publisher}
            onWhitelist={onWhitelistPublisher}
            onBlacklist={onBlacklistPublisher}
            onClear={onClearPublisher} />
          <SearchableSelect
            title={strings.browse.series}
            items={seriesItems}
            selected={view.advancedFilter.series}
            onWhitelist={onWhitelistSeries}
            onBlacklist={onBlacklistSeries}
            onClear={onClearSeries} />
          <SearchableSelect
            title={strings.browse.playMode}
            items={playModeItems}
            selected={view.advancedFilter.playMode}
            onWhitelist={onWhitelistPlayMode}
            onBlacklist={onBlacklistPlayMode}
            onClear={onClearPlayMode} />
          <SearchableSelect
            title={strings.browse.platform}
            items={platformItems}
            labelRenderer={platformLabelRenderer}
            selected={view.advancedFilter.platform}
            onWhitelist={onWhitelistPlatform}
            onBlacklist={onBlacklistPlatform}
            onClear={onClearPlatforms} />
          <SearchableSelect
            title={strings.browse.tags}
            items={tagItems}
            labelRenderer={tagLabelRenderer}
            selected={view.advancedFilter.tags}
            onWhitelist={onWhitelistTag}
            onBlacklist={onBlacklistTag}
            onClear={onClearTags} />
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
  selected: Record<string, AdvancedFilterToggle>;
  onWhitelist: (value: string) => void;
  onBlacklist: (value: string) => void;
  onClear: () => void;
  mapName?: (name: string) => string;
  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
}

type SearchableSelectItem = {
  value: string;
  orderVal: string;
}

type TagSelectItem = {
  tag: Tag;
} & SearchableSelectItem;

function SearchableSelect<T extends SearchableSelectItem>(props: SearchableSelectProps<T>) {
  const { title, items, selected, onWhitelist, onBlacklist, onClear, mapName, labelRenderer } = props;
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
      onClick={onToggleExpanded}>
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
            items={items.sort((a, b) => a.orderVal.localeCompare(b.orderVal))}
            onWhitelist={onWhitelist}
            onBlacklist={onBlacklist}
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
  selected: Record<string, AdvancedFilterToggle>;
  labelRenderer?: (item: T, selected: boolean) => JSX.Element;
  mapName?: (id: string) => string;
  onWhitelist: (item: string) => void;
  onBlacklist: (item: string) => void;
}

function SearchableSelectDropdown<T extends SearchableSelectItem>(props: SearchableSelectDropdownProps<T>) {
  const strings = useContext(LangContext);
  const { items, selected, onWhitelist, onBlacklist, mapName, labelRenderer } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [search, setSearch] = React.useState('');
  const [storedItems, setStoredItems] = React.useState(items); // 'cache' the items

  // Split the items into 2 halves - Selected and not selected, then merge

  const filteredItems = React.useMemo(() => {
    const lowerSearch = search.toLowerCase().replace(' ', '');
    const selectedItems = storedItems.filter((item) => item.value in selected && item.orderVal.toLowerCase().includes(lowerSearch));
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
      ...storedItems.filter((item) => !(item.value in selected) && item.orderVal.toLowerCase().includes(lowerSearch)),
    ];
  }, [search, storedItems]);

  // Update the stored items when all selections removed
  // Too difficult to do this any other way
  React.useEffect(() => {
    if (Object.keys(selected).length === 0) {
      setStoredItems(items);
    }
  }, [items]);

  const rowRenderer = (props: ListRowProps) => {
    const { style } = props;
    const item = filteredItems[props.index];

    const marked = item.value in selected;

    if (labelRenderer !== undefined) {
      return (
        <div
          style={style}
          title={item.orderVal ? (mapName ? mapName(item.orderVal) : item.orderVal) : 'None'}
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'}`}
          onClick={() => onWhitelist(item.value)}
          onContextMenu={() => onBlacklist(item.value)}
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
          className={`searchable-select-dropdown-item ${marked && 'searchable-select-dropdown-item--selected'}`}
          onClick={() => onWhitelist(item.value)}
          onContextMenu={() => onBlacklist(item.value)}
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
        event.preventDefault();
        return -1;
      }}
      className="searchable-select-dropdown">
      <input
        ref={inputRef}
        className="searchable-select-dropdown-search-bar"
        value={search}
        placeholder={searchPlaceholder}
        onChange={(event) => setSearch(event.currentTarget.value)} />
      <div className="searchable-select-dropdown-results simple-scroll">
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
