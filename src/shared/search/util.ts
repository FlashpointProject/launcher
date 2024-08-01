import { FieldFilter, GameFilter, GameSearch } from '@fparchive/flashpoint-archive';
import { AdvancedFilter } from 'flashpoint-launcher';

export function getDefaultGameSearch(): GameSearch {
  return {
    filter: getDefaultGameFilter(),
    loadRelations: {
      tags: false,
      platforms: false,
      gameData: false,
      addApps: false,
    },
    limit: 999999999,
    slim: false,
    order: {
      column: 0,
      direction: 0,
    },
  };
}

export function getDefaultAdvancedFilter(library?: string): AdvancedFilter {
  return {
    playlistOrder: true,
    library: library ? [library] : [],
    playMode: [],
    platform: [],
    tags: [],
  };
}

export function getDefaultGameFilter(): GameFilter {
  return {
    blacklist: {},
    equalTo: {},
    exactBlacklist: {},
    exactWhitelist: {},
    higherThan: {},
    lowerThan: {},
    matchAny: false,
    subfilters: [],
    whitelist: {},
    boolComp: {},
  };
}

export function isAdvFilterEmpty(advFilter: AdvancedFilter): boolean {
  return (
    advFilter.installed === undefined &&
    advFilter.library.length === 0 &&
    advFilter.playMode.length === 0 &&
    advFilter.platform.length === 0 &&
    advFilter.tags.length === 0
  );
}

export function parseAdvancedFilter(advFilter: AdvancedFilter): GameFilter {
  const filter = getDefaultGameFilter();

  if (advFilter.installed !== undefined) {
    filter.boolComp.installed = advFilter.installed;
  }

  const exactFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const val = advFilter[key] as string[];
    if (val.length > 0) {
      const newFilter = getDefaultGameFilter();
      newFilter.matchAny = true;
      newFilter.exactWhitelist[fieldKey] = val;
      filter.subfilters.push(newFilter);
    }
  };

  const nonExactFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const val = advFilter[key] as string[];
    if (val.length > 0) {
      if (val.length === 1 && val[0] === '') {
        const newFilter = getDefaultGameFilter();
        newFilter.matchAny = true;
        newFilter.exactWhitelist[fieldKey] = [''];
        filter.subfilters.push(newFilter);
      } else {
        const newFilter = getDefaultGameFilter();
        newFilter.matchAny = true;
        newFilter.whitelist[fieldKey] = val;
        filter.subfilters.push(newFilter);
      }
    }
  };

  exactFunc('library', 'library');
  exactFunc('platform', 'platforms');
  nonExactFunc('playMode', 'playMode');
  exactFunc('tags', 'tags');

  return filter;
}

