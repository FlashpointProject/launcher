import { SearchableSelectItem, SearchComponentProps } from 'flashpoint-launcher-renderer';

function mapNgRatingString(s: string) {
  switch (s) {
    case 'e':
      return 'Everyone';
    case 't':
      return 'Teen';
    case 'm':
      return 'Mature';
    case 'a':
      return 'Adult';
    case 'u':
      return 'Unknown';
    default:
      return s;
  }
}

const genSelectItem = (missing: string): SearchableSelectItem => {
  return {
    value: missing,
    orderVal: `zzzzzzz${missing}`,
  };
};

export default function NgRatingSearchableSelect(props: SearchComponentProps) {
  const { SearchableSelect } = window.ext.components;
  const { onBlacklistFactory, onWhitelistFactory, onClearFactory, onSetAndToggleFactory } = window.ext.utils.search;
  const { advancedFilter, setAdvancedFilter } = props;
  const extFilter = advancedFilter.ext.toggles['nga'];
  const extAndToggles = advancedFilter.andToggles.ext['nga'];

  const labelRenderer = (item: SearchableSelectItem) => {
    const label = mapNgRatingString(item.value);
    return (
      <div className='platform-label-row'>
        <div
          className={`dropdown-icon dropdown-icon-image ng-image-rating_${item.value}`}>
        </div>
        <div className="searchable-select-dropdown-item-title">
          {label}
        </div>
      </div>
    );
  };

  const ratingItems: SearchableSelectItem[] = [
    {
      value: 'e',
      orderVal: '1'
    }, {
      value: 't',
      orderVal: '2'
    }, {
      value: 'm',
      orderVal: '3'
    }, {
      value: 'a',
      orderVal: '4'
    }, {
      value: 'u',
      orderVal: '5'
    }
  ];

  const onWhitelist = onWhitelistFactory('nga', 'rating', advancedFilter, setAdvancedFilter);
  const onBlacklist = onBlacklistFactory('nga', 'rating', advancedFilter, setAdvancedFilter);
  const onClear = onClearFactory('nga', 'rating', advancedFilter, setAdvancedFilter);
  const onSetAndToggle = onSetAndToggleFactory('nga', 'rating', advancedFilter, setAdvancedFilter);

  const andToggle = !!(extAndToggles?.rating);
  const selected = extFilter?.rating || {};

  return (
    <SearchableSelect
      title={'NG Rating'}
      items={ratingItems}
      andToggle={andToggle}
      selected={selected}
      labelRenderer={labelRenderer}
      generateItem={genSelectItem}
      onWhitelist={onWhitelist}
      onBlacklist={onBlacklist}
      onClear={onClear}
      onSetAndToggle={onSetAndToggle}
      mapName={(item) => {
        switch (item) {
          case 'e': return 'Everyone';
          case 't': return 'Teen';
          case 'm': return 'Mature';
          case 'a': return 'Adult';
          case 'u': return 'Unknown';
          default: return '';
        }
      }}/>
  );
}
