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

export function getDefaultAdvancedFilter(library?: string): AdvancedFilter {
  return {
    playlistOrder: true,
    libraries: library ? [library] : [],
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
    advFilter.libraries.length === 0
  );
}

export function parseAdvancedFilter(advFilter: AdvancedFilter): GameFilter {
  const filter = getDefaultGameFilter();

  if (advFilter.installed !== undefined) {
    filter.boolComp.installed = advFilter.installed;
  }

  if (advFilter.libraries.length > 0) {
    console.log(`setting libraries - ${advFilter.libraries.join(' ; ')}`);
    const newFilter = getDefaultGameFilter();
    newFilter.matchAny = true;
    newFilter.exactWhitelist.library = advFilter.libraries;
    filter.subfilters.push(newFilter);
  }

  return filter;
}

