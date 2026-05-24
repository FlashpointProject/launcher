import { FieldFilter, GameFilter, GameSearch } from '@fparchive/flashpoint-archive';
import { AdvancedFilter, AdvancedFilterAndToggles, AdvancedFilterToggle } from 'flashpoint-launcher';

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
      extData: true,
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
    library: library ? { [library]: 'whitelist' } : {},
    playMode: {},
    platform: {},
    tags: {},
    developer: {},
    publisher: {},
    series: {},
    ruffleSupport: {},
    ext: {
      bools: {},
      toggles: {},
    },
    andToggles: {
      library: false,
      playMode: false,
      platform: false,
      tags: false,
      developer: false,
      publisher: false,
      series: false,
      ruffleSupport: false,
      ext: {},
    }
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
    Object.keys(advFilter.series).length === 0 &&
    Object.keys(advFilter.ruffleSupport).length === 0
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
    const andToggle = advFilter.andToggles[key as keyof AdvancedFilterAndToggles];
    const val = getWhitelistedKeys(record);
    if (val.length > 0) {
      const newFilter = getDefaultGameFilter();
      if (!andToggle) {
        newFilter.matchAny = true;
      }
      newFilter.exactWhitelist[fieldKey] = val as any;
      filter.subfilters.push(newFilter);
    }
  };

  const nonExactWhitelistFunc = (key: keyof AdvancedFilter, fieldKey: keyof FieldFilter) => {
    const record = advFilter[key] as Record<string, AdvancedFilterToggle>;
    const andToggle = advFilter.andToggles[key as keyof AdvancedFilterAndToggles];
    const val = getWhitelistedKeys(record);
    if (val.length > 0) {
      if (val.length === 1 && val[0] === '') {
        const newFilter = getDefaultGameFilter();
        if (!andToggle) {
          newFilter.matchAny = true;
        }
        newFilter.exactWhitelist[fieldKey] = [''] as any;
        filter.subfilters.push(newFilter);
      } else {
        const newFilter = getDefaultGameFilter();
        if (!andToggle) {
          newFilter.matchAny = true;
        }
        newFilter.whitelist[fieldKey] = val as any;
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
      newFilter.exactBlacklist[fieldKey] = val as any;
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
        newFilter.exactBlacklist[fieldKey] = [''] as any;
        filter.subfilters.push(newFilter);
      } else {
        const newFilter = getDefaultGameFilter();
        newFilter.matchAny = true;
        newFilter.blacklist[fieldKey] = val as any;
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
  exactWhitelistFunc('ruffleSupport', 'ruffleSupport');

  exactBlacklistFunc('library', 'library');
  exactBlacklistFunc('platform', 'platforms');
  nonExactBlacklistFunc('playMode', 'playMode');
  nonExactBlacklistFunc('developer', 'developer');
  nonExactBlacklistFunc('publisher', 'publisher');
  exactBlacklistFunc('series', 'series');
  exactBlacklistFunc('tags', 'tags');
  exactBlacklistFunc('ruffleSupport', 'ruffleSupport');

  // Add ext adv filters
  for (const extId of Object.keys(advFilter.ext.toggles)) {
    const extAndToggles = advFilter.andToggles.ext[extId] || {};
    const extFilter = advFilter.ext.toggles[extId]!;
    for (const key of Object.keys(extFilter)) {
      const andToggle = !!extAndToggles[key];

      const whitelistVals = getWhitelistedKeys(extFilter[key]);
      if (whitelistVals.length > 0) {
        if (whitelistVals.length === 1 && whitelistVals[0] === '') {
          const newFilter = getDefaultGameFilter();
          if (!andToggle) {
            newFilter.matchAny = true;
          }
          newFilter.exactWhitelist.ext = {
            [extId]: {
              [key]: ['']
            }
          };
          filter.subfilters.push(newFilter);
        } else {
          const newFilter = getDefaultGameFilter();
          if (!andToggle) {
            newFilter.matchAny = true;
          }
          newFilter.whitelist.ext = {
            [extId]: {
              [key]: whitelistVals
            }
          };
          filter.subfilters.push(newFilter);
        }
      }

      const blacklistedVals = getBlacklistedKeys(extFilter[key]);
      if (blacklistedVals.length > 0) {
        if (blacklistedVals.length === 1 && blacklistedVals[0] === '') {
          const newFilter = getDefaultGameFilter();
          newFilter.matchAny = true;
          newFilter.exactWhitelist.ext = {
            [extId]: {
              [key]: ['']
            }
          };
          filter.subfilters.push(newFilter);
        } else {
          const newFilter = getDefaultGameFilter();
          newFilter.matchAny = true;
          newFilter.blacklist.ext = {
            [extId]: {
              [key]: blacklistedVals
            }
          };
          filter.subfilters.push(newFilter);
        }
      }
    }
  }

  return filter;
}

