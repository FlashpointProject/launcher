import { GameFilter, GameSearch } from '@fparchive/flashpoint-archive';
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

export function getDefaultAdvancedFilter(): AdvancedFilter {
  return {
    playlistOrder: true,
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

export function parseAdvancedFilter(advFilter: AdvancedFilter): GameFilter {
  const filter = getDefaultGameFilter();

  if (advFilter.installed !== undefined) {
    filter.boolComp.installed = advFilter.installed;
  }

  return filter;
}

