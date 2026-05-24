import { AdvancedFilter } from 'flashpoint-launcher';

export function onWhitelistFactory(extId: string, key: string, filter: AdvancedFilter, setAdvancedFilter: (advFilter: AdvancedFilter) => void): (value: string) => void {
  return (value: string) => {
    const extFilter = filter.ext.toggles[extId] || {};
    const newExtFilter = {
      ...extFilter
    };
    const keyFilter = newExtFilter[key] || {};
    const newValues = {
      ...keyFilter
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

    newExtFilter[key] = newValues;
    const newFilter = {
      ...filter.ext.toggles,
      [extId]: newExtFilter
    };

    setAdvancedFilter({
      ...filter,
      ext: {
        toggles: newFilter,
        bools: { ...filter.ext.bools }
      }
    });
  };
}

export function onBlacklistFactory(extId: string, key: string, filter: AdvancedFilter, setAdvancedFilter: (advFilter: AdvancedFilter) => void): (value: string) => void {
  return (value: string) => {
    const extFilter = filter.ext.toggles[extId] || {};
    const newExtFilter = {
      ...extFilter
    };
    const keyFilter = newExtFilter[key] || {};
    const newValues = {
      ...keyFilter
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

    newExtFilter[key] = newValues;
    const newFilter = {
      ...filter.ext.toggles,
      [extId]: newExtFilter
    };

    setAdvancedFilter({
      ...filter,
      ext: {
        toggles: newFilter,
        bools: { ...filter.ext.bools }
      }
    });
  };
}

export function onClearFactory(extId: string, key: string, filter: AdvancedFilter, setAdvancedFilter: (advFilter: AdvancedFilter) => void): () => void {
  return () => {
    const extFilter = filter.ext.toggles[extId] || {};
    const newExtFilter = {
      ...extFilter,
      [key]: {}
    };

    const newFilter = {
      ...filter.ext.toggles,
      [extId]: newExtFilter
    };

    setAdvancedFilter({
      ...filter,
      ext: {
        toggles: newFilter,
        bools: { ...filter.ext.bools }
      }
    });
  };
}

export function onSetAndToggleFactory(extId: string, key: string, filter: AdvancedFilter, setAdvancedFilter: (advFilter: AdvancedFilter) => void): (value: boolean) => void {
  return (value: boolean) => {
    const extFilter = filter.andToggles.ext[extId] || {};
    const newExtFilter = {
      ...extFilter,
      [key]: value
    };

    const newFilter = {
      ...filter.andToggles.ext,
      [extId]: newExtFilter
    };

    setAdvancedFilter({
      ...filter,
      andToggles: {
        ...filter.andToggles,
        ext: newFilter
      }
    });
  };
}
