import { GameFilter } from '@fparchive/flashpoint-archive';
import { AdvancedFilter } from '@renderer/store/search/slice';

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

