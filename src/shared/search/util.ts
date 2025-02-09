import { FieldFilter, GameFilter, GameSearch } from '@fparchive/flashpoint-archive';
import { AdvancedFilter, AdvancedFilterToggle } from 'flashpoint-launcher';

function getWhitelistedKeys(record: Record<string, AdvancedFilterToggle>): string[] {
  return Object.entries(record)
    .filter(e => e[1] === 'whitelist')
    .map(e => e[0]);
}

function getBlacklistedKeys(record: Record<string, AdvancedFilterToggle>): string[] {
  return Object.entries(record)
    .filter(e => e[1] === 'blacklist')
    .map(e => e[0]);
}

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
    library: library ? {[library]: 'whitelist'} : {},
    playMode: {},
    platform: {},
    tags: {},
    developer: {},
    publisher: {},
    series: {},
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
    advFilter.legacy === undefined &&
    Object.keys(advFilter.library).length === 0 &&
    Object.keys(advFilter.playMode).length === 0 &&
    Object.keys(advFilter.platform).length === 0 &&
    Object.keys(advFilter.tags).length === 0 &&
    Object.keys(advFilter.developer).length === 0 &&
    Object.keys(advFilter.publisher).length === 0 &&
    Object.keys(advFilter.series).length === 0
  );
}

export function parseAdvancedFilter(advFilter: AdvancedFilter): GameFilter {
  const filter = getDefaultGameFilter();

  if (advFilter.installed !== undefined) {
    filter.boolComp.installed = advFilter.installed;
  }

  if (advFilter.legacy !== undefined) {
    if (advFilter.legacy) {
      filter.equalTo.gameData = 0;
    } else {
      filter.higherThan.gameData = 0;
    }
  }

  const exactWhitelistFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const record = advFilter[key] as Record<string, AdvancedFilterToggle>;
    const val = getWhitelistedKeys(record);
    if (val.length > 0) {
      const newFilter = getDefaultGameFilter();
      newFilter.matchAny = true;
      newFilter.exactWhitelist[fieldKey] = val;
      filter.subfilters.push(newFilter);
    }
  };

  const nonExactWhitelistFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const record = advFilter[key] as Record<string, AdvancedFilterToggle>;
    const val = getWhitelistedKeys(record);
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

  const exactBlacklistFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const record = advFilter[key] as Record<string, AdvancedFilterToggle>;
    const val = getBlacklistedKeys(record);
    if (val.length > 0) {
      const newFilter = getDefaultGameFilter();
      newFilter.matchAny = true;
      newFilter.exactBlacklist[fieldKey] = val;
      filter.subfilters.push(newFilter);
    }
  };

  const nonExactBlacklistFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const record = advFilter[key] as Record<string, AdvancedFilterToggle>;
    const val = getBlacklistedKeys(record);
    if (val.length > 0) {
      if (val.length === 1 && val[0] === '') {
        const newFilter = getDefaultGameFilter();
        newFilter.matchAny = true;
        newFilter.exactBlacklist[fieldKey] = [''];
        filter.subfilters.push(newFilter);
      } else {
        const newFilter = getDefaultGameFilter();
        newFilter.matchAny = true;
        newFilter.blacklist[fieldKey] = val;
        filter.subfilters.push(newFilter);
      }
    }
  };

  exactWhitelistFunc('library', 'library');
  exactWhitelistFunc('platform', 'platforms');
  nonExactWhitelistFunc('playMode', 'playMode');
  nonExactWhitelistFunc('developer', 'developer');
  nonExactWhitelistFunc('publisher', 'publisher');
  exactWhitelistFunc('series', 'series');
  exactWhitelistFunc('tags', 'tags');

  exactBlacklistFunc('library', 'library');
  exactBlacklistFunc('platform', 'platforms');
  nonExactBlacklistFunc('playMode', 'playMode');
  nonExactBlacklistFunc('developer', 'developer');
  nonExactBlacklistFunc('publisher', 'publisher');
  exactBlacklistFunc('series', 'series');
  exactBlacklistFunc('tags', 'tags');

  return filter;
}

